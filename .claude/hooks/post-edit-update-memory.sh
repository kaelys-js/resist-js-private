#!/usr/bin/env bash
# post-edit-update-memory.sh — PostToolUse hook on Edit|Write
# After editing code files, checks Serena memory state for the package:
#   - Memory EXISTS → remind to update it if the edit changes documented patterns
#   - Memory DOESN'T EXIST → remind to create it (you just worked here, document it)
# Skips non-code files, test files, hook scripts, and docs.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

# Only trigger for code files
if [[ ! "$file_path" =~ \.(ts|tsx|js|jsx|svelte)$ ]]; then
  exit 0
fi

# Skip test/spec files
if [[ "$file_path" =~ \.(test|spec)\.(ts|tsx|js) ]]; then
  exit 0
fi

# Skip hook scripts, docs, and config
if [[ "$file_path" =~ \.claude/ ]] || [[ "$file_path" =~ docs/ ]] || [[ "$file_path" =~ \.serena/ ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Extract package from path (handles packages/{group}/{name}/...)
if [[ "$file_path" =~ packages/([^/]+)/([^/]+) ]]; then
  group="${BASH_REMATCH[1]}"
  pkg="${BASH_REMATCH[2]}"
  pkg_key="${group}-${pkg}"
  memory_file="$REPO_ROOT/.serena/memories/${pkg_key}-overview.md"

  if [[ -f "$memory_file" ]]; then
    echo "[Memory may need update] You edited ${file_path##*/} in ${pkg_key}. If this changes exports, patterns, or architecture documented in ${pkg_key}-overview.md, update the memory with mcp__serena__write_memory."
  else
    echo "[No memory exists] Package ${pkg_key} has no Serena memory. You just made changes here — write '${pkg_key}-overview.md' documenting key exports, patterns, and file structure with mcp__serena__write_memory."
  fi

  # Also check sub-package memories (e.g. tooling/lint within shared/config)
  if [[ "$file_path" =~ packages/[^/]+/[^/]+/([^/]+) ]]; then
    sub="${BASH_REMATCH[1]}"
    sub_memory="$REPO_ROOT/.serena/memories/${sub}-overview.md"
    if [[ -f "$sub_memory" ]]; then
      echo "[Sub-module memory may need update] Memory ${sub}-overview.md also covers this area."
    fi
  fi
fi

exit 0
