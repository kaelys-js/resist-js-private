#!/usr/bin/env bash
# PostToolUse hook for Edit|Write:
#   1. Auto-format (qa:format)
#   2. Auto-fix lint (resist-lint --fix <file>)
#   3. Re-run lint (resist-lint --tools <file>)
#   4. Compare against baseline; block on NEW findings only
#
# Emits JSON {"decision":"block","reason":...} when new findings exist.

set -uo pipefail

# Bypass for emergencies
if [[ "${CLAUDE_HOOK_BYPASS:-}" == "1" ]]; then
  exit 0
fi

eval "$(/opt/homebrew/bin/mise activate bash --shims)" 2>/dev/null || true

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Skip non-source files
case "$FILE_PATH" in
  *.snap|*.png|*.jpg|*.gif|*.svg|*.ico|*.woff|*.woff2|*.ttf|*.lock)
    exit 0
    ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"
BASELINE="$PROJECT_DIR/.claude/lint-baseline.json"

# ── Phase 1: Format (direct binary call — pnpm exec adds 500ms per invocation) ─
case "$FILE_PATH" in
  *.svelte)
    (cd "$PROJECT_DIR" && ./node_modules/.bin/prettier --write "$FILE_PATH") >/dev/null 2>&1 || true
    ;;
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mts|*.cts|*.json|*.jsonc|*.css|*.html|*.graphql|*.md|*.mdx)
    (cd "$PROJECT_DIR" && ./node_modules/.bin/biome format --write "$FILE_PATH") >/dev/null 2>&1 || true
    ;;
esac

# ── Phase 2: Auto-fix ───────────────────────────────────────────────────────
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mts|*.cts|*.svelte)
    # Snapshot file hash before autofix to detect if it changed anything
    _PRE_FIX_HASH=$(shasum -a 256 "$FILE_PATH" 2>/dev/null | cut -c1-16)
    (cd "$PROJECT_DIR" && ./node_modules/.bin/resist-lint --fix "$FILE_PATH") >/dev/null 2>&1 || true
    _POST_FIX_HASH=$(shasum -a 256 "$FILE_PATH" 2>/dev/null | cut -c1-16)
    if [[ "$_PRE_FIX_HASH" != "$_POST_FIX_HASH" ]]; then
      echo "post-edit-format-lint: autofix modified $FILE_PATH (hash changed)" >&2
    fi
    ;;
esac

# ── Phase 2.5: Spawn background Haiku polisher for residual diagnostics ────
# Conditions to spawn:
#   - File is a source file we lint
#   - File has 1-15 diagnostics in itself only (no cross-file cascades)
#   - File is ≤ 800 lines (cost / risk cap)
# When spawned, the worker runs in the background; this hook returns success
# immediately so the user's Edit doesn't block. Pre-commit waits for any
# in-flight workers before running the final lint check.
# Sets _HAIKU_SPAWNED=1 so Phase 3 suppresses its BLOCK (worker is going to
# fix it; pre-commit will catch anything that doesn't get fixed).
_HAIKU_SPAWNED=0
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mts|*.cts|*.svelte)
    if [[ "${CLAUDE_NO_HAIKU:-}" != "1" ]]; then
      _Q_RAW=$(cd "$PROJECT_DIR" && ./node_modules/.bin/resist-lint --tools --json "$FILE_PATH" 2>/dev/null || echo '[]')
      # Slurp multiple JSON arrays (one per tool) into a single flat array.
      _Q_DIAG_JSON=$(echo "$_Q_RAW" | jq -s 'add // []' 2>/dev/null || echo '[]')
      _Q_DIAG_COUNT=$(echo "$_Q_DIAG_JSON" | jq 'length' 2>/dev/null || echo 0)
      [[ "$_Q_DIAG_COUNT" =~ ^[0-9]+$ ]] || _Q_DIAG_COUNT=0
      _Q_EXTERNAL=$(echo "$_Q_DIAG_JSON" | jq --arg f "$FILE_PATH" '[.[] | select(.file != $f)] | length' 2>/dev/null || echo 0)
      [[ "$_Q_EXTERNAL" =~ ^[0-9]+$ ]] || _Q_EXTERNAL=0
      _Q_LINES=$(wc -l <"$FILE_PATH" 2>/dev/null | tr -d ' ')
      [[ "$_Q_LINES" =~ ^[0-9]+$ ]] || _Q_LINES=9999
      if [[ "$_Q_DIAG_COUNT" -gt 0 ]] \
         && [[ "$_Q_DIAG_COUNT" -le 15 ]] \
         && [[ "$_Q_EXTERNAL" -eq 0 ]] \
         && [[ "$_Q_LINES" -le 800 ]]; then
        _Q_MTIME=$(stat -f '%m' "$FILE_PATH" 2>/dev/null || stat -c '%Y' "$FILE_PATH" 2>/dev/null || echo 0)
        nohup bash "$PROJECT_DIR/.claude/hooks/lib/haiku-fix-worker.sh" \
          "$FILE_PATH" "$_Q_MTIME" </dev/null >/dev/null 2>&1 &
        disown 2>/dev/null || true
        _HAIKU_SPAWNED=1
      fi
    fi
    ;;
