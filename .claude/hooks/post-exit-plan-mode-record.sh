#!/usr/bin/env bash
# PostToolUse hook for ExitPlanMode: extracts the success criterion from the
# approved plan and writes .claude/active-plan.json so stop-active-plan-block.sh
# can enforce completion.
#
# The plan file's "Final QA + Coverage" or "Final Verification + Commit" task
# must contain a `pnpm -w run qa:lint ...` line and an "exit 0" / "outputs 0"
# verification clause. The hook parses these.
#
# If parseable: writes the marker.
# If not parseable: prints a warning to stderr but does NOT block (allow:
# the user can still proceed, but no Stop-hook enforcement).

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MARKER="$REPO_ROOT/.claude/active-plan.json"
PLANS_STAGING="$HOME/.claude/plans"

# Find the most recently-modified plan file in the staging dir
PLAN_FILE=""
if [[ -d "$PLANS_STAGING" ]]; then
  PLAN_FILE=$(find "$PLANS_STAGING" -maxdepth 1 -name '*.md' -type f -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
fi

if [[ -z "$PLAN_FILE" ]] || [[ ! -f "$PLAN_FILE" ]]; then
  echo "post-exit-plan-mode-record.sh: no staging plan file found, skipping marker" >&2
  exit 0
fi

# Extract the title from the first H1 line
LABEL=$(grep -m1 '^# ' "$PLAN_FILE" | sed 's/^# //')

# Extract the FIRST `pnpm -w run qa:lint ...` line from the plan as the
# success_check. Strip leading backtick markup if present.
SUCCESS_CMD=$(grep -oE 'pnpm -w run qa:lint[^`\n"]*' "$PLAN_FILE" | head -1)

if [[ -z "$SUCCESS_CMD" ]]; then
  echo "post-exit-plan-mode-record.sh: no \`pnpm -w run qa:lint ...\` command found in $PLAN_FILE — no marker written" >&2
  exit 0
fi

# Wrap the command to count `^  ✗ ` lines and compare to 0
SUCCESS_CHECK="$SUCCESS_CMD 2>&1 | grep -cE '^  [✗⚠] ' || true"

# Try to find a real .md filepath in docs/plans/ that matches the staging plan's title
PLAN_PATH=""
DOCS_PLANS_DIR="$REPO_ROOT/docs/plans"
if [[ -d "$DOCS_PLANS_DIR" ]] && [[ -n "$LABEL" ]]; then
  # Try to find a plan file whose first line matches the staging file's first line
  for f in "$DOCS_PLANS_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    if [[ "$(head -1 "$f")" == "# $LABEL" ]]; then
      PLAN_PATH="${f#$REPO_ROOT/}"
      break
    fi
  done
fi

# Build the JSON marker
APPROVED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

jq -n \
  --arg plan_path "${PLAN_PATH:-$PLAN_FILE}" \
  --arg approved_at "$APPROVED_AT" \
  --arg success_check "$SUCCESS_CHECK" \
  --arg expected "0" \
  --arg label "${LABEL:-unknown}" \
  '{plan_path: $plan_path, approved_at: $approved_at, success_check: $success_check, expected: $expected, label: $label}' \
  > "$MARKER"

echo "post-exit-plan-mode-record.sh: marker written to .claude/active-plan.json (success_check: $SUCCESS_CHECK)" >&2
exit 0
