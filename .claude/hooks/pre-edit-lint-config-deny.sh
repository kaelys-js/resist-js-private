#!/usr/bin/env bash
# PreToolUse hook for Edit/Write: blocks lint-rule disables without explicit user approval.
#
# Triggers when Claude attempts to:
#   1. Add a new "off" rule entry to .oxlintrc.json
#   2. Add a new "files: [...]" override block to .oxlintrc.json
#   3. Add diagnostic-suppression code to lint runner sources
#      (tools/oxlint.ts, tools/svelte-check.ts, tools/tsgo.ts, tools/*.ts)
#
# Override mechanism: user creates `.claude/approved-lint-disable` (any content);
# the hook then allows ONE such edit and deletes the marker.

set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')

# No file path — nothing to check
if [[ -z "$FILE" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APPROVAL_MARKER="$REPO_ROOT/.claude/approved-lint-disable"

# Check approval marker — if present, allow this edit and remove the marker.
if [[ -f "$APPROVAL_MARKER" ]]; then
  rm -f "$APPROVAL_MARKER"
  exit 0
fi

# Determine if this is a sensitive lint-config file
SENSITIVE=false
case "$FILE" in
  */.oxlintrc.json|*/.oxlintrc|*/biome.json|*/biome.base.json)
    SENSITIVE=true
    ;;
  */lint/src/tools/oxlint.ts|*/lint/src/tools/svelte-check.ts|*/lint/src/tools/tsgo.ts|*/lint/src/framework/oxc-runner.ts)
    SENSITIVE=true
    ;;
esac

if [[ "$SENSITIVE" != "true" ]]; then
  exit 0
fi

# Inspect the proposed new content for disable patterns
BLOCKED_REASON=""

# Pattern 1: adding `"<rule-name>": "off"` to a rules object
if echo "$NEW_STRING" | grep -qE '"[^"]+":\s*"off"'; then
  BLOCKED_REASON="adds a rule disable (\"<rule>\": \"off\")"
fi

# Pattern 2: adding a new files override block
if echo "$NEW_STRING" | grep -qE '"files"\s*:\s*\['; then
  BLOCKED_REASON="adds a new \"files\": [...] override block"
fi

# Pattern 3: adding regex-based diagnostic suppression to runners
if echo "$NEW_STRING" | grep -qE 'PARSE_SUPPRESSION|continue;.*svelte\.d\.ts|skipFile|suppressDiagnostic'; then
  BLOCKED_REASON="adds diagnostic-suppression logic to a lint runner"
fi

if [[ -n "$BLOCKED_REASON" ]]; then
  cat <<EOF >&2
⛔ BLOCKED: Lint-rule disable detected ($BLOCKED_REASON) in $FILE.

Per the approved-plan binding contract, you may NOT add lint-rule disables
or scope extensions without explicit user approval at the moment of the edit.

If this disable is genuinely justified:
  1. STOP this edit.
  2. Ask the user explicitly:
     "May I add <rule-name> override to <file> for files matching <glob>?
      Justification: <one sentence>."
  3. Wait for the user to respond and create the marker:
     touch .claude/approved-lint-disable
  4. Then retry the edit. The marker will be consumed (removed) automatically.

DO NOT rationalize this as "matches existing precedent." The user reads every
disable as a weakening of assertions and they have explicitly forbidden it
without per-instance approval.
EOF
  exit 2
fi

exit 0
