#!/bin/bash
# PostToolUse hook for TodoWrite — auto-updates session-tasks.md with current task list.
# Runs silently after every TodoWrite call so task state survives compaction.

SESSION_TASKS="$HOME/.claude/projects/-Users-coleb-Desktop-webforge/memory/session-tasks.md"

# Read JSON from stdin (PostToolUse provides tool_input via stdin)
INPUT=$(cat)

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Extract todos using jq
TODOS=$(echo "$INPUT" | jq -r '
  .tool_input.todos[]
  | "- [\(.status)] \(.content)"
' 2>/dev/null)

# If no todos parsed, clear the file
if [ -z "$TODOS" ]; then
  echo "# Current Tasks (auto-updated)" > "$SESSION_TASKS"
  echo "**Last updated:** $TIMESTAMP" >> "$SESSION_TASKS"
  echo "" >> "$SESSION_TASKS"
  echo "No active tasks." >> "$SESSION_TASKS"
  exit 0
fi

# Count by status
COMPLETED=$(echo "$INPUT" | jq '[.tool_input.todos[] | select(.status=="completed")] | length' 2>/dev/null)
IN_PROGRESS=$(echo "$INPUT" | jq '[.tool_input.todos[] | select(.status=="in_progress")] | length' 2>/dev/null)
PENDING=$(echo "$INPUT" | jq '[.tool_input.todos[] | select(.status=="pending")] | length' 2>/dev/null)

cat > "$SESSION_TASKS" << EOF
# Current Tasks (auto-updated)
**Last updated:** $TIMESTAMP
**Summary:** $COMPLETED completed, $IN_PROGRESS in progress, $PENDING pending

$TODOS
EOF

exit 0
