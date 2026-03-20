#!/bin/bash
# PostToolUse hook for TodoWrite — reminds Claude to verify against changelog after completing tasks.
# Supplements the existing update-session-tasks.sh hook.

INPUT=$(cat)

# Check if any task was just marked completed
HAS_COMPLETED=$(echo "$INPUT" | jq -r '[.tool_input.todos[] | select(.status=="completed")] | length' 2>/dev/null)
TOTAL=$(echo "$INPUT" | jq -r '[.tool_input.todos[]] | length' 2>/dev/null)
PENDING=$(echo "$INPUT" | jq -r '[.tool_input.todos[] | select(.status=="pending")] | length' 2>/dev/null)

# If all tasks are completed, remind to verify against changelog
if [ "$PENDING" = "0" ] && [ "$HAS_COMPLETED" -gt "0" ] 2>/dev/null; then
  cat << EOF
[All Tasks Complete] Before claiming "done":

MANDATORY VERIFICATION:
1. Re-read the approved changelog items
2. For EACH item: verify it was implemented correctly by reading the changed files
3. Verify NO features were removed or changed beyond what was approved
4. Run full QA: pnpm qa:type-check && pnpm qa:lint && pnpm qa:format
5. ONLY THEN tell the user the work is complete
EOF
fi

exit 0
