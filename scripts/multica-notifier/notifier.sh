#!/usr/bin/env bash
# multica-notifier — bridges Multica events to ntfy.sh + macOS notifications
#
# Polls the Multica Inbox API every POLL_INTERVAL seconds and tails the local
# multica daemon log (~/.multica/daemon.log). Each new event becomes:
#   - one ntfy push to NTFY_TOPIC (if NTFY_TOPIC set)
#   - one macOS native notification (if MACOS_NOTIFY=true)
#
# State (last-seen IDs, last log offset) lives in ~/.multica/notifier-state.json
# so events fire exactly once across restarts.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Load config -------------------------------------------------------------
ENV_FILE="${MULTICA_NOTIFIER_ENV:-$SCRIPT_DIR/.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example and fill it in." >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

: "${MULTICA_API_TOKEN:?MULTICA_API_TOKEN not set in $ENV_FILE}"
: "${MULTICA_API_BASE:=http://localhost:8080}"
: "${MULTICA_WORKSPACE_SLUG:=resist-js}"
: "${MULTICA_APP_BASE:=http://localhost:3000}"
: "${POLL_INTERVAL:=15}"
: "${MACOS_NOTIFY:=false}"
: "${NTFY_BASE:=https://ntfy.sh}"
: "${DAEMON_LOG:=$HOME/.multica/daemon.log}"

STATE_DIR="$HOME/.multica"
STATE_FILE="$STATE_DIR/notifier-state.json"
LOG_FILE="${MULTICA_NOTIFIER_LOG:-$HOME/Library/Logs/multica-notifier.log}"

mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")"

if [[ ! -f "$STATE_FILE" ]]; then
  echo '{"last_inbox_id":null,"last_log_offset":0}' > "$STATE_FILE"
fi

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG_FILE"; }
log "=== notifier starting (pid=$$, poll=${POLL_INTERVAL}s, ntfy=${NTFY_TOPIC:-(none)}, macos=$MACOS_NOTIFY) ==="

# --- Notification dispatchers -----------------------------------------------
push_ntfy() {
  local title="$1" body="$2" priority="${3:-default}" click_url="${4:-}"
  [[ -z "${NTFY_TOPIC:-}" ]] && return 0
  local args=(-s -X POST "$NTFY_BASE/$NTFY_TOPIC" \
    -H "Title: $title" -H "Priority: $priority" -H "Tags: multica" \
    -d "$body")
  [[ -n "$click_url" ]] && args+=(-H "Click: $click_url")
  curl "${args[@]}" >/dev/null 2>&1 || log "ntfy push failed: $title"
}

push_macos() {
  local title="$1" subtitle="$2" body="$3"
  [[ "$MACOS_NOTIFY" != "true" ]] && return 0
  # Escape double-quotes and backslashes for AppleScript
  local b="${body//\\/\\\\}"; b="${b//\"/\\\"}"
  local s="${subtitle//\\/\\\\}"; s="${s//\"/\\\"}"
  local t="${title//\\/\\\\}"; t="${t//\"/\\\"}"
  osascript -e "display notification \"$b\" with title \"$t\" subtitle \"$s\"" 2>/dev/null \
    || log "macos notification failed: $title"
}

dispatch() {
  local title="$1" subtitle="$2" body="$3" priority="${4:-default}" click_url="${5:-}"
  push_ntfy "$title · $subtitle" "$body" "$priority" "$click_url"
  push_macos "$title" "$subtitle" "$body"
}

