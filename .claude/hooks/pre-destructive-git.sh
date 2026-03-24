#!/bin/bash
# PreToolUse hook for Bash — blocks destructive git commands without user permission.
# Changed from "deny" to "ask" so the user can approve if intended.

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

REASON=""

if [[ "$COMMAND" == *"git stash"* ]]; then
  REASON="git stash can lose uncommitted work"
elif [[ "$COMMAND" == *"git reset --hard"* ]]; then
  REASON="git reset --hard discards all changes permanently"
elif [[ "$COMMAND" == *"git reset"* ]] && [[ "$COMMAND" != *"git reset --soft"* ]]; then
  REASON="git reset can discard staged changes"
elif [[ "$COMMAND" == *"git checkout ."* ]] || [[ "$COMMAND" == *"git checkout -- ."* ]]; then
  REASON="git checkout . discards all unstaged changes"
elif [[ "$COMMAND" == *"git clean"* ]]; then
  REASON="git clean deletes untracked files"
elif [[ "$COMMAND" == *"git restore ."* ]] || [[ "$COMMAND" == *"git restore --staged"* ]]; then
  REASON="git restore discards changes"
elif [[ "$COMMAND" == *"git revert"* ]]; then
  REASON="git revert creates a commit that undoes previous work"
elif [[ "$COMMAND" == *"git branch -D"* ]] || [[ "$COMMAND" == *"git branch -d"* ]]; then
  REASON="git branch -D/-d deletes branches"
elif [[ "$COMMAND" == *"git push --force"* ]] || [[ "$COMMAND" == *"git push -f"* ]]; then
  REASON="git push --force overwrites remote history"
fi

if [ -n "$REASON" ]; then
  echo "{\"decision\": \"ask\", \"message\": \"⚠️ Destructive git command: $REASON. Approve?\"}"
  exit 0
fi

exit 0
