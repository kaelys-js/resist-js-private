#!/usr/bin/env bash
# redirect-bash-search.sh — PreToolUse hook on Bash matcher
# Catches ALL code search/read escape hatches via Bash:
#   1. grep/rg/ag/ack (content search)
#   2. find -exec grep / xargs grep (piped search)
#   3. cat/head/tail/sed/awk on code files (reading code via Bash instead of Read tool)
# Allows these on non-code files (json, md, yml, log, txt, sh, css).

input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // ""')

# === Block 1: Search tools (grep/rg/ag/ack) ===
if [[ "$cmd" =~ (^|[|;&] *)(rg|grep|ag|ack)( |\") ]] || [[ "$cmd" =~ -exec\ (grep|rg|ag|ack) ]] || [[ "$cmd" =~ xargs\ (grep|rg|ag|ack) ]]; then
  # Allow if targeting non-code files explicitly
  if [[ "$cmd" =~ \.(md|json|jsonc|yml|yaml|log|txt|sh|css) ]]; then
    exit 0
  fi
  # Allow grep -c (count only) on non-code contexts
  if [[ "$cmd" =~ grep\ -c ]]; then
    exit 0
  fi
  echo "Use mcp__serena__find_symbol or mcp__cocoindex_code__search instead of shell search tools." >&2
  exit 2
fi

# === Block 2: Reading code files via cat/head/tail/sed/awk ===
# If the command contains cat/head/tail/sed/awk AND a .ts/.svelte/.js file path, block it.
# Allow heredocs (cat <<EOF).
# Check: command starts with one of these tools, or they appear after pipe/semicolon/&&
has_reader=false
if [[ "$cmd" =~ ^(cat|head|tail|sed|awk)[[:space:]] ]]; then
  has_reader=true
fi
# Also check after pipes and chain operators (use simpler pattern to avoid bracket issues)
if [[ "$cmd" =~ [[:space:]](cat|head|tail|sed|awk)[[:space:]] ]]; then
  has_reader=true
fi
if [[ "$has_reader" == "true" ]]; then
  # Check if any argument ends in a code extension
  if [[ "$cmd" =~ \.(ts|tsx|js|jsx|svelte|mjs|cjs|cts|mts|hbs|go)([[:space:]]|$|\") ]]; then
    # Allow heredocs
    if [[ "$cmd" =~ \<\< ]]; then
      exit 0
    fi
    cat <<EOF >&2
BASH CODE READ BLOCKED.
Use the Read tool (which checks for Serena memories) or mcp__serena__find_symbol instead of cat/head/tail on code files.
EOF
    exit 2
  fi
fi

# === Block 3: find / ls -R on code paths (closes the bypass that lets agents
# walk packages/* via bash before reaching for serena tools) ===
if [[ "$cmd" =~ (^|[|;&] *)(find|ls[[:space:]]+-R)[[:space:]] ]]; then
  # Allow if the find scope is non-code (root config, _INTEGRATE/, .git/, .claude/, $HOME)
  # — `find .` at workspace root is allowed; deeper packages/ paths are blocked below.
  if [[ "$cmd" =~ (^|[[:space:]])find[[:space:]]+(_INTEGRATE|\.git|\.claude|\.serena|\.cocoindex_code|~|/Users/home/(\.|/Library)) ]]; then
    exit 0
  fi
  # Allow when name pattern targets non-code files (json/jsonc/md/yml/yaml/toml/log/txt/sh/lock)
  if [[ "$cmd" =~ -name[[:space:]]+[\'\"]\*?\.(json|jsonc|md|mdx|yml|yaml|toml|log|txt|sh|lock)[\'\"]? ]]; then
    exit 0
  fi
  # Allow when targeting build artifacts (node_modules / dist / .svelte-kit / coverage / .turbo)
  if [[ "$cmd" =~ (node_modules|dist|\.svelte-kit|coverage|\.turbo|build|out)/ ]]; then
    exit 0
  fi
  # Block when path traverses code source dirs
  if [[ "$cmd" =~ (^|[[:space:]/])(packages|src|apps|server|lib|routes)([[:space:]/]|$) ]]; then
    cat <<'EOF' >&2
BASH find / ls -R BLOCKED on code paths.
Use one of these instead:
  - mcp__serena__get_symbols_overview — for file/directory structure
  - mcp__serena__find_symbol — for symbol lookup ("find createSvelteConfig")
  - mcp__cocoindex_code__search — for fuzzy/semantic queries
  - mcp__serena__list_memories — for area overviews
For pure non-code enumeration (json/md/yml/toml/log/txt/sh/lock), pass `-name '*.json'` etc.
EOF
    exit 2
  fi
fi

exit 0
