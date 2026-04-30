#!/usr/bin/env bash
# PostToolUse hook for Edit/Write: runs the package's tests after edits to
# ts/svelte/js source files inside packages/, and injects a system-reminder
# if the test pass-count drops below the last-known baseline.
#
# Only fires when an active plan is in progress (.claude/active-plan.json
# exists) — to avoid 60s test-run cost on every edit.
#
# Baseline is stored in .claude/last-test-baseline.json keyed by package name.
# Updated upward whenever new edits result in higher pass counts.

set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ACTIVE_PLAN="$REPO_ROOT/.claude/active-plan.json"
BASELINE_FILE="$REPO_ROOT/.claude/last-test-baseline.json"

# Only run when a plan is active — otherwise the post-edit cost is too high.
if [[ ! -f "$ACTIVE_PLAN" ]]; then
  exit 0
fi

# Only fire on source files in packages/
case "$FILE" in
  *.ts|*.tsx|*.svelte|*.js|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac
case "$FILE" in
  */packages/*) ;;
  *) exit 0 ;;
esac

# Find the nearest package.json by walking up from the edited file
PKG_DIR=""
DIR=$(dirname "$FILE")
while [[ "$DIR" != "/" ]] && [[ "$DIR" != "$REPO_ROOT" ]]; do
  if [[ -f "$DIR/package.json" ]]; then
    PKG_DIR="$DIR"
    break
  fi
  DIR=$(dirname "$DIR")
done

if [[ -z "$PKG_DIR" ]]; then
  exit 0
fi

# Read the package name
PKG_NAME=$(jq -r '.name // empty' "$PKG_DIR/package.json" 2>/dev/null)
if [[ -z "$PKG_NAME" ]]; then
  exit 0
fi

# Skip packages without a qa:test script
HAS_QA_TEST=$(jq -r '.scripts["qa:test"] // empty' "$PKG_DIR/package.json" 2>/dev/null)
if [[ -z "$HAS_QA_TEST" ]]; then
  exit 0
fi

# Debounce: skip if this package was tested less than 30s ago.
# Prevents running tests 126 times during a multi-file edit grind.
DEBOUNCE_DIR="$REPO_ROOT/.claude"
DEBOUNCE_FILE="$DEBOUNCE_DIR/.test-debounce-$(echo "$PKG_NAME" | tr '/@' '__')"
if [[ -f "$DEBOUNCE_FILE" ]]; then
  LAST_RUN=$(cat "$DEBOUNCE_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  ELAPSED=$(( NOW - LAST_RUN ))
  if [[ "$ELAPSED" -lt 30 ]]; then
    exit 0
  fi
fi
date +%s > "$DEBOUNCE_FILE" 2>/dev/null || true

# Run tests with a 60s wall-clock budget. We use --reporter=basic for speed.
# Capture the "Tests  N passed" line.
TEST_OUT=$(timeout 60 bash -c "cd '$REPO_ROOT' && pnpm --filter '$PKG_NAME' run qa:test 2>&1 | grep -E 'Tests +[0-9]+ passed' | tail -1" 2>/dev/null || true)
CURRENT=$(echo "$TEST_OUT" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | head -1)

# If we can't determine current count, fail-safe (allow)
if [[ -z "$CURRENT" ]]; then
  exit 0
fi

# Read baseline for this package
BASELINE=$(jq -r --arg pkg "$PKG_NAME" '.[$pkg] // 0' "$BASELINE_FILE" 2>/dev/null || echo 0)

# Update baseline upward if current is higher
if [[ "$CURRENT" -gt "$BASELINE" ]]; then
  if [[ -f "$BASELINE_FILE" ]]; then
    NEW_BASELINE=$(jq --arg pkg "$PKG_NAME" --argjson c "$CURRENT" '.[$pkg] = $c' "$BASELINE_FILE")
  else
    NEW_BASELINE=$(jq -n --arg pkg "$PKG_NAME" --argjson c "$CURRENT" '{($pkg): $c}')
  fi
  echo "$NEW_BASELINE" > "$BASELINE_FILE"
  exit 0
fi

# Regression: current count is below baseline
if [[ "$CURRENT" -lt "$BASELINE" ]]; then
  echo "⚠ TEST REGRESSION: $PKG_NAME dropped from $BASELINE to $CURRENT passing (-$((BASELINE - CURRENT))). Fix before continuing." >&2
  # Exit 2 = block (PostToolUse blocks emit a system-reminder back to Claude
  # without rolling back the edit — the edit already happened).
  exit 2
fi

exit 0
