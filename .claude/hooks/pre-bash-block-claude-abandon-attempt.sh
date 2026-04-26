#!/usr/bin/env bash
# PreToolUse hook for Bash: prevents Claude from invoking abandon-plan.sh
# via a tool call. abandon-plan is USER-ONLY — Claude must present evidence
# and let the user decide.
#
# This closes a social-engineering exit: "the plan is impossible, please
# run abandon-plan." The hook still allows the user to invoke abandon-plan
# from their own prompt — only Bash tool calls from Claude are blocked.
#
# Detection: literal `bash .claude/hooks/abandon-plan.sh` (with optional
# args) anywhere in the command. Also catches `.claude/hooks/abandon-plan.sh`
# and `sh .claude/hooks/abandon-plan.sh`.

set -uo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

if echo "$COMMAND" | grep -qE '(\bbash\s+|\bsh\s+|^|\s|/|;)\.claude/hooks/abandon-plan\.sh\b'; then
  cat <<EOF >&2
⛔ BLOCKED: Claude is not authorized to invoke abandon-plan.sh.

abandon-plan.sh is a USER-ONLY mechanism. The user reads the active plan,
decides whether to abandon it, and runs the script themselves from their
own prompt.

If you genuinely believe the active plan is impossible or wrong:
  1. STOP this command.
  2. Present concrete evidence to the user:
     - What the success_check is and why it cannot be met
     - What workspace-level decision is required
     - What changes the plan to make it tractable
  3. Wait for the user to either:
     - Run abandon-plan.sh themselves (with a reason they choose), or
     - Tell you to proceed despite the obstacle

DO NOT propose abandonment as an "easy way out" of a hard grind. The
binding contract from the active-plan marker is the point — your job is
to satisfy the success_check, not to argue your way out of it.
EOF
  exit 2
fi

exit 0
