#!/usr/bin/env bash
# User-invoked: pauses an active plan without abandoning it.
# Creates .claude/user-pause so stop-active-plan-block.sh allows stops.
# The plan remains in .claude/active-plan.json and can be resumed by
# removing the pause marker.
#
# Usage (USER ONLY — Claude cannot create this marker):
#   bash .claude/hooks/pause-plan.sh
#
# To resume:
#   rm .claude/user-pause
#
# To abandon instead:
#   bash .claude/hooks/abandon-plan.sh [reason]

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MARKER="$REPO_ROOT/.claude/active-plan.json"
PAUSE="$REPO_ROOT/.claude/user-pause"

if [[ ! -f "$MARKER" ]]; then
  echo "No active plan to pause."
  exit 0
fi

LABEL=$(jq -r '.label // "unknown"' "$MARKER" 2>/dev/null)

touch "$PAUSE"
echo "Plan paused: $LABEL"
echo "Claude can now stop turns without being forced to continue."
echo ""
echo "To resume: rm .claude/user-pause"
echo "To abandon: bash .claude/hooks/abandon-plan.sh"
