#!/usr/bin/env bash
# Background Haiku auto-fix worker.
#
# Spawned by post-edit-format-lint.sh AFTER mechanical autofix has run, when
# residual single-file diagnostics remain that need LLM judgment to fix
# (e.g. no-await-in-loop, no-non-null-assertion). Runs in the background so
# the user's Edit returns immediately — Haiku polishes in parallel with the
# next response generation.
#
# Args:
#   $1 — absolute file path
#   $2 — expected mtime at spawn time (epoch sec) — used in race detection
#
# Always exits 0 (any failure is logged + abandoned, never propagated).
#
# Required commands: claude (Claude Code CLI), jq, shasum, flock, stat, sed.
# Optional: timeout (GNU coreutils). Worker degrades gracefully without it.
#
# Environment:
#   CLAUDE_HOOK_BYPASS=1   — skip everything (general bypass)
#   CLAUDE_NO_HAIKU=1      — skip Haiku worker only
#   CLAUDE_HAIKU_FAKE=...  — for tests: path to a fake `claude` binary
#
# Logs to: $PROJECT_DIR/.claude/.haiku-queue/log

set -uo pipefail

FILE_PATH="${1:-}"
EXPECTED_MTIME="${2:-}"

if [[ -z "$FILE_PATH" || -z "$EXPECTED_MTIME" ]]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || echo /tmp)}"
QUEUE_DIR="$PROJECT_DIR/.claude/.haiku-queue"
LOG_FILE="$QUEUE_DIR/log"
mkdir -p "$QUEUE_DIR"

log() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [$$] $1" >>"$LOG_FILE"
}

# ── Bypass paths ────────────────────────────────────────────────────────────
if [[ "${CLAUDE_HOOK_BYPASS:-}" == "1" ]] || [[ "${CLAUDE_NO_HAIKU:-}" == "1" ]]; then
  exit 0
fi

# Resolve claude binary (test override first, then PATH)
CLAUDE_BIN="${CLAUDE_HAIKU_FAKE:-claude}"
if ! command -v "$CLAUDE_BIN" >/dev/null 2>&1; then
  log "skip(no-claude-cli) $FILE_PATH"
  exit 0
fi

# Resolve resist-lint
RESIST_LINT="$PROJECT_DIR/node_modules/.bin/resist-lint"
if [[ ! -x "$RESIST_LINT" ]]; then
  log "skip(no-resist-lint) $FILE_PATH"
  exit 0
fi

# ── Portable timeout helper ────────────────────────────────────────────────
# Uses GNU `timeout` if available, else falls back to a bash kill-watchdog.
run_with_timeout() {
  local secs="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
  else
    "$@" &
    local pid=$!
    (sleep "$secs" && kill -TERM "$pid" 2>/dev/null) &
    local wd=$!
    wait "$pid"
    local code=$?
    kill "$wd" 2>/dev/null
    return $code
  fi
}

get_mtime() {
  stat -f '%m' "$1" 2>/dev/null || stat -c '%Y' "$1" 2>/dev/null || echo 0
}

# ── Per-file lock with bounded wait (15s) ──────────────────────────────────
# Portable across macOS/Linux: `mkdir` is atomic on POSIX (O_EXCL semantics)
# whereas `flock` ships only on Linux by default. Stale locks (>120s old) are
# treated as abandoned and stolen.
LOCK_KEY=$(echo "$FILE_PATH" | shasum -a 256 | cut -c1-16)
LOCK_DIR="$QUEUE_DIR/$LOCK_KEY.lock"
LOCK_AGE_LIMIT=120  # seconds — older lock dirs are presumed dead
ATTEMPTS=0
while true; do
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    break
  fi
  # Lock exists — check age. If stale, steal it.
  if [[ -d "$LOCK_DIR" ]]; then
    LOCK_AGE_S=$(( $(date +%s) - $(get_mtime "$LOCK_DIR") ))
    if [[ "$LOCK_AGE_S" -gt "$LOCK_AGE_LIMIT" ]]; then
      log "steal(stale-lock age=${LOCK_AGE_S}s) $FILE_PATH"
      rmdir "$LOCK_DIR" 2>/dev/null
      continue
    fi
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  if [[ "$ATTEMPTS" -ge 15 ]]; then
    log "skip(lock-timeout) $FILE_PATH"
    exit 0
  fi
  sleep 1
