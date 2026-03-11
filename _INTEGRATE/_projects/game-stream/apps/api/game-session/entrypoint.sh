#!/bin/bash
# Enforce strict error handling to prevent silent failures
set -euo pipefail
set -o errtrace

# ----------------------------------------------------------------------
# Load external logging utility if available; fallback to inline logger
# ----------------------------------------------------------------------
if [[ -f /usr/local/bin/log.sh ]]; then
  source /usr/local/bin/log.sh
else
  # Minimal fallback logger if external one is not present
  log() {
    local level="$1"
    shift
    local fmt="[%s] %s\n"
    if [[ "$level" == "ERROR" ]]; then
      printf "$fmt" "$level" "$*" >&2
    else
      printf "$fmt" "$level" "$*"
    fi
  }
  log INFO "⚠️ Fallback logger in use; /usr/local/bin/log.sh not found."
fi

# ----------------------------------------------------------------------
# Log non-sensitive environment variables for diagnostics
# ----------------------------------------------------------------------
log INFO "🚀 Container startup - logging environment variables"

required_vars=(
  CORE GAME GAME_CONFIG GAME_SOCKET_PATH
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

require_var_set "CORE" "$CORE"
validate_regex "CORE must end with '_libretro.so'" "$CORE" '_libretro\.so$'

require_var_set "GAME" "$GAME"
[[ -f "$GAME" ]] || log_error_and_exit "GAME must point to an existing file"

require_var_set "GAME_SOCKET_PATH" "$GAME_SOCKET_PATH"
[[ -S "$GAME_SOCKET_PATH" ]] || log_error_and_exit "GAME_SOCKET_PATH must be a valid UNIX socket"

require_var_set "GAME_CONFIG" "$GAME_CONFIG"
[[ -f "$GAME_CONFIG" ]] || log_error_and_exit "GAME_CONFIG must point to an existing config file"

if [[ -z "${CORE:-}" ]]; then
  log ERROR "❌ CORE is not set."
  exit 1
fi

CORE="/usr/lib/libretro/${CORE}"
if [[ ! -f "$CORE" ]]; then
  log ERROR "❌ Core not found: $CORE"
  exit 1
fi

if [[ -z "${GAME:-}" || ! -f "$GAME" || ! -r "$GAME" ]]; then
  log ERROR "❌ Game file not found or unreadable: $GAME"
  exit 1
fi

# ----------------------------------------------------------------------
# Ensure essential CLI tools and required files exist
# ----------------------------------------------------------------------
REQUIRED_CMDS=(retroarch Xvfb pulseaudio bun)
REQUIRED_BINS=("/usr/local/bin/uinput-helper" "/app/receiver.ts" "/etc/retroarch.cfg")

# Validate required commands are available in PATH
for cmd in "${REQUIRED_CMDS[@]}"; do
  if ! command -v "$cmd" &>/dev/null; then
    log ERROR "❌ Required command not found: $cmd"
    exit 1
  fi
done

# Validate that all required binaries exist and are readable
for bin in "${REQUIRED_BINS[@]}"; do
  if [[ ! -f "$bin" || ! -r "$bin" ]]; then
    log ERROR "❌ Required file missing or unreadable: $bin"
    exit 1
  fi
done

# ----------------------------------------------------------------------
# Set up runtime environment variables with sane defaults
# ----------------------------------------------------------------------
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/xdg}"
mkdir -p "$XDG_RUNTIME_DIR"

export DISPLAY="${DISPLAY:-:1}"
export GAME_SOCKET_PATH="${GAME_SOCKET_PATH:-/tmp/game-session.sock}"

# ----------------------------------------------------------------------
# Cleanup function runs on container exit or interrupt
# ----------------------------------------------------------------------
cleanup() {
  log INFO "🧹 Cleaning up..."

  # Kill background processes if they were started
  [[ -n "${HELPER_PID:-}" ]] && kill "$HELPER_PID" 2>/dev/null || true
  [[ -n "${BUN_PID:-}" ]] && kill "$BUN_PID" 2>/dev/null || true
  [[ -n "${XVFB_PID:-}" ]] && kill "$XVFB_PID" 2>/dev/null || true

  # Stop Audio server and clean its socket if started
  if [[ -n "${AUDIO_STARTED:-}" ]]; then
    pulseaudio --kill 2>/dev/null || true
    rm -rf /tmp/audio-socket
  fi

  wait || true  # Wait for any remaining background jobs
}
trap cleanup EXIT  # Register cleanup on any exit

