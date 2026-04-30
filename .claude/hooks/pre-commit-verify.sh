#!/bin/bash
# PreToolUse hook for Bash — intercepts git commit commands.
# Forces Claude to verify the diff matches the approved changelog before committing.

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit commands
if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

# Get the staged diff stats
REPO_ROOT="$(git rev-parse --show-toplevel)"
DIFF_STAT=$(cd "$REPO_ROOT" && git diff --cached --stat 2>/dev/null)

if [ -z "$DIFF_STAT" ]; then
  exit 0
fi

echo "[Pre-Commit] Verify: staged files match changelog, no unauthorized changes, QA passed."

exit 0
