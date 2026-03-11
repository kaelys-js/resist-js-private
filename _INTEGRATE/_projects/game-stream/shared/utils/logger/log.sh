# -----------------------------------------------------------------------------
# log: Output a structured log message in JSON format with system context
#
# Usage:
#   log <LEVEL> <MESSAGE>
#
# Arguments:
#   LEVEL   - One of: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
#   MESSAGE - The log message to include (non-empty, not just whitespace)
#
# Environment Variables:
#   LOG_ENV        - If set to "production", TRACE and DEBUG logs are suppressed.
#   LOG_PRETTY     - If "true", JSON output is pretty-printed; if terminal, also colorized.
#   LOG_LEVEL      - Sets a minimum log level (e.g., WARN); messages below are ignored.
#   LOG_FORMAT     - Sets output format: "plain", "csv", "yaml", "syslog", or default JSON.
#   CORRELATION_ID - Optional UUID to tag logs across systems. Auto-generated if unset.
#   CI, TEST       - If either is set, pretty-print color output is disabled (non-interactive).
#
# Features:
#   - Structured, machine-readable JSON logs including:
#       - Timestamp, PID, script, user, working directory
#       - UUID and correlation ID
#       - System metrics: memory, CPU, disk, network
#       - Stacktrace for WARN and higher severity
#   - Duplicate log suppression:
#       - Repeated messages (same level + content) are throttled for 5 seconds
#       - Throttle cache stored in: /tmp/log_json_cache
#   - Pretty-printing and ANSI color output in terminals with LOG_PRETTY=true
#   - Syslog support via LOG_FORMAT=syslog
#
# Output:
#   - By default, logs are printed to stdout.
#   - When LOG_FORMAT=syslog is used, logs are sent to the system logger.
#   - For file output, use shell redirection: e.g., `log INFO "..." >> /var/log/mylog.json`
#
# Dependencies:
#   - Requires `jq` for JSON generation
#   - Requires `uuidgen` or access to `/proc/sys/kernel/random/uuid` for UUIDs
#
# Requirements:
#   - Bash 4.0 or higher (uses associative arrays)
#
# Notes:
#   - Timestamps are in fixed ISO 8601 UTC format (e.g., 2025-05-29T15:04:05Z).
#   - Throttling is per <LEVEL>:<MESSAGE> combination and local to this host.
#   - Throttling cache is file-based and not concurrency-safe; races may occur under parallel use.
#   - If both `uuidgen` and /proc/sys/kernel/random/uuid are unavailable, UUIDs default to "unknown".
#   - System stats use the first available non-loopback interface, which may be inaccurate on multi-NIC systems.
#   - JSON output structure is fixed and not user-configurable.
#   - Color output is disabled automatically in CI/test environments (if `CI` or `TEST` is set).
#   - This function is not optimized for high-frequency or real-time logging pipelines.
#
# Exit Codes:
#   1 - Missing dependency: jq
#   2 - Invalid log level
#   3 - Empty or whitespace-only message
#
# Examples:
#   log "INFO" "Service initialized successfully."
#   LOG_LEVEL=ERROR log "DEBUG" "This debug message will be ignored."
#   CORRELATION_ID=abc123 log "FATAL" "Critical failure in API layer."
#   LOG_PRETTY=true LOG_FORMAT=plain log WARN "Disk nearing capacity."
# -----------------------------------------------------------------------------
log() {
  # Exit codes
  local EXIT_NO_JQ=1
  local EXIT_INVALID_LEVEL=2
  local EXIT_INVALID_MESSAGE=3

  # Required external commands
  for cmd in jq md5sum awk; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "Error: Required dependency '$cmd' is not installed." >&2
      return $EXIT_NO_JQ
    fi
  done

  # Conditionally required if LOG_FORMAT=syslog
  if [[ "${LOG_FORMAT,,}" == "syslog" ]]; then
    if ! command -v logger >/dev/null 2>&1; then
      echo "Error: 'logger' is required for LOG_FORMAT=syslog but is not installed." >&2
      return $EXIT_NO_JQ
    fi
  fi

  # Validate log level
  local level="${1^^}"
  shift
  local message="$*"

  declare -A LEVELS=(
    [TRACE]=0
    [DEBUG]=1
    [INFO]=2
    [WARN]=3
    [ERROR]=4
    [FATAL]=5
  )

  if [[ -z "${LEVELS[$level]+_}" ]]; then
    echo "Error: Invalid log level '$level'." >&2
    return $EXIT_INVALID_LEVEL
  fi

  # Check environment suppression in production
  if [[ "$LOG_ENV" == "production" && ( "$level" == "TRACE" || "$level" == "DEBUG" ) ]]; then
    return 0
  fi

  # Check if current level meets the configured threshold
  if [[ -n "$LOG_LEVEL" ]]; then
    local threshold="${LOG_LEVEL^^}"
    if [[ -n "${LEVELS[$threshold]+_}" ]]; then
      (( ${LEVELS[$level]} < ${LEVELS[$threshold]} )) && return 0
    else
      echo "Warning: Invalid LOG_LEVEL '$LOG_LEVEL'." >&2
    fi
  fi

  # Validate message content
  if [[ -z "$message" || -z "$(echo -n "$message" | tr -d '[:space:]')" ]]; then
    echo "Error: Log message cannot be empty or just whitespace." >&2
    return $EXIT_INVALID_MESSAGE
  fi

  # Throttling repeated log messages
  local throttle_window=5
  local hash
  hash=$(echo -n "${level}:${message}" | md5sum | awk '{print $1}')
  local cache_dir="/tmp/log_json_cache"
  mkdir -p "$cache_dir"
  local cache_file="$cache_dir/$hash"
  local now_ts
  now_ts=$(date +%s)
  if [[ -f "$cache_file" ]]; then
    local last_ts
    last_ts=$(<"$cache_file")
    [[ "$last_ts" =~ ^[0-9]+$ ]] || last_ts=0
    (( now_ts - last_ts < throttle_window )) && return 0
  fi
  echo "$now_ts" > "$cache_file"

  # Metadata collection
  local ts hostname pid script user cwd uuid stack=""
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  hostname=$(hostname)
  pid=$$
  script=$(basename "${BASH_SOURCE[1]:-$0}")
  user="${USER:-$(whoami)}"
  cwd=$(pwd)

  # UUID generation with fallback
  get_uuid() {
    if command -v uuidgen >/dev/null 2>&1; then
      uuidgen
    elif [[ -r /proc/sys/kernel/random/uuid ]]; then
      cat /proc/sys/kernel/random/uuid
    else
      echo "unknown"
    fi
  }

  uuid=$(get_uuid)
  local correlation_id="${CORRELATION_ID:-}"
  [[ -z "$correlation_id" ]] && correlation_id=$(get_uuid)

  # Stacktrace generation for WARN and higher
  if (( ${LEVELS[$level]} >= ${LEVELS[WARN]} )); then
    local stackfile
    stackfile=$(mktemp /tmp/logstack.XXXXXX)
    {
      local i=1
      while caller "$i" >/dev/null 2>&1; do
        caller "$i"
        ((i++))
      done
    } | awk '{printf "#%s %s:%s\n", NR-1, $2, $1}' > "$stackfile"
    stack=$(<"$stackfile")
    rm -f "$stackfile"
  fi

  # Memory info
  local mem_total=0 mem_free=0
  while read -r label value _; do
    case "$label" in
      MemTotal:) mem_total=$((value / 1024)) ;;
      MemAvailable:) mem_free=$((value / 1024)) ;;
    esac
  done < /proc/meminfo

  # CPU load (1 minute)
  local cpu_load="0.0"
  read -r cpu_load _ < /proc/loadavg
  cpu_load=$(awk "BEGIN { printf \"%.2f\", $cpu_load }")

  # Disk usage
  local disk_used=0 disk_total=0
  if df_out=$(df -m / 2>/dev/null | awk 'NR==2 {print $3, $2}'); then
    read -r disk_used disk_total <<< "$df_out"
  fi

  # Network stats
  local iface rx=0 tx=0
  iface=$(awk -F: '/^[^ ]/ && $1 != "lo" {gsub(/[[:space:]]/, "", $1); print $1; exit}' /proc/net/dev)
  if [[ -n "$iface" ]]; then
    read -r rx tx <<< "$(awk -v iface="$iface" -F'[: ]+' '$1==iface {print int($2/1024), int($10/1024)}' /proc/net/dev)"
  fi

  # Build JSON log with jq
  local jq_output
  jq_output=$(jq -n \
    --arg ts "$ts" \
    --arg level "$level" \
    --arg msg "$message" \
    --arg host "$hostname" \
    --arg pid "$pid" \
    --arg script "$script" \
    --arg user "$user" \
    --arg cwd "$cwd" \
    --arg uuid "$uuid" \
    --arg corr "$correlation_id" \
    --arg stack "$stack" \
    --arg iface "$iface" \
    --argjson mem_free "$mem_free" \
    --argjson mem_total "$mem_total" \
    --argjson cpu_load "$cpu_load" \
    --argjson disk_used "$disk_used" \
    --argjson disk_total "$disk_total" \
    --argjson rx "$rx" \
    --argjson tx "$tx" \
    '{
      timestamp: $ts,
      level: $level,
      message: $msg,
      hostname: $host,
      pid: ($pid | tonumber),
      script: $script,
      user: $user,
      cwd: $cwd,
      uuid: $uuid,
      correlation_id: $corr,
      system: {
        memory: { free_mb: $mem_free, total_mb: $mem_total },
        cpu_load_1min: $cpu_load,
        disk: { used_mb: $disk_used, total_mb: $disk_total },
        network: { iface: $iface, rx_kb: $rx, tx_kb: $tx }
      }
    } + ( $stack | length > 0 and {stacktrace: $stack} or {} )')

  # Output format handling
  case "$(echo "${LOG_FORMAT:-}" | tr '[:upper:]' '[:lower:]')" in
    plain)
      echo "[$ts] [$level] $message"
      ;;
    csv)
      echo "\"$ts\",\"$level\",\"$hostname\",\"$pid\",\"$script\",\"$user\",\"$cwd\",\"$message\""
      ;;
    yaml)
      echo "$jq_output" | jq -r '
        def indent(n): gsub("\n"; "\n" + (" " * n));
        "timestamp: \(.timestamp)