# ----------------------------------------------------------------------
# Start uinput helper in the background (handles virtual input devices)
# ----------------------------------------------------------------------
log INFO "⚙️  Starting uinput-helper..."
/usr/local/bin/uinput-helper &
HELPER_PID=$!

# ----------------------------------------------------------------------
# Ensure /dev/uinput is present (wait briefly for device node)
# ----------------------------------------------------------------------
for i in {1..5}; do
  [[ -e /dev/uinput ]] && break
  log INFO "⏳ Waiting for /dev/uinput..."
  sleep 0.5
done

if [[ ! -e /dev/uinput ]]; then
  log ERROR "❌ /dev/uinput not available!"
  exit 1
fi

# ----------------------------------------------------------------------
# Start Audio server
# ----------------------------------------------------------------------
log INFO "🔊 Starting Audio server..."

mkdir -p "${AUDIO_SERVER_SOCKET_PATH}"
chmod 777 "${AUDIO_SERVER_SOCKET_PATH}"

# Start Audio server with Unix socket for communication
pulseaudio --start \
  --disallow-exit \
  --exit-idle-time=-1 \
  --no-cpu-limit \
  --log-level=info \
  --log-target=stderr \
  --load="module-native-protocol-unix socket=${AUDIO_SERVER_SOCKET} auth-anonymous=1" || {
    log ERROR "❌ Audio server failed to start"
    exit 1
  }

# Confirm Audio server is healthy
for i in {1..10}; do
  pulseaudio --check && AUDIO_STARTED=true && break
  sleep 0.5
done

if [[ -z "${AUDIO_STARTED:-}" ]]; then
  log ERROR "❌ Audio server failed health check"
  exit 1
fi

# Wait for socket to be created
for i in {1..10}; do
  [[ -S "${AUDIO_SERVER_SOCKET}" ]] && break
  sleep 0.5
done

if [[ ! -S "${AUDIO_SERVER_SOCKET}" ]]; then
  log ERROR "❌ Audio socket not created after timeout!"
  exit 1
fi

log INFO "✅ Audio system ready."

# ----------------------------------------------------------------------
# Launch X virtual framebuffer for headless display support
# ----------------------------------------------------------------------
log INFO "🖥️ Starting Xvfb on DISPLAY=$DISPLAY..."
if [[ -e /tmp/.X1-lock ]]; then
  log WARN "🧹 Removing stale /tmp/.X1-lock..."
  rm -f /tmp/.X1-lock
fi

Xvfb "$DISPLAY" -screen 0 1280x720x24 -shmem &
XVFB_PID=$!
sleep 1

# Ensure Xvfb started successfully
if ! ps -p "$XVFB_PID" &>/dev/null; then
  log ERROR "❌ Xvfb failed to start!"
  exit 1
fi

# ----------------------------------------------------------------------
# Start Bun-based input receiver server (via Bun runtime)
# ----------------------------------------------------------------------
log INFO "🚀 Starting Bun input receiver..."
bun run start &
BUN_PID=$!

# Wait for the UNIX domain socket to be created
for i in {1..10}; do
  if [[ -S "$GAME_SOCKET_PATH" ]]; then
    log INFO "✅ Input socket is ready at $GAME_SOCKET_PATH"
    break
  fi
  sleep 0.5
done

if [[ ! -S "$GAME_SOCKET_PATH" ]]; then
  log ERROR "❌ Input socket not created: $GAME_SOCKET_PATH"
  exit 1
fi

# ----------------------------------------------------------------------
# Launch RetroArch emulator with the specified core and ROM
# ----------------------------------------------------------------------
log INFO "🎮 Launching RetroArch:"
log INFO "    ➤ Core  : $CORE"
log INFO "    ➤ Game  : $GAME"

# Start RetroArch with system config and additional override config
retroarch \
  -L "$CORE" \
  "$GAME" \
  --config /etc/retroarch.cfg \
  --appendconfig "$CONFIG_OVERRIDE" \
  --verbose
