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

cat << EOF
[Pre-Commit Verification] You are about to commit. STOP and verify:

Staged files:
$DIFF_STAT

MANDATORY CHECKS:
1. Does every changed file match the approved changelog items?
2. Were any features REMOVED that should not have been?
3. Were any unauthorized structural changes made (div nesting, background classes)?
4. Did QA pass clean? (type-check, lint, format)

If ANY answer is "no" or "unsure" — STOP the commit and tell the user.
EOF

exit 0
