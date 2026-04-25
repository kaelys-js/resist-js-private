#!/bin/bash
# Pre-QA commands hook — enforce correct QA command patterns.
# All QA must run from workspace root via pnpm scripts, never npx or cd.
INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Block: npx vitest (should use pnpm -w run qa:test:unit or pnpm -r --filter)
if echo "$CMD" | grep -qE "^npx vitest"; then
  echo '{"decision":"deny","message":"Do not use npx vitest. Use: pnpm -w run qa:test:unit (all projects) or pnpm -r --filter <pkg> run qa:test (single package)"}'
  exit 0
fi

# Block: cd <subdir> && pnpm qa:* or cd <subdir> && vitest or cd <subdir> && tsgo
if echo "$CMD" | grep -qE "^cd [^;]+&&.*qa:|^cd [^;]+;.*qa:|^cd [^;]+&&.*vitest|^cd [^;]+;.*vitest|^cd [^;]+&&.*tsgo|^cd [^;]+;.*tsgo"; then
  echo '{"decision":"deny","message":"Do not cd into subdirectories for QA commands. Use from workspace root: pnpm -r --filter <pkg> run qa:<cmd>"}'
  exit 0
fi

# Block: piping qa:lint output through grep/head/tail/awk/sed/wc.
# The custom linter accepts path/--package args for scoped runs — use those
# instead of post-filtering with grep loops. Allow | cat and | tee for log capture.
if echo "$CMD" | grep -qE "qa:lint([^|]*)\|[[:space:]]*(grep|head|tail|awk|sed|wc)\b"; then
  echo '{"decision":"deny","message":"Do not pipe qa:lint through grep/head/tail/awk/sed/wc. Use the scoped form instead: pnpm -w run qa:lint <path-or-package>. Workspace-level rules are auto-skipped when a path is passed."}'
  exit 0
fi

exit 0
