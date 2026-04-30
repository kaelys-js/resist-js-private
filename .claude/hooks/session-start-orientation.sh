#!/usr/bin/env bash
# Session Start Orientation Hook
# Fires on startup, resume, compaction, and clear.

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ACTIVE_PLAN="$REPO_ROOT/.claude/active-plan.json"

echo "Resume: user's last message is the task. Stale TODOs are invalid."

# Clear qa:lint cooldown so new sessions can run their first lint
rm -f "$REPO_ROOT/.claude/.last-lint-run"

if [[ -f "$ACTIVE_PLAN" ]]; then
  LABEL=$(jq -r '.label // "unknown"' "$ACTIVE_PLAN" 2>/dev/null)
  echo "Active plan: $LABEL. User's words override stop hook. Pause: touch .claude/user-pause"
fi
