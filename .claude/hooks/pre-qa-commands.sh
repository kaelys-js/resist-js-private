#!/usr/bin/env bash
# Pre-QA commands hook — enforce correct QA command patterns.
# All QA must run from workspace root via pnpm scripts, never npx or cd.
# Also prevents running qa:lint repeatedly when output is already captured.

set -uo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$CMD" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Block: npx vitest (should use pnpm -w run qa:test:unit or pnpm -r --filter)
if echo "$CMD" | grep -qE "^npx vitest"; then
  echo '{"decision":"deny","message":"Do not use npx vitest. Use: pnpm -w run qa:test:unit (all projects) or pnpm -r --filter <pkg> run qa:test (single package)"}' >&2
  exit 2
fi

# Block: cd <subdir> && pnpm qa:* or cd <subdir> && vitest or cd <subdir> && tsgo
if echo "$CMD" | grep -qE "^cd [^;]+&&.*qa:|^cd [^;]+;.*qa:|^cd [^;]+&&.*vitest|^cd [^;]+;.*vitest|^cd [^;]+&&.*tsgo|^cd [^;]+;.*tsgo"; then
  echo '{"decision":"deny","message":"Do not cd into subdirectories for QA commands. Use from workspace root: pnpm -r --filter <pkg> run qa:<cmd>"}' >&2
  exit 2
fi

# Block: piping qa:lint output through grep/head/tail/awk/sed/wc.
# The custom linter accepts path/--package args for scoped runs — use those
# instead of post-filtering with grep loops. Allow | cat and | tee for log capture.
if echo "$CMD" | grep -qE "qa:lint([^|]*)\|[[:space:]]*(grep|head|tail|awk|sed|wc)\b"; then
  echo '{"decision":"deny","message":"Do not pipe qa:lint through grep/head/tail/awk/sed/wc. Use the scoped form instead: pnpm -w run qa:lint <path-or-package>. Workspace-level rules are auto-skipped when a path is passed."}' >&2
  exit 2
fi

# ── Repeated qa:lint prevention ────────────────────────────────────────────
# Track when qa:lint was last run. If it was run < 120s ago AND the output
# file exists, block the re-run and tell Claude to use the existing output.
# Does NOT block the final verification run (when --fix is NOT present and
# the user explicitly asks for a fresh run via .claude/approved-relint).
LINT_TRACKER="$REPO_ROOT/.claude/.last-lint-run"

if echo "$CMD" | grep -qE 'qa:lint|lint/src/cli\.ts|resist-lint'; then
  # Autonomous mode (Multica-spawned task): bypass the repeated-lint guard.
  # The agent re-running lint to verify progress is normal in unattended runs.
  # The other gates in this hook (npx vitest, cd-subdir, pipe-grep) remain
  # strict regardless because they enforce workflow correctness, not ergonomics.
  if [[ "${MULTICA_AUTONOMOUS:-}" = "1" ]]; then
    date +%s > "$LINT_TRACKER" 2>/dev/null || true
    exit 0
  fi

  # Allow if user has approved a re-run
  RELINT_MARKER="$REPO_ROOT/.claude/approved-relint"
  if [[ -f "$RELINT_MARKER" ]]; then
    rm -f "$RELINT_MARKER"
    # Force fresh results — delete lint cache so stale data can't leak through
    rm -f "$REPO_ROOT/.resist-lint-cache.json"
    # Update tracker
    date +%s > "$LINT_TRACKER" 2>/dev/null || true
    exit 0
  fi

  # Check if qa:lint was already run recently
  if [[ -f "$LINT_TRACKER" ]]; then
    LAST_RUN=$(cat "$LINT_TRACKER" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    ELAPSED=$(( NOW - LAST_RUN ))
    if [[ "$ELAPSED" -lt 120 ]]; then
      echo "⛔ qa:lint already ran <2min ago. Do NOT investigate previous output — it may be stale. Override: user runs touch .claude/approved-relint" >&2
      exit 2
    fi
  fi

  # First run or stale tracker — allow and update
  date +%s > "$LINT_TRACKER" 2>/dev/null || true
fi

exit 0
