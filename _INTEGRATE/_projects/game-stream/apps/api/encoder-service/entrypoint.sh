#!/bin/bash
# Enforce strict error handling
set -euo pipefail

# ----------------------------------------------------------------------
# Source external logging utility or fallback to internal logger
# ----------------------------------------------------------------------
if [[ -f /usr/local/bin/log.sh ]]; then
  source /usr/local/bin/log.sh
else
  log() {
    local level="$1"
    shift
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local out="[%s] [%s] %s\n"
    if [[ "$level" == "ERROR" ]]; then
      printf "$out" "$timestamp" "$level" "$*" >&2
    else
      printf "$out" "$timestamp" "$level" "$*"
    fi
  }
  log INFO "⚠️ Fallback logger in use; log.sh not found."
fi

# ----------------------------------------------------------------------
# Graceful shutdown
# ----------------------------------------------------------------------
shutdown() {
  log INFO "🛑 Received termination signal or shutdown"
  if [[ -n "${FFMPEG_PID:-}" ]]; then
    if kill -0 "$FFMPEG_PID" 2>/dev/null; then
      kill -TERM "$FFMPEG_PID" 2>/dev/null || true
      wait "$FFMPEG_PID" 2>/dev/null || true
    fi
    unset FFMPEG_PID
  fi
}
trap shutdown SIGINT SIGTERM EXIT

# ----------------------------------------------------------------------
# Validate required commands
# ----------------------------------------------------------------------
REQUIRED_CMDS=(pactl ffmpeg xdpyinfo bc awk tee seq)
for cmd in "${REQUIRED_CMDS[@]}"; do
  if ! type -P "$cmd" >/dev/null 2>&1; then
    log ERROR "❌ Required command '$cmd' not found. Please install it."
    exit 1
  fi
done

# ----------------------------------------------------------------------
# Log known non-sensitive environment variables
# ----------------------------------------------------------------------
log INFO "🚀 Container startup - logging environment variables"

required_vars=(
  AUDIO_SERVER_SOCKET DISPLAY ENCODER_AUDIO_BITRATE ENCODER_FPS ENCODER_RESOLUTION
  ENCODER_THREADS ENCODER_VIDEO_BITRATE LIVEKIT_HOST LIVEKIT_RTP_PORT XDG_RUNTIME_DIR
)

for var in "${required_vars[@]}"; do
  if [[ -v $var && -n "${!var}" ]]; then
    log INFO "ENV ${var}=${!var}"
  else
    log INFO "ENV ${var}=<unset>"
    log ERROR "❌ Environment variable $var is not set. Cannot proceed."
    exit 1
  fi
done

# Optional: check network reachability
if ! ping -c 1 -W 2 "$LIVEKIT_HOST" >/dev/null 2>&1; then
  log ERROR "❌ Cannot reach LIVEKIT_HOST ($LIVEKIT_HOST)"
  exit 1
fi

# Logs an error message and exits the script.
# Usage: log_error_and_exit "Message"
log_error_and_exit() {
  log ERROR "❌ $1"
  exit 1
}

# Ensures a variable is set (non-empty). Exits with an error if not.
# Usage: require_var_set "VAR_NAME" "$VAR_VALUE"
require_var_set() {
  [[ -n "$2" ]] || log_error_and_exit "$1 must be set"
}

# Validates a value against a regular expression pattern.
# Exits with an error if the value doesn't match.
# Usage: validate_regex "Error message" "$value" "$pattern"
validate_regex() {
  local message="$1"
  local value="$2"
  local pattern="$3"
  [[ "$value" =~ $pattern ]] || log_error_and_exit "$message"
}

# Validates a AUDIO_SERVER_SOCKET variable is in the correct format and the socket exists.
# Format: unix:/path/to/socket
# Usage: validate_socket "$AUDIO_SERVER_SOCKET" "AUDIO_SERVER_SOCKET"
validate_socket() {
  local value="$1"
  local name="$2"

  # Ensure it starts with 'unix:'
  [[ "$value" =~ ^unix:.+ ]] || log_error_and_exit "$name must start with 'unix:' and be a valid path"

  # Extract the path part and check the socket exists
  local path="${value#unix:}"
  [[ -S "$path" ]] || log_error_and_exit "Audio server socket not found at: $path"
}