done
# Always release lock on exit
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

# ── Race check 1: file unchanged since spawn? ───────────────────────────────
# After waiting for the lock, the file MAY have changed (another edit landed).
# That's fine — we re-baseline to current mtime here. Only abandon if mtime
# changes AGAIN during our Haiku call (race check 2).
CURRENT_MTIME=$(get_mtime "$FILE_PATH")
if [[ ! -f "$FILE_PATH" ]]; then
  log "skip(file-deleted) $FILE_PATH"
  exit 0
fi
BASELINE_MTIME="$CURRENT_MTIME"

# ── Get current diagnostics on this file ────────────────────────────────────
# resist-lint --tools --json may emit multiple JSON arrays (one per tool);
# slurp + flatten into a single array before counting.
RAW_JSON=$("$RESIST_LINT" --tools --json "$FILE_PATH" 2>/dev/null || echo '[]')
DIAG_JSON=$(echo "$RAW_JSON" | jq -s 'add // []' 2>/dev/null || echo '[]')
DIAG_COUNT=$(echo "$DIAG_JSON" | jq 'length' 2>/dev/null || echo 0)
[[ "$DIAG_COUNT" =~ ^[0-9]+$ ]] || DIAG_COUNT=0

if [[ "$DIAG_COUNT" -eq 0 ]]; then
  log "noop(already-clean) $FILE_PATH"
  exit 0
fi

# Cross-file safety: only proceed if every diagnostic is for THIS file.
# Cross-file cascades require multi-file context Haiku can't deliver here.
# resist-lint emits paths as workspace-relative; compare both forms.
REL_PATH="${FILE_PATH#$PROJECT_DIR/}"
EXTERNAL_COUNT=$(echo "$DIAG_JSON" | jq --arg abs "$FILE_PATH" --arg rel "$REL_PATH" \
  '[.[] | select(.file != $abs and .file != $rel)] | length' 2>/dev/null || echo 0)
[[ "$EXTERNAL_COUNT" =~ ^[0-9]+$ ]] || EXTERNAL_COUNT=0
if [[ "$EXTERNAL_COUNT" -gt 0 ]]; then
  log "skip(cross-file-cascade external=$EXTERNAL_COUNT) $FILE_PATH"
  exit 0
fi

# ── Build Haiku prompt ──────────────────────────────────────────────────────
DIAGS_TEXT=$(echo "$DIAG_JSON" | jq -r '.[] | "Line \(.line):\(.column) [\(.ruleId)] \(.message)"' | head -20)
FILE_BYTES=$(wc -c <"$FILE_PATH" | tr -d ' ')
FILE_CONTENT=$(cat "$FILE_PATH")

SYSTEM_PROMPT="You are a precise code fixer. Apply the smallest changes that resolve every listed lint diagnostic. Preserve all unrelated code, comments, imports, and whitespace exactly. Do not refactor. Do not add explanations. Output ONLY the entire corrected file content with no markdown fences, no prose, no preamble, no postamble."

USER_PROMPT="File path: $FILE_PATH

Diagnostics to fix:
$DIAGS_TEXT

Current file content (between <FILE> and </FILE> tags):
<FILE>
$FILE_CONTENT
</FILE>

Output the corrected file content only."

# Empty MCP config (avoid loading project's MCP servers in subprocess)
EMPTY_MCP="$QUEUE_DIR/empty-mcp.json"
if [[ ! -f "$EMPTY_MCP" ]]; then
  echo '{"mcpServers":{}}' >"$EMPTY_MCP"
fi

# ── Call Haiku (30s timeout) ────────────────────────────────────────────────
HAIKU_START=$(date +%s)
HAIKU_OUTPUT=$(run_with_timeout 30 "$CLAUDE_BIN" -p \
  --model claude-haiku-4-5 \
  --max-turns 1 \
  --strict-mcp-config --mcp-config "$EMPTY_MCP" \
  --setting-sources '' \
  --tools '' \
  --no-session-persistence \
  --system-prompt "$SYSTEM_PROMPT" \
  "$USER_PROMPT" 2>>"$LOG_FILE")
