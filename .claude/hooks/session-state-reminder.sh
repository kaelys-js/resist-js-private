#!/bin/bash
# PostToolUse hook for TodoWrite — reminds Claude to update session-state.md
# when tasks are completed. session-state.md going stale causes disorientation
# after compaction and leads to working on the wrong things.

INPUT=$(cat)

# Check if any task was just marked completed
HAS_COMPLETED=$(echo "$INPUT" | jq -r '[.tool_input.todos[] | select(.status=="completed")] | length' 2>/dev/null)

if [ "$HAS_COMPLETED" -gt "0" ] 2>/dev/null; then
  cat << EOF
[Session State Reminder] You just completed a task.

MANDATORY: Update session-state.md NOW with:
- Current workflow and step
- What was just completed
- What's next
- Any standing user instructions from this session

File: ~/.claude/projects/-Users-coleb-Desktop-webforge/memory/session-state.md
This file MUST always reflect current reality. Stale state causes disorientation after compaction.
EOF
fi

exit 0