# Validates that a numeric value is within an inclusive range.
# Usage: validate_range "$value" min max "Error message"
validate_range() {
  local val="$1" min="$2" max="$3" msg="$4"

  # Ensure it's a number and within range
  [[ "$val" =~ ^[0-9]+$ && "$val" -ge "$min" && "$val" -le "$max" ]] || log_error_and_exit "$msg"
}

# Validates that a directory exists and is writable.
# Usage: validate_dir_writable "$path" "VAR_NAME"
validate_dir_writable() {
  [[ -d "$1" && -w "$1" ]] || log_error_and_exit "$2 must be a writable directory"
}

# Required variable checks
require_var_set "AUDIO_SERVER_SOCKET" "$AUDIO_SERVER_SOCKET"
require_var_set "DISPLAY" "$DISPLAY"
require_var_set "ENCODER_AUDIO_BITRATE" "$ENCODER_AUDIO_BITRATE"
require_var_set "ENCODER_VIDEO_BITRATE" "$ENCODER_VIDEO_BITRATE"
require_var_set "ENCODER_FPS" "$ENCODER_FPS"
require_var_set "ENCODER_RESOLUTION" "$ENCODER_RESOLUTION"
require_var_set "ENCODER_THREADS" "$ENCODER_THREADS"
require_var_set "LIVEKIT_HOST" "$LIVEKIT_HOST"
require_var_set "LIVEKIT_RTP_PORT" "$LIVEKIT_RTP_PORT"
require_var_set "XDG_RUNTIME_DIR" "$XDG_RUNTIME_DIR"

# Validations
validate_socket "$AUDIO_SERVER_SOCKET" "AUDIO_SERVER_SOCKET"
validate_regex "DISPLAY must be in the form :N (e.g. :0)" "$DISPLAY" '^:[0-9]+$'
validate_regex "ENCODER_AUDIO_BITRATE must be in the format '<number>k' (e.g. 128k)" "$ENCODER_AUDIO_BITRATE" '^[0-9]+k$'
validate_regex "ENCODER_VIDEO_BITRATE must be in the format '<number>k' (e.g. 2500k)" "$ENCODER_VIDEO_BITRATE" '^[0-9]+k$'
validate_range "$ENCODER_FPS" 1 60 "ENCODER_FPS must be an integer between 1 and 60"
validate_regex "ENCODER_RESOLUTION must be in the format WIDTHxHEIGHT (e.g. 1280x720)" "$ENCODER_RESOLUTION" '^[0-9]+x[0-9]+$'
validate_regex "ENCODER_THREADS must be a positive integer" "$ENCODER_THREADS" '^[1-9][0-9]*$'
validate_regex "Invalid LIVEKIT_HOST value: $LIVEKIT_HOST" "$LIVEKIT_HOST" '^[a-zA-Z0-9._-]+$'
validate_range "$LIVEKIT_RTP_PORT" 1024 65535 "LIVEKIT_RTP_PORT must be between 1024–65535"
validate_dir_writable "$XDG_RUNTIME_DIR" "XDG_RUNTIME_DIR"

# ----------------------------------------------------------------------
# Retry utility for waiting on services
# retry_wait(name, cmd, max_tries, delay)
# ----------------------------------------------------------------------
retry_wait() {
  local name="$1"
  local cmd="$2"
  local max_tries="${3:-20}"
  local delay="${4:-0.5}"

  log INFO "⏳ Waiting for $name to be ready..."

  for i in $(seq 1 "$max_tries"); do
    if eval "$cmd"; then
      log INFO "✅ $name is ready"
      return 0
    fi
    log DEBUG "Retry $i/$max_tries for $name..."
    local sleep_time
    sleep_time=$(echo "$delay * $i" | bc 2>/dev/null || echo "0.5")
    sleep "${sleep_time:-0.5}"
  done

  local total_time
  total_time=$(echo "$max_tries * $delay" | bc 2>/dev/null || echo "$((max_tries / 2))")
  log ERROR "❌ $name did not become ready after ${total_time}s"
  return 1
}

