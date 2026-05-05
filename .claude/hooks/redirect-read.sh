#!/usr/bin/env bash
# redirect-read.sh — PreToolUse hook on Read matcher
# When a Serena memory exists for a code file's package, BLOCK the first read
# and redirect to mcp__serena__read_memory. Subsequent reads of the same file
# are allowed (tracked via /tmp/claude-serena-reads, cleared on session start).
# Non-code files always pass through.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

# Fixed path — shared across all hook invocations in a session.
# Cleared by session-start-orientation.sh on every new session/resume/compact/clear.
SESSION_READS="/tmp/claude-serena-reads"

# Only check code files
if [[ "$file_path" =~ \.(ts|tsx|js|jsx|svelte)$ ]]; then
  # Check if a memory exists for this area
  if [[ "$file_path" =~ packages/([^/]+)/([^/]+) ]]; then
    group="${BASH_REMATCH[1]}"
    pkg="${BASH_REMATCH[2]}"
    memory_file=".serena/memories/${group}-${pkg}-overview.md"
    if [[ -f "$memory_file" ]]; then
      # Check if this file was already redirected in this session
      if [[ -f "$SESSION_READS" ]] && grep -qF "$file_path" "$SESSION_READS" 2>/dev/null; then
        # Already been redirected once — allow the read
        exit 0
      fi
      # Record this file path so the next read is allowed
      echo "$file_path" >> "$SESSION_READS"
      cat <<EOF >&2
READ REDIRECTED — memory exists for ${group}-${pkg}.
Read mcp__serena__read_memory("${group}-${pkg}-overview") first.
Then use mcp__serena__find_symbol to navigate to specific functions.
Direct file reads are allowed after checking the memory.
EOF
      exit 2
    fi
  fi
fi

exit 0
