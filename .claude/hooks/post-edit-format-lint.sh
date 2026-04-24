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

# ── Phase 1: Format ─────────────────────────────────────────────────────────
case "$FILE_PATH" in
  *.svelte|*.ts|*.tsx|*.js|*.jsx|*.json|*.jsonc|*.css|*.html|*.graphql|*.md|*.mdx)
    (cd "$PROJECT_DIR" && pnpm -w run qa:format) >/dev/null 2>&1 || true
    ;;
esac

# ── Phase 2: Auto-fix ───────────────────────────────────────────────────────
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.svelte)
    (cd "$PROJECT_DIR" && pnpm exec resist-lint --fix "$FILE_PATH") >/dev/null 2>&1 || true
    ;;
esac

# ── Phase 3: Re-lint and compare to baseline ────────────────────────────────
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.svelte)
    LINT_JSON=$(cd "$PROJECT_DIR" && pnpm exec resist-lint --tools --json "$FILE_PATH" 2>/dev/null) || true

    # Compute NEW findings = current ∖ baseline (keyed on file+ruleId+line+message)
    NEW_FINDINGS=$(BASELINE_PATH="$BASELINE" node -e "
      const fs = require('node:fs');
      let current, baseline;
      try {
        const parsed = JSON.parse(process.argv[1] || '[]');
        current = parsed.results ?? parsed;
        if (!Array.isArray(current)) current = [];
      } catch { current = []; }
      try { baseline = JSON.parse(fs.readFileSync(process.env.BASELINE_PATH, 'utf8')); }
      catch { baseline = []; }
      const key = (r) => r.file + '|' + r.ruleId + '|' + r.line + '|' + r.message;
      const baselineKeys = new Set(baseline.map(key));
      const fresh = current.filter((r) => !baselineKeys.has(key(r)));
      if (fresh.length === 0) { process.exit(0); }
      const msg = fresh.slice(0, 20).map((r) =>
        r.file + ':' + r.line + ':' + r.column + ' ' + r.severity + ' ' + r.ruleId + ' — ' + r.message
      ).join('\n');
      console.log(msg);
      process.exit(1);
    " "$LINT_JSON" 2>&1) || {
      REASON="New lint findings in $FILE_PATH (not in baseline):

$NEW_FINDINGS

Fix these before continuing. Auto-fix already ran — remaining findings require manual changes.
Regenerate baseline only after intentional cleanup: .claude/scripts/lint-baseline.sh"
      jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
      exit 0
    }
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
