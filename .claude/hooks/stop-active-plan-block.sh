#!/usr/bin/env bash
# Stop hook: blocks turn-end while an approved plan's success criterion is unmet.
#
# Reads .claude/active-plan.json (created by post-exit-plan-mode-record.sh).
# If present, runs the embedded `success_check` shell command and compares
# the trimmed stdout against `expected`. If mismatched → block. If matched →
# delete the marker (plan complete) and allow stop.
#
# To abandon a plan explicitly: bash .claude/hooks/abandon-plan.sh

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MARKER="$REPO_ROOT/.claude/active-plan.json"

# No active plan — allow stop
if [[ ! -f "$MARKER" ]]; then
  exit 0
fi

# Parse the marker
SUCCESS_CHECK=$(jq -r '.success_check // empty' "$MARKER" 2>/dev/null)
EXPECTED=$(jq -r '.expected // empty' "$MARKER" 2>/dev/null)
LABEL=$(jq -r '.label // .plan_path // "unknown"' "$MARKER" 2>/dev/null)
PLAN_PATH=$(jq -r '.plan_path // empty' "$MARKER" 2>/dev/null)

# Malformed marker — fail-safe (allow stop, log)
if [[ -z "$SUCCESS_CHECK" ]] || [[ -z "$EXPECTED" ]]; then
  echo "stop-active-plan-block.sh: marker malformed, allowing stop" >&2
  exit 0
fi

# Run the success check (capture stdout, suppress errors)
ACTUAL=$(bash -c "$SUCCESS_CHECK" 2>/dev/null | tr -d '[:space:]')
EXPECTED_TRIMMED=$(echo "$EXPECTED" | tr -d '[:space:]')

if [[ "$ACTUAL" == "$EXPECTED_TRIMMED" ]]; then
  # Success — clear the marker and allow stop
  rm -f "$MARKER"
  exit 0
fi

# Criterion not met — block the stop
cat <<EOF >&2
⛔ ACTIVE PLAN NOT COMPLETE.

Plan: $LABEL
Plan file: $PLAN_PATH
Success check: $SUCCESS_CHECK
Expected output: $EXPECTED_TRIMMED
Actual output:   $ACTUAL

You are not authorized to stop this turn. The approved plan's success
criterion has not been met. Continue executing the approved plan
per-task. Do NOT write a wrap-up / checkpoint / "stopping here" message.

To abandon this plan explicitly, the USER (not Claude) must run:
  bash .claude/hooks/abandon-plan.sh

You (Claude) cannot delete the marker. If you believe the plan is wrong
or impossible, your only legal action is to ask the user to abandon it.
EOF

# Exit code 2 = block in Stop hook
exit 2
