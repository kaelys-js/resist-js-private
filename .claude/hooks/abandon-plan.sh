#!/usr/bin/env bash
# User-invoked: abandons an active plan and removes the .claude/active-plan.json
# marker so the Stop hook (stop-active-plan-block.sh) no longer blocks.
#
# Logs the abandonment to .claude/abandoned-plans.log so there's a record.
#
# Usage (USER ONLY — do NOT call from Claude tool calls):
#   bash .claude/hooks/abandon-plan.sh [reason]

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MARKER="$REPO_ROOT/.claude/active-plan.json"
LOG="$REPO_ROOT/.claude/abandoned-plans.log"

if [[ ! -f "$MARKER" ]]; then
  echo "No active plan to abandon."
  exit 0
fi

REASON="${1:-(no reason provided)}"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LABEL=$(jq -r '.label // "unknown"' "$MARKER" 2>/dev/null)
PLAN_PATH=$(jq -r '.plan_path // "unknown"' "$MARKER" 2>/dev/null)

{
  echo "$TIMESTAMP\tABANDONED\t$LABEL\t$PLAN_PATH\t$REASON"
} >> "$LOG"

rm -f "$MARKER"
echo "Active plan abandoned: $LABEL"
echo "Logged to $LOG"
