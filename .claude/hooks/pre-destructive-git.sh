#!/bin/bash
# PreToolUse hook for Bash — blocks destructive git commands without user permission.
# Intercepts: git stash, git reset --hard, git checkout ., git clean -f, git checkout -- .

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Check for destructive git commands
BLOCKED=false
REASON=""

if [[ "$COMMAND" == *"git stash"* ]]; then
  BLOCKED=true
  REASON="git stash can lose uncommitted work"
fi

if [[ "$COMMAND" == *"git reset --hard"* ]]; then
  BLOCKED=true
  REASON="git reset --hard discards all changes permanently"
fi

if [[ "$COMMAND" == *"git checkout ."* ]] || [[ "$COMMAND" == *"git checkout -- ."* ]]; then
  BLOCKED=true
  REASON="git checkout . discards all unstaged changes"
fi

if [[ "$COMMAND" == *"git clean -f"* ]]; then
  BLOCKED=true
  REASON="git clean -f deletes untracked files permanently"
fi

if [[ "$COMMAND" == *"git restore ."* ]]; then
  BLOCKED=true
  REASON="git restore . discards all unstaged changes"
fi

if [ "$BLOCKED" = true ]; then
  cat << EOF >&2
{"hookSpecificOutput": {"permissionDecision": "deny"}, "systemMessage": "⛔ BLOCKED: Destructive git command detected. Reason: $REASON. You MUST ask the user for explicit permission before running this command. NEVER run destructive git commands without permission."}
EOF
  exit 2
fi

exit 0
