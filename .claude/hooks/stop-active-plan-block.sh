#!/usr/bin/env bash
# Stop hook: blocks turn-end while an approved plan's success criterion is unmet.
#
# Reads .claude/active-plan.json (created by post-exit-plan-mode-record.sh).
# If present, runs the embedded `success_check` shell command and compares
# the trimmed stdout against `expected`. If mismatched → block. If matched →
# delete the marker (plan complete) and allow stop.
#
# User-pause: if .claude/user-pause exists, the hook allows the stop
# regardless of plan status. This lets the user freeze the plan without
# abandoning it. Claude cannot create this file (blocked by
# pre-bash-no-file-writes.sh's approval-marker rules).
#
# To pause:   touch .claude/user-pause
# To resume:  rm .claude/user-pause
# To abandon: bash .claude/hooks/abandon-plan.sh

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MARKER="$REPO_ROOT/.claude/active-plan.json"
PAUSE_MARKER="$REPO_ROOT/.claude/user-pause"

# No active plan — allow stop
if [[ ! -f "$MARKER" ]]; then
  exit 0
fi

# User-pause — allow stop unconditionally, log it
if [[ -f "$PAUSE_MARKER" ]]; then
  echo "stop-active-plan-block.sh: user-pause marker found, allowing stop" >&2
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
echo "⛔ Plan incomplete ($LABEL). User's words override this hook. Pause: touch .claude/user-pause | Abandon: bash .claude/hooks/abandon-plan.sh" >&2

# Exit code 2 = block in Stop hook
exit 2
