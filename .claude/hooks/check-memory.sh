#!/usr/bin/env bash
# check-memory.sh — PreToolUse hook on Edit|Write matcher
# Before edits, remind to check relevant Serena memories.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

# Extract package identifier from path
# Structure: packages/{group}/{name} (e.g. packages/shared/config, packages/products/storylyne)
# Also handle: packages/{group}/{name}/{sub} (e.g. packages/shared/config/tooling/lint)
if [[ "$file_path" =~ packages/([^/]+)/([^/]+) ]]; then
  group="${BASH_REMATCH[1]}"
  pkg="${BASH_REMATCH[2]}"
  pkg_key="${group}-${pkg}"

  # Check for memory with group-package name (e.g. shared-config-overview.md)
  memory_file=".serena/memories/${pkg_key}-overview.md"
  if [[ -f "$memory_file" ]]; then
    echo "[Memory available] Relevant memory exists: ${pkg_key}-overview.md — consider reading it with mcp__serena__read_memory before editing."
  fi

  # Also check for just the package name (e.g. lint-overview.md for tooling/lint)
  if [[ "$file_path" =~ packages/[^/]+/[^/]+/([^/]+) ]]; then
    sub="${BASH_REMATCH[1]}"
    sub_memory=".serena/memories/${sub}-overview.md"
    if [[ -f "$sub_memory" ]]; then
      echo "[Memory available] Relevant memory exists: ${sub}-overview.md — consider reading it with mcp__serena__read_memory before editing."
    fi
  fi
fi

exit 0
