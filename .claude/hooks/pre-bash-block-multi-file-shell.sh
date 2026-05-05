#!/usr/bin/env bash
# PreToolUse hook for Bash: catches the multi-file-edit shapes that
# pre-bash-block-bulk-script.sh's narrower pattern leaves open:
#   1. find ... -exec <write-cmd> ...
#   2. shell for-loops over file globs that invoke write commands
#   3. xargs <write-cmd> piped from grep/find
#   4. piped chains that culminate in a write command (sed -i, mv, cp, tee, > file)
#
# Shares the .claude/approved-bulk-script marker with pre-bash-block-bulk-script.sh
# (consumed by either hook on first match).

set -uo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Skip git commands — git writes to .git/ only, never uses bulk shell loops
# against source files. This avoids false positives where commit-message
# heredocs contain example `grep -rl | xargs sed` patterns in documentation.
if echo "$COMMAND" | grep -qE '^\s*git\s'; then
  exit 0
fi

# Autonomous mode (Multica-spawned task): bypass approval-marker gating.
# Safety-critical hooks (pre-bash-no-file-writes, pre-edit-lint-config-deny,
# pre-destructive-git, pre-bash-block-claude-abandon-attempt) DO NOT honor
# this escape and remain strict.
if [[ "${MULTICA_AUTONOMOUS:-}" = "1" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APPROVAL_MARKER="$REPO_ROOT/.claude/approved-bulk-script"

if [[ -f "$APPROVAL_MARKER" ]]; then
  rm -f "$APPROVAL_MARKER"
  exit 0
fi

BLOCKED_REASON=""

# Pattern 1: find ... -exec <write-cmd>
# Detect if find -exec calls sed/awk/perl with -i, mv, cp, or shell with redirect.
if echo "$COMMAND" | grep -qE '\bfind\b.*-exec\b'; then
  if echo "$COMMAND" | grep -qE '\-exec\s+(sed\s+-i|awk\s+.*-i\s*inplace|perl\s+-[a-zA-Z]*i|mv\b|cp\b|sh\s+-c|bash\s+-c|tee\b)'; then
    BLOCKED_REASON="find -exec invokes a write command (sed -i / mv / cp / sh -c / etc.)"
  fi
fi

# Pattern 2: for-loop over a file glob that invokes a write command.
# Matches things like: `for f in src/**/*.ts; do sed -i '' '...' "$f"; done`
if [[ -z "$BLOCKED_REASON" ]]; then
  if echo "$COMMAND" | grep -qE '\bfor\s+\w+\s+in\b.*\*'; then
    if echo "$COMMAND" | grep -qE '(sed\s+-i|awk\s+.*-i\s*inplace|perl\s+-[a-zA-Z]*i|mv\b|cp\b|>\s*"?\$|tee\b)'; then
      BLOCKED_REASON="shell for-loop over a glob that invokes a write command"
    fi
  fi
fi

# Pattern 3: xargs piping into a write command
if [[ -z "$BLOCKED_REASON" ]]; then
  if echo "$COMMAND" | grep -qE '\|\s*xargs\b'; then
    if echo "$COMMAND" | grep -qE 'xargs\s+(sed\s+-i|awk\s+.*-i\s*inplace|perl\s+-[a-zA-Z]*i|mv\b|cp\b|tee\b|sh\s+-c)'; then
      BLOCKED_REASON="xargs invokes a write command (sed -i / mv / cp / sh -c)"
    fi
  fi
fi

# Pattern 4: pipe chain ending in a write command other than the ones already
# caught by pre-bash-no-file-writes.sh. Specifically: `grep -rl ... | xargs -I {} cmd {}`
if [[ -z "$BLOCKED_REASON" ]]; then
  if echo "$COMMAND" | grep -qE '\bgrep\s+-r[a-zA-Z]*l[a-zA-Z]*\b.*\|'; then
    if echo "$COMMAND" | grep -qE '(sed\s+-i|mv\b|cp\b|perl\s+-[a-zA-Z]*i|awk\s+.*-i\s*inplace)'; then
      BLOCKED_REASON="grep -rl piped to a write command (multi-file edit)"
    fi
  fi
fi

if [[ -n "$BLOCKED_REASON" ]]; then
  echo "⛔ Multi-file shell loop blocked ($BLOCKED_REASON). Use per-site Edit calls. Override: user runs touch .claude/approved-bulk-script" >&2
  exit 2
fi

exit 0
