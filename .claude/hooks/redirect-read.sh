#!/usr/bin/env bash
# redirect-read.sh — PreToolUse hook on Read matcher
# STRICT MODE (option a): for any code file under packages/, BLOCK the first
# Read and force the agent through Serena overview/symbol tools regardless of
# whether a per-package memory file exists. Once the agent has been redirected
# once for a given file, subsequent reads of THAT file are allowed (tracked
# via /tmp/claude-serena-reads, cleared on session-start hook).
# Non-code files always pass through.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

# Fixed path — shared across all hook invocations in a session.
# Cleared by session-start-orientation.sh on every new session/resume/compact/clear.
SESSION_READS="/tmp/claude-serena-reads"

# Only check code files (extended extensions: .mjs/.cjs/.cts/.mts and .go too)
if [[ "$file_path" =~ \.(ts|tsx|js|jsx|svelte|mjs|cjs|cts|mts|go)$ ]]; then
  # Only enforce on packages/* paths (root scripts, .claude/, _INTEGRATE/ stay free)
  if [[ "$file_path" =~ packages/ ]]; then
    # Already-redirected files this session: pass
    if [[ -f "$SESSION_READS" ]] && grep -qF "$file_path" "$SESSION_READS" 2>/dev/null; then
      exit 0
    fi

    # Determine area + memory file (may or may not exist; we redirect either way)
    area=""
    memory_hint=""
    if [[ "$file_path" =~ packages/([^/]+)/([^/]+) ]]; then
      group="${BASH_REMATCH[1]}"
      pkg="${BASH_REMATCH[2]}"
      area="${group}-${pkg}"
      if [[ -f ".serena/memories/${area}-overview.md" ]]; then
        memory_hint="A Serena memory EXISTS for this area. Read it FIRST: mcp__serena__read_memory(\"${area}-overview\")."
      else
        memory_hint="No Serena memory exists for ${area}. Use mcp__serena__get_symbols_overview on the file or directory FIRST. After exploring, consider mcp__serena__write_memory(\"${area}-overview\", ...) so future sessions benefit."
      fi
    fi

    # Record + redirect on first attempt
    echo "$file_path" >> "$SESSION_READS"
    cat <<EOF >&2
READ REDIRECTED (strict mode) — code file under packages/.

File: $file_path
Area: ${area:-unknown}

$memory_hint

Other Serena/cocoindex tools to use BEFORE direct Read:
  - mcp__serena__get_symbols_overview — top-level symbols of a file/dir
  - mcp__serena__find_symbol — by name (e.g. "createSvelteConfig")
  - mcp__serena__find_referencing_symbols — call sites
  - mcp__cocoindex_code__search — fuzzy / semantic ("where do we handle X")

The next Read on THIS exact file path will be allowed without prompting again.
EOF
    exit 2
  fi
fi

exit 0
