#!/usr/bin/env bash
# redirect-grep.sh — PreToolUse hook on Grep matcher
# Blocks grep on code files and redirects to Serena/CocoIndex MCP tools.
# Grep is ONLY allowed for non-code files (md, json, yml, log, jsonc, txt, sh).

input=$(cat)
pattern=$(echo "$input" | jq -r '.tool_input.pattern // ""')
path=$(echo "$input" | jq -r '.tool_input.path // ""')
include=$(echo "$input" | jq -r '.tool_input.include // ""')

# Determine if target is code:
# 1. Path ends in a code extension (file-specific grep)
# 2. Path points into a code directory (src/, lib/, routes/, packages/)
# 3. Include pattern targets code files
# 4. Pattern looks like code symbols
is_code=false

if [[ "$path" =~ \.(ts|tsx|js|jsx|svelte)$ ]]; then
  is_code=true
elif [[ "$path" =~ (^|/)(src|lib|routes|packages)(/|$) ]]; then
  is_code=true
elif [[ "$include" =~ \.(ts|tsx|js|jsx|svelte) ]]; then
  is_code=true
elif [[ "$pattern" =~ (function|class|export|import|interface|type |const |let |var |async ) ]]; then
  is_code=true
fi

if [[ "$is_code" == "true" ]]; then
  # Allow grep on non-code file extensions even in code directories
  if [[ "$include" =~ \.(md|json|jsonc|yml|yaml|log|txt|sh|css)$ ]]; then
    exit 0
  fi

  cat <<EOF >&2
GREP BLOCKED FOR CODE NAVIGATION.
Use one of these instead:
  - mcp__serena__find_symbol — for definitions ("find UserService")
  - mcp__serena__find_referencing_symbols — for usages ("who calls validateUser")
  - mcp__cocoindex_code__search — for semantic queries ("where do we handle JWT refresh")
  - mcp__serena__read_memory — for architectural questions you've explored before

Grep is ONLY allowed for non-code files (md, json, yml, log).
EOF
  exit 2
fi

exit 0
