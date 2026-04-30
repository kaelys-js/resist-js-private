#!/usr/bin/env bash
# Pre-edit hook: require approval before modifying custom lint rules
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
if echo "$FILE" | grep -q "config/tooling/lint/src/rules/"; then
  BASENAME=$(basename "$FILE")
  echo "{\"decision\": \"ask\", \"message\": \"Editing custom lint rule: ${BASENAME}. Approve?\"}"
else
  echo "{\"decision\": \"allow\"}"
fi