level: \(.level)
message: \(.message)
hostname: \(.hostname)
pid: \(.pid)
script: \(.script)
user: \(.user)
cwd: \(.cwd)
uuid: \(.uuid)
correlation_id: \(.correlation_id)
system:
  memory:
    free_mb: \(.system.memory.free_mb)
    total_mb: \(.system.memory.total_mb)
  cpu_load_1min: \(.system.cpu_load_1min)
  disk:
    used_mb: \(.system.disk.used_mb)
    total_mb: \(.system.disk.total_mb)
  network:
    iface: \(.system.network.iface)
    rx_kb: \(.system.network.rx_kb)
    tx_kb: \(.system.network.tx_kb)" +
        (.stacktrace? | if . then "\nstacktrace: |\n  \(. | gsub(\"\\n\"; \"\\n  \"))" else "" end)'
      ;;
    syslog)
      logger -p user."$(echo "$level" | tr '[:upper:]' '[:lower:]')" -t "$script" "$message"
      ;;
    *)
      if [[ "$LOG_PRETTY" == "true" && -t 1 && -z "$CI" && -z "$TEST" ]]; then
        local COLOR_RESET=$'\033[0m'
        local COLOR_LEVEL=""
        case "$level" in
          TRACE) COLOR_LEVEL=$'\033[38;5;243m' ;;
          DEBUG) COLOR_LEVEL=$'\033[38;5;33m' ;;
          INFO)  COLOR_LEVEL=$'\033[38;5;39m' ;;
          WARN)  COLOR_LEVEL=$'\033[38;5;214m' ;;
          ERROR) COLOR_LEVEL=$'\033[38;5;196m' ;;
          FATAL) COLOR_LEVEL=$'\033[48;5;196;1m\033[38;5;15m' ;;
        esac
        echo -e "${COLOR_LEVEL}$(echo "$jq_output" | jq .)${COLOR_RESET}"
      elif [[ "$LOG_PRETTY" == "true" ]]; then
        echo "$jq_output" | jq .
      else
        echo "$jq_output"
      fi
      ;;
  esac
}