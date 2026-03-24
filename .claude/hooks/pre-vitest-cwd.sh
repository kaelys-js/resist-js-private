#!/bin/bash
# Pre-vitest hook — prevent running vitest from subdirectories.
# Vitest must be run from workspace root or via pnpm -r --filter.
INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Only check commands that invoke vitest
if ! echo "$CMD" | grep -qE "vitest|npx vitest"; then
  exit 0
fi

# Allow pnpm -r / pnpm --filter (runs from root automatically)
if echo "$CMD" | grep -qE "pnpm -r|pnpm --filter|pnpm -w"; then
  exit 0
fi

# Allow npx vitest (runs from CWD which should be root)
# But block if command starts with "cd " to a subdirectory
if echo "$CMD" | grep -qE "^cd [^;]+&&.*vitest|^cd [^;]+;.*vitest"; then
  echo '{"decision":"deny","message":"Do not cd into a subdirectory to run vitest. Run from workspace root: npx vitest run --project <name>"}'
  exit 0
fi

exit 0
