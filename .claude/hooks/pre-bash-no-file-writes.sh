#!/usr/bin/env bash
# PreToolUse hook for Bash: blocks file-writing commands.
# Forces all file writes through Edit/Write tools where format+lint hooks fire.

set -uo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# No command — nothing to check
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# ── ABSOLUTE BLOCK (cannot be bypassed by allow rules below) ────────────────
# Approval markers (`.claude/approved-*`) are USER-ONLY tokens. Claude must
# not create, move, copy, link, or refresh them via Bash — they exist so the
# user (running their own shell) can grant per-instance authorization for
# lint-disable / bulk-script / revert operations. If Claude could `touch`
# them itself, they become a self-rubber-stamp and the per-instance
# authorization mechanism collapses.
#
# Block any shell builtin/utility that can create or update a path under
# `.claude/approved-`: touch, install, dd, mv, cp, ln, chmod, chown, cat,
# tee, printf-into-redirect, etc.
if echo "$COMMAND" | grep -qE '(^|[[:space:]]|;|&&|\|\|)(touch|install|dd|mv|cp|ln|chmod|chown|tee|cat|printf|echo)([[:space:]]+[^;&|]*)?\.claude/approved-'; then
  cat <<'EOF' >&2
⛔ BLOCKED: Approval-marker creation/refresh via Bash is forbidden.

`.claude/approved-*` markers are USER-ONLY authorization tokens. Claude
may not create, refresh, or move them. The marker mechanism only works
if the user (running their own shell) creates the file in response to
an explicit per-instance approval question.

If you need a lint-disable, bulk-script, or revert override:
  1. STOP this command.
  2. Ask the user explicitly:
     "May I do <X>? Justification: <one sentence>."
  3. The USER will run `touch .claude/approved-<marker>` if approving.
  4. Then retry the operation.

NEVER run `touch .claude/approved-*` yourself — even if the user
appears to have given general consent earlier in the session, each
override needs its own explicit token.
EOF
  exit 2
fi

# Same pattern via the absolute project path (covers subshells / cd chains).
if echo "$COMMAND" | grep -qE '/\.claude/approved-' && echo "$COMMAND" | grep -qE '(^|[[:space:]]|;|&&|\|\|)(touch|install|dd|mv|cp|ln|chmod|chown|tee|cat|printf|echo)\b'; then
  echo "⛔ BLOCKED: Approval-marker creation via absolute path is forbidden — markers are USER-ONLY tokens." >&2
  exit 2
fi

# ── Allowed patterns (must come before the block check) ─────────────────────

# Allow git commands (they write to .git/, not source files)
if echo "$COMMAND" | grep -qE '^\s*git\s'; then
  exit 0
fi

# Allow pnpm/npm/npx/node/turbo/vitest commands (build tools, not direct writes)
if echo "$COMMAND" | grep -qE '^\s*(pnpm|npm|npx|node|turbo|vitest|biome|prettier|svelte-kit|tsgo)\s'; then
  exit 0
fi

# Allow source/which/echo-to-stdout/ls/cd/cat-without-redirect/env/export commands
if echo "$COMMAND" | grep -qE '^\s*(source|which|echo|printf|ls|cd|pwd|cat|env|export|eval|mkdir|chmod|rm|cp|mv|head|tail|wc|sort|uniq|diff|grep|rg|find|jq|curl|wget)\s'; then
  # But still check if they redirect to a file
  if ! echo "$COMMAND" | grep -qE '[^|]\s*>{1,2}\s*[^&]|[^|]\s*>{1,2}$|\btee\b'; then
    exit 0
  fi
fi

# ── Block file-writing patterns ─────────────────────────────────────────────

BLOCKED=""

# Redirect operators: > file, >> file (but not 2>&1, >/dev/null)
if echo "$COMMAND" | grep -qE '[^2]>{1,2}\s*[^/&\s]' && ! echo "$COMMAND" | grep -qE '>\s*/dev/null'; then
  BLOCKED="redirect operator (> or >>)"
fi

# tee (writes stdin to file)
if echo "$COMMAND" | grep -qE '\btee\b'; then
  BLOCKED="tee command"
fi

# sed -i (in-place edit)
if echo "$COMMAND" | grep -qE '\bsed\s+-i'; then
  BLOCKED="sed -i (in-place edit)"
fi

# awk -i inplace
if echo "$COMMAND" | grep -qE '\bawk\s+.*-i\s*inplace'; then
  BLOCKED="awk -i inplace"
fi

# heredoc to file: cat <<EOF > file
if echo "$COMMAND" | grep -qE 'cat\s+<<.*>\s*\S'; then
  BLOCKED="heredoc redirect to file"
fi

# dd (disk write)
if echo "$COMMAND" | grep -qE '\bdd\b.*\bof='; then
  BLOCKED="dd command"
fi

# install (copies files)
if echo "$COMMAND" | grep -qE '\binstall\b.*-[a-zA-Z]*[mM]'; then
  BLOCKED="install command"
fi

if [[ -n "$BLOCKED" ]]; then
  echo "Blocked: Bash file write detected ($BLOCKED). Use the Edit or Write tool instead — they trigger auto-format and lint hooks." >&2
  exit 2
fi

exit 0