esac

# ── Phase 3: Re-lint, compare to baseline, auto-shrink on approve ───────────
# Captures stderr separately. If resist-lint itself crashes, BLOCK rather than
# silently approving — a crashed linter is not "no findings."
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mts|*.cts|*.svelte)
    LINT_STDERR_FILE=$(mktemp)
    LINT_JSON=$(cd "$PROJECT_DIR" && ./node_modules/.bin/resist-lint --tools --json "$FILE_PATH" 2>"$LINT_STDERR_FILE")
    LINT_EXIT=$?
    LINT_STDERR=$(cat "$LINT_STDERR_FILE")
    rm -f "$LINT_STDERR_FILE"

    # resist-lint exits non-zero when there are diagnostics (normal). It only
    # indicates a crash when stderr contains real noise and stdout is empty/invalid.
    if [[ -z "$LINT_JSON" ]] && [[ -n "$LINT_STDERR" ]]; then
      REASON="resist-lint crashed during post-edit re-lint of $FILE_PATH:
$LINT_STDERR"
      jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
      exit 0
    fi

    # Baseline is a count-map {"file|ruleId|message": count}.
    # NEW = any key where current_count > baseline_count (across ALL files —
    # cross-file cascades from this edit count too).
    # If no NEW, auto-shrink: for keys owned by edited file only,
    #                         baseline[k] = min(baseline[k], current_count).
    # Helper lives in .claude/hooks/lib/baseline-compare.mjs (also directly testable).
    HOOK_RESULT=$(BASELINE_PATH="$BASELINE" EDITED_FILE="$FILE_PATH" \
      node "$PROJECT_DIR/.claude/hooks/lib/baseline-compare.mjs" "$LINT_JSON" 2>&1)

    if [[ "$HOOK_RESULT" == BLOCK* ]] && [[ "$_HAIKU_SPAWNED" -ne 1 ]]; then
      BLOCK_MSG=$(echo "$HOOK_RESULT" | tail -n +2 | head -10)
      REASON="New lint after editing $FILE_PATH (includes cross-file cascades):
$BLOCK_MSG"
      jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
      exit 0
    fi
    ;;
esac

# ── Plan file lint ──────────────────────────────────────────────────────────
case "$FILE_PATH" in
  */docs/plans/*.md)
    PLAN_ERRORS=""
    CONTENT=$(cat "$FILE_PATH")
    echo "$CONTENT" | grep -q "Status Legend"            || PLAN_ERRORS="${PLAN_ERRORS}Missing: Status Legend\n"
    echo "$CONTENT" | grep -q "Baseline"                 || PLAN_ERRORS="${PLAN_ERRORS}Missing: Baseline\n"
    echo "$CONTENT" | grep -qi "Register.*Config"        || PLAN_ERRORS="${PLAN_ERRORS}Missing: Register Rules + Config task\n"
    echo "$CONTENT" | grep -q "Integration Verification" || PLAN_ERRORS="${PLAN_ERRORS}Missing: Integration Verification task\n"
    echo "$CONTENT" | grep -qE "Full QA|QA.*Coverage"    || PLAN_ERRORS="${PLAN_ERRORS}Missing: Full QA + Coverage task\n"
    echo "$CONTENT" | grep -qE "Final Verification.*Commit" || PLAN_ERRORS="${PLAN_ERRORS}Missing: Final Verification + Commit task\n"
    echo "$CONTENT" | grep -q "Execution Order"          || PLAN_ERRORS="${PLAN_ERRORS}Missing: Execution Order\n"

    if [[ -n "$PLAN_ERRORS" ]]; then
      REASON="Plan file missing required sections in $FILE_PATH:
$PLAN_ERRORS"
      jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
      exit 0
    fi
    ;;
esac

exit 0
