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
  echo "⛔ abandon-plan.sh is USER-ONLY. Present evidence to user and let them decide." >&2
  exit 2
fi

exit 0
