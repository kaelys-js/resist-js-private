#!/bin/bash
# Pre-git-add hook — warn on git add -A / git add .
# Prefer staging specific files to avoid accidentally committing sensitive files.
INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

if echo "$CMD" | grep -qE "git add -A|git add \\."; then
  echo '{"decision":"ask","message":"git add -A/. stages everything including potentially sensitive files. Consider staging specific files by name instead."}'
  exit 0
fi

exit 0
