#!/usr/bin/env bash
# redirect-glob.sh — PreToolUse hook on Glob matcher
# Blocks Glob on code file patterns and redirects to Serena symbol tools.
# Glob is allowed for non-code patterns (configs, docs, etc).

input=$(cat)
pattern=$(echo "$input" | jq -r '.tool_input.pattern // ""')

# Block globbing for code files — use Serena for code discovery
if [[ "$pattern" =~ \*\.(ts|tsx|js|jsx|svelte|mjs|cjs|cts|mts|hbs|go) ]] || [[ "$pattern" =~ \*\*/\*\.(ts|tsx|js|jsx|svelte|mjs|cjs|cts|mts|hbs|go) ]]; then
  # Allow test file globs — legitimate for test discovery
  if [[ "$pattern" =~ \.(test|spec)\.(ts|tsx|js|mjs) ]]; then
    exit 0
  fi
  cat <<EOF >&2
GLOB BLOCKED FOR CODE FILE DISCOVERY.
Use one of these instead:
  - mcp__serena__find_symbol — for finding definitions by name
  - mcp__serena__get_symbols_overview — for listing exports in a package
  - mcp__cocoindex_code__search — for semantic search ("files handling auth")

Glob is allowed for non-code files (*.md, *.json, *.yml, etc).
EOF
  exit 2
fi

exit 0
