#!/usr/bin/env bash
# PreToolUse hook for Edit/Write: detects self-reverts within the same session.
#
# Logs every Edit/Write to .claude/edit-history.jsonl with timestamp + file +
# old_string hash + new_string hash.
#
# On each new edit, scans the last 50 entries for the same file. If the
# proposed new_string equals an old_string from a recent entry (i.e., the
# previous Edit's "old" === this Edit's "new"), the user is reverting work.
# This is a strong signal of thrashing.
#
# Limit: 1 self-revert per file is allowed (legitimate "oops, undo"). Two
# self-reverts on the same file within 20 entries → block with message
# "You are thrashing. Stop. Present findings to user."
#
# Override: user creates `.claude/approved-revert` (any content); the hook
# allows ONE revert and consumes the marker.

set -uo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
OLD_STRING=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // .tool_input.content // empty')

if [[ -z "$FILE" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HISTORY="$REPO_ROOT/.claude/edit-history.jsonl"
APPROVAL_MARKER="$REPO_ROOT/.claude/approved-revert"

# Hash helpers — use first 32 chars of sha256
OLD_HASH=$(printf '%s' "$OLD_STRING" | shasum -a 256 | cut -c1-32)
NEW_HASH=$(printf '%s' "$NEW_STRING" | shasum -a 256 | cut -c1-32)

# Touch the history file so it exists
mkdir -p "$(dirname "$HISTORY")"
touch "$HISTORY"

# Approval consumption
if [[ -f "$APPROVAL_MARKER" ]]; then
  rm -f "$APPROVAL_MARKER"
  # Still log this edit
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  jq -nc \
    --arg ts "$TS" --arg file "$FILE" --arg old "$OLD_HASH" --arg new "$NEW_HASH" \
    '{ts: $ts, file: $file, old_hash: $old, new_hash: $new}' >> "$HISTORY"
  exit 0
fi

# Scan last 50 entries of history for self-reverts.
# Detection: count entries on the SAME file where `new_hash` matches a
# previous `new_hash` (we've already written this exact content before)
# OR where `old_hash` matches the proposed `new_hash` (we're undoing a
# previous edit). 2+ such matches = thrashing.
REVERT_COUNT=0
MATCHES=$(tail -50 "$HISTORY" 2>/dev/null | jq -r --arg file "$FILE" --arg new "$NEW_HASH" \
  'select(.file == $file and (.old_hash == $new or .new_hash == $new)) | .ts' 2>/dev/null || true)

if [[ -n "$MATCHES" ]]; then
  REVERT_COUNT=$(echo "$MATCHES" | wc -l | tr -d '[:space:]')
fi

# Log THIS edit regardless
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
jq -nc \
  --arg ts "$TS" --arg file "$FILE" --arg old "$OLD_HASH" --arg new "$NEW_HASH" \
  '{ts: $ts, file: $file, old_hash: $old, new_hash: $new}' >> "$HISTORY"

# Block on 2nd or later revert
if [[ "$REVERT_COUNT" -ge 2 ]]; then
  cat <<EOF >&2
⛔ BLOCKED: Self-revert thrashing detected on $FILE.

You have reverted your own changes to this file $REVERT_COUNT times in
the recent history (.claude/edit-history.jsonl). This is a strong
indicator of thrashing — script-script-revert-script cycles are exactly
what your prior session-failure-mode #4 (token-cost aversion → bulk
shortcuts → break → revert) produces.

STOP. Do not proceed with another script-based attempt.

Required next step:
  1. Read the file fully to understand the current state.
  2. Present a per-site Edit plan to the user.
  3. Wait for explicit approval.
  4. Execute per-site only.

To override (user only):
  touch .claude/approved-revert
EOF
  exit 2
fi

exit 0
