#!/bin/bash
# PostToolUse hook for Edit/Write — reminds Claude to state what changed and run QA.
# Fires after every Edit or Write tool call on project files.

INPUT=$(cat)

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only care about project source files
if [[ "$FILE_PATH" != *"/Users/coleb/Desktop/webforge/"* ]]; then
  exit 0
fi

# Skip non-source files (hooks, configs, docs, memory)
if [[ "$FILE_PATH" == *".claude/"* ]] || [[ "$FILE_PATH" == *"node_modules/"* ]] || [[ "$FILE_PATH" == *".md" ]]; then
  exit 0
fi

# Extract just the filename for readability
BASENAME=$(basename "$FILE_PATH")

cat << EOF
[Post-Edit Check] You just edited: $BASENAME

1. If the user asked a question or gave feedback — RESPOND TO THEM FIRST. QA does NOT override human conversation.
2. State in ONE line what you changed and what you did NOT change
3. If you changed HTML/div nesting or added bg-* classes — was this approved?
4. Run QA: pnpm qa:type-check && pnpm qa:lint && pnpm qa:format
5. Do NOT batch edits — fix any QA errors before editing another file
EOF

exit 0
