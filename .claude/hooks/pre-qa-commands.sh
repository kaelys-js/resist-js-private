#!/bin/bash
# Pre-QA commands hook — enforce correct QA command patterns.
# All QA must run from workspace root via pnpm scripts, never npx or cd.
INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Block: npx vitest (should use pnpm -w run qa:test:unit or pnpm -r --filter)
if echo "$CMD" | grep -qE "^npx vitest|^npx tsx.*cli\.ts"; then
  if echo "$CMD" | grep -qE "npx vitest"; then
    echo '{"decision":"deny","message":"Do not use npx vitest. Use: pnpm -w run qa:test:unit (all projects) or pnpm -r --filter <pkg> run qa:test (single package)"}'
    exit 0
  fi
  if echo "$CMD" | grep -qE "npx tsx.*cli\.ts"; then
    echo '{"decision":"deny","message":"Do not run custom linter via npx tsx. Use: pnpm -w run qa:lint (oxlint + custom) or pnpm -w run qa:lint:custom (custom only)"}'
    exit 0
  fi
fi

# Block: cd <subdir> && pnpm qa:* or cd <subdir> && vitest or cd <subdir> && tsgo
if echo "$CMD" | grep -qE "^cd [^;]+&&.*qa:|^cd [^;]+;.*qa:|^cd [^;]+&&.*vitest|^cd [^;]+;.*vitest|^cd [^;]+&&.*tsgo|^cd [^;]+;.*tsgo"; then
  echo '{"decision":"deny","message":"Do not cd into subdirectories for QA commands. Use from workspace root: pnpm -r --filter <pkg> run qa:<cmd>"}'
  exit 0
fi

exit 0