# --- Inbox poller ------------------------------------------------------------
# Tries /api/inbox first; falls back to other plausible endpoints if 404.
poll_inbox() {
  local last_id
  last_id=$(jq -r '.last_inbox_id // empty' "$STATE_FILE")

  local url="$MULTICA_API_BASE/api/inbox"
  local resp
  resp=$(curl -sS --max-time 10 \
    -H "Authorization: Bearer $MULTICA_API_TOKEN" \
    -H "Accept: application/json" \
    "$url" 2>&1) || { log "inbox fetch failed: $resp"; return 1; }

  # Skip on non-JSON or empty
  if ! echo "$resp" | jq empty 2>/dev/null; then
    log "inbox returned non-JSON: ${resp:0:120}"
    return 1
  fi

  # Extract notifications array — the field name varies by API version
  local items
  items=$(echo "$resp" | jq -c '.notifications // .items // .data // []')
  local count
  count=$(echo "$items" | jq 'length')
  [[ "$count" == "0" ]] && return 0

  # Process newest-first, stop at last_id
  local new_last="$last_id"
  while IFS= read -r item; do
    local id title body kind issue_id workspace
    id=$(echo "$item" | jq -r '.id // empty')
    [[ -z "$id" ]] && continue
    if [[ -n "$last_id" && "$id" == "$last_id" ]]; then
      break
    fi
    title=$(echo "$item" | jq -r '.title // .subject // .kind // "Multica notification"')
    body=$(echo "$item" | jq -r '.body // .summary // .message // ""' | head -c 280)
    kind=$(echo "$item" | jq -r '.type // .kind // "event"')
    issue_id=$(echo "$item" | jq -r '.issue_id // .target_id // empty')
    workspace=$(echo "$item" | jq -r '.workspace_slug // empty')

    local click=""
    if [[ -n "$issue_id" ]]; then
      click="$MULTICA_APP_BASE/${workspace:-$MULTICA_WORKSPACE_SLUG}/issues/$issue_id"
    fi

    local pri="default"
    case "$kind" in
      *fail*|*error*|*blocked*) pri="high" ;;
      *mention*) pri="high" ;;
    esac

    dispatch "Multica" "$kind" "${title}: ${body}" "$pri" "$click"

    [[ -z "$new_last" ]] && new_last="$id"
  done < <(echo "$items" | jq -c '.[]')

  # Update state if new_last changed
  if [[ "$new_last" != "$last_id" ]]; then
    jq --arg v "$new_last" '.last_inbox_id = $v' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
  fi
}

# --- Daemon log tailer (terminal events not in inbox) ------------------------
poll_daemon_log() {
  [[ ! -f "$DAEMON_LOG" ]] && return 0
  local last_offset
  last_offset=$(jq -r '.last_log_offset // 0' "$STATE_FILE")
  local size
  size=$(wc -c < "$DAEMON_LOG" | tr -d ' ')
  if (( size < last_offset )); then
    # Log was rotated/truncated; reset
    last_offset=0
  fi
  if (( size == last_offset )); then
    return 0
  fi

  local new_lines
  new_lines=$(tail -c "+$((last_offset + 1))" "$DAEMON_LOG" 2>/dev/null || true)
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    case "$line" in
      *"agent finished"*"status=completed"*)
        local task_id
        task_id=$(echo "$line" | grep -oE 'task=[a-f0-9]+' | head -1 | cut -d= -f2)
        dispatch "Multica" "task completed" "task $task_id finished" "default"
        ;;
      *"agent finished"*"status=failed"*)
        local task_id
        task_id=$(echo "$line" | grep -oE 'task=[a-f0-9]+' | head -1 | cut -d= -f2)
        dispatch "Multica" "task FAILED" "task $task_id failed — check inbox" "high"
        ;;
      *"agent finished"*"status=timeout"*)
        local task_id
        task_id=$(echo "$line" | grep -oE 'task=[a-f0-9]+' | head -1 | cut -d= -f2)
        dispatch "Multica" "task timeout" "task $task_id hit time limit" "high"
        ;;
      *"runtime registered"*)
        dispatch "Multica" "runtime online" "a runtime came online" "low"
        ;;
      *"runtime deregistered"*|*"daemon disconnect"*)
        dispatch "Multica" "runtime offline" "a runtime went offline" "high"
        ;;
    esac
  done <<< "$new_lines"

  jq --arg v "$size" '.last_log_offset = ($v | tonumber)' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
}

# --- Main loop --------------------------------------------------------------
trap 'log "=== notifier stopping ==="; exit 0' INT TERM

while true; do
  poll_inbox || true
  poll_daemon_log || true
  sleep "$POLL_INTERVAL"
done