# ----------------------------------------------------------------------
# Log system setup
# ----------------------------------------------------------------------
log INFO "📺 Starting encoder"
log INFO "🖥️ Display server: DISPLAY=$DISPLAY"
log INFO "🔊 Audio server: AUDIO_SERVER_SOCKET=$AUDIO_SERVER_SOCKET"
log INFO "📡 Streaming to: rtp://${LIVEKIT_HOST}:${LIVEKIT_RTP_PORT}"

# ----------------------------------------------------------------------
# Wait for Display and Audio server
# ----------------------------------------------------------------------
retry_wait "Display server" "xdpyinfo -display \"$DISPLAY\" >/dev/null 2>&1" || exit 1
retry_wait "Audio server" "AUDIO_SERVER_SOCKET=\"$AUDIO_SERVER_SOCKET\" pactl info >/dev/null 2>&1" || exit 1

# ----------------------------------------------------------------------
# Detect monitor audio source
# ----------------------------------------------------------------------
log INFO "🔍 Detecting monitor audio source..."
AUDIO_SOURCE=$(AUDIO_SERVER_SOCKET="$AUDIO_SERVER_SOCKET" pactl list short sources | awk '/\.monitor/ {print $2; exit}')
if [[ -z "$AUDIO_SOURCE" ]]; then
  log ERROR "❌ No Audio monitor source found. Cannot capture audio."
  exit 1
fi
log INFO "🎤 Using monitor audio source: $AUDIO_SOURCE"

log INFO "🎛️ FFmpeg Configuration: {
  \"display\": \"$DISPLAY\",
  \"audio_source\": \"$AUDIO_SOURCE\",
  \"fps\": \"$ENCODER_FPS\",
  \"resolution\": \"$ENCODER_RESOLUTION\",
  \"video_bitrate\": \"$ENCODER_VIDEO_BITRATE\",
  \"audio_bitrate\": \"$ENCODER_AUDIO_BITRATE\",
  \"threads\": \"$ENCODER_THREADS\"
}"

# ----------------------------------------------------------------------
# Prepare FFmpeg log file
# ----------------------------------------------------------------------
FFMPEG_LOG="/tmp/ffmpeg-$(date +%s)-$RANDOM.log"
touch "$FFMPEG_LOG" || {
  log ERROR "❌ Unable to write to log file $FFMPEG_LOG"
  exit 1
}

# ----------------------------------------------------------------------
# Launch FFmpeg
# ----------------------------------------------------------------------
(
  ffmpeg \
    -f x11grab -r "$FPS" -s "$ENCODER_RESOLUTION" -draw_mouse 0 -i "$DISPLAY" \
    -f pulse -ac 2 -i "$AUDIO_SOURCE" \
    -map 0:v -map 1:a \
    -filter:v "fps=$ENCODER_FPS" \
    -c:v libx264 -preset ultrafast -tune zerolatency \
    -g 1 -bf 0 -threads "$ENCODER_THREADS" \
    -max_delay 0 -flags low_delay -fflags nobuffer \
    -b:v "$ENCODER_VIDEO_BITRATE" \
    -c:a libopus -application lowdelay -b:a "$ENCODER_AUDIO_BITRATE" \
    -probesize 50M -analyzeduration 100M \
    -f rtp "rtp://${LIVEKIT_HOST}:${LIVEKIT_RTP_PORT}" \
  2>&1 | tee "$FFMPEG_LOG" | while IFS= read -r line; do
    log INFO "FFmpeg: $line"
  done
) &
FFMPEG_PID=$!

# ----------------------------------------------------------------------
# Wait for FFmpeg to exit
# ----------------------------------------------------------------------
wait "$FFMPEG_PID"
EXIT_CODE=$?
unset FFMPEG_PID

# ----------------------------------------------------------------------
# Exit logging
# ----------------------------------------------------------------------
if [[ $EXIT_CODE -ne 0 ]]; then
  log ERROR "❌ FFmpeg exited with code $EXIT_CODE"
else
  log INFO "✅ FFmpeg exited cleanly"
fi

exit "$EXIT_CODE"