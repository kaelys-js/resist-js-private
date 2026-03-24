#!/bin/bash
# Pre-edit hook: require approval before modifying custom lint rules
INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)
if echo "$FILE" | grep -q "config/tooling/lint/src/rules/"; then
  BASENAME=$(basename "$FILE")
  echo "{\"decision\": \"ask\", \"message\": \"Editing custom lint rule: ${BASENAME}. Approve?\"}"
else
  echo "{\"decision\": \"allow\"}"
fi
