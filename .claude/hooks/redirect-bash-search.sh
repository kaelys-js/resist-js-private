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
  if [[ "$cmd" =~ \.(ts|tsx|js|jsx|svelte)([[:space:]]|$|\") ]]; then
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

exit 0
