#!/bin/bash
# PostToolUse hook — fires after any tool call. Checks if there was an error.
# Reminds Claude to NOT retry blindly and to verify file state.

INPUT=$(cat)

# Check if the tool result indicates an error
IS_ERROR=$(echo "$INPUT" | jq -r '.tool_result.is_error // false')

if [ "$IS_ERROR" != "true" ]; then
  exit 0
fi

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')

cat << EOF
[Tool Error Detected] $TOOL_NAME failed.

MANDATORY:
1. Do NOT retry blindly — state what failed and WHY
2. If the error was on an Edit: READ the file to confirm its current state before retrying
3. If the error was an API error: wait and inform the user, do NOT loop
4. If a file was partially edited: READ it NOW to verify consistency
EOF

exit 0
