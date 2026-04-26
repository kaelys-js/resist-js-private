#!/usr/bin/env bash
# PreToolUse hook for Bash: blocks Python/sed bulk-edit scripts unless the
# user has approved them via .claude/approved-bulk-script.
#
# This addresses the failure mode where Claude reaches for one-shot scripts
# instead of per-site Edits, breaks code, debugs, reverts, retries — costing
# more compute than the per-site grind would.
#
# Detection heuristic: any python3 / python / sed -i / awk -i invocation that
# would touch more than 3 files. Approximated by:
#   - python3 *.py with the script reading a `glob.glob` or `pathlib.Path` walk
#   - sed -i / awk -i with multiple file args or wildcards
#   - find ... -exec sed/awk
#
# Override: user creates `.claude/approved-bulk-script` (any content); the
# hook then allows ONE invocation and consumes the marker.

set -uo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APPROVAL_MARKER="$REPO_ROOT/.claude/approved-bulk-script"

# If the user has approved this invocation, consume the marker and allow.
if [[ -f "$APPROVAL_MARKER" ]]; then
  rm -f "$APPROVAL_MARKER"
  exit 0
fi

# Detect bulk-script patterns
BLOCKED_REASON=""

# Pattern 1: python3 script.py / python script.py reading multiple files
if echo "$COMMAND" | grep -qE 'python3?\s+(-c\s|/tmp/.*\.py|.*\.py)'; then
  # Check if the script content references glob/walk/multi-file patterns
  # Inline `python3 -c "..."` form
  if echo "$COMMAND" | grep -qE 'python3?\s+-c.*(glob\.|pathlib|Path\(.*walk|os\.walk)'; then
    BLOCKED_REASON="inline python3 -c using glob/pathlib walk (multi-file edit)"
  fi
  # Script-file form: `python3 /tmp/foo.py` — inspect the script
  SCRIPT_PATH=$(echo "$COMMAND" | grep -oE '(/tmp/[^ ]+\.py|\./[^ ]+\.py|[a-zA-Z_-]+\.py)' | head -1)
  if [[ -n "$SCRIPT_PATH" ]] && [[ -f "$SCRIPT_PATH" ]]; then
    if grep -qE '(glob\.glob|pathlib\.Path|os\.walk|for f in files)' "$SCRIPT_PATH"; then
      # Count files the script likely touches — conservative: any script with
      # `glob.glob(...)` or a hardcoded files-list of length >= 4 is bulk.
      LIST_SIZE=$(grep -cE "^\s*['\"]packages/" "$SCRIPT_PATH" || echo 0)
      if [[ "$LIST_SIZE" -ge 4 ]] || grep -qE 'glob\.glob' "$SCRIPT_PATH"; then
        BLOCKED_REASON="python script $SCRIPT_PATH iterates over multiple files (bulk edit)"
      fi
    fi
  fi
fi

# Pattern 2: sed -i / awk -i inplace with multiple file args
if echo "$COMMAND" | grep -qE '\bsed\s+-i\b' || echo "$COMMAND" | grep -qE '\bawk\s+.*-i\s*inplace\b'; then
  # If the command has file globs (*) or `find ... -exec sed`, it's bulk
  if echo "$COMMAND" | grep -qE '(\*\.[a-z]+|find\s.*-exec\s+(sed|awk))'; then
    BLOCKED_REASON="sed/awk -i with file glob or find -exec (bulk edit)"
  fi
fi

# Pattern 3: a single bash command with multiple discrete `git mv` invocations
# is NOT blocked — that's user-approved file moves, not a bulk-edit script.

if [[ -n "$BLOCKED_REASON" ]]; then
  cat <<EOF >&2
⛔ BLOCKED: Bulk-edit script detected ($BLOCKED_REASON).

Bulk Python/sed scripts that touch many files are forbidden by default.
They consistently break code in ways that cost more compute to debug + revert
+ retry than per-site Edit-tool invocations would have cost.

If a per-site grind is genuinely impractical:
  1. STOP this command.
  2. Ask the user explicitly:
     "May I run a bulk script across <N> files to fix <pattern>?
      I will verify with `pnpm --filter @/<pkg> run qa:test` after."
  3. The user creates the marker:
     touch .claude/approved-bulk-script
  4. Retry. The marker will be consumed.

Per-site Edits via the Edit tool ARE the right approach for plan-bound
grinds. They cost more wall-clock time but use COMPUTE PREDICTABLY.
That predictability is what the user wants.
EOF
  exit 2
fi

exit 0