HAIKU_EXIT=$?
HAIKU_DUR=$(($(date +%s) - HAIKU_START))

if [[ $HAIKU_EXIT -ne 0 ]]; then
  log "skip(haiku-exit=$HAIKU_EXIT dur=${HAIKU_DUR}s) $FILE_PATH"
  exit 0
fi

if [[ -z "$HAIKU_OUTPUT" ]]; then
  log "skip(haiku-empty-output dur=${HAIKU_DUR}s) $FILE_PATH"
  exit 0
fi

# Strip markdown fences if Haiku slipped any in despite instructions.
FIXED_CONTENT=$(echo "$HAIKU_OUTPUT" | sed -E '/^[[:space:]]*```/d')

# ── Validation gate: output size sane (>= 50% of original) ──────────────────
FIXED_BYTES=$(echo "$FIXED_CONTENT" | wc -c | tr -d ' ')
MIN_BYTES=$((FILE_BYTES / 2))
if [[ "$FIXED_BYTES" -lt "$MIN_BYTES" ]]; then
  log "skip(too-short orig=$FILE_BYTES fixed=$FIXED_BYTES) $FILE_PATH"
  exit 0
fi

# ── Race check 2: file unchanged during Haiku call? ─────────────────────────
CURRENT_MTIME=$(get_mtime "$FILE_PATH")
if [[ "$CURRENT_MTIME" != "$BASELINE_MTIME" ]]; then
  log "skip(mtime-changed-mid-fix baseline=$BASELINE_MTIME current=$CURRENT_MTIME) $FILE_PATH"
  exit 0
fi

# ── Validation gate: diff size sane (≤ 6 lines per diagnostic) ─────────────
ORIGINAL_LINES=$(wc -l <"$FILE_PATH" | tr -d ' ')
FIXED_LINES=$(echo "$FIXED_CONTENT" | wc -l | tr -d ' ')
if [[ "$FIXED_LINES" -gt "$ORIGINAL_LINES" ]]; then
  LINE_DELTA=$((FIXED_LINES - ORIGINAL_LINES))
else
  LINE_DELTA=$((ORIGINAL_LINES - FIXED_LINES))
fi
MAX_DELTA=$((DIAG_COUNT * 6))
if [[ "$LINE_DELTA" -gt "$MAX_DELTA" ]]; then
  log "skip(diff-too-big delta=$LINE_DELTA max=$MAX_DELTA) $FILE_PATH"
  exit 0
fi

# ── Apply fix with backup ───────────────────────────────────────────────────
BACKUP="$FILE_PATH.haiku-bak-$$"
cp "$FILE_PATH" "$BACKUP"
# Preserve byte-exact trailing-newline behavior so file hashes are stable.
if [[ "${FIXED_CONTENT: -1}" == $'\n' ]]; then
  printf '%s' "$FIXED_CONTENT" >"$FILE_PATH"
else
  printf '%s\n' "$FIXED_CONTENT" >"$FILE_PATH"
fi

# ── Validation gate: lint count actually decreased ──────────────────────────
NEW_RAW=$("$RESIST_LINT" --tools --json "$FILE_PATH" 2>/dev/null || echo '[]')
NEW_DIAG_JSON=$(echo "$NEW_RAW" | jq -s 'add // []' 2>/dev/null || echo '[]')
NEW_DIAG_COUNT=$(echo "$NEW_DIAG_JSON" | jq 'length' 2>/dev/null || echo 999)
[[ "$NEW_DIAG_COUNT" =~ ^[0-9]+$ ]] || NEW_DIAG_COUNT=999

if [[ "$NEW_DIAG_COUNT" -ge "$DIAG_COUNT" ]]; then
  mv "$BACKUP" "$FILE_PATH"
  log "revert(no-improvement old=$DIAG_COUNT new=$NEW_DIAG_COUNT dur=${HAIKU_DUR}s) $FILE_PATH"
  exit 0
fi

# ── Success ────────────────────────────────────────────────────────────────
rm -f "$BACKUP"
log "FIXED $((DIAG_COUNT - NEW_DIAG_COUNT))/$DIAG_COUNT (remaining=$NEW_DIAG_COUNT dur=${HAIKU_DUR}s) $FILE_PATH"
exit 0
