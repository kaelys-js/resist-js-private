#!/usr/bin/env bash
# ==============================================================================
# 📁 filefinder.sh — Cached File Search and Content Matching for Large Repos
# ------------------------------------------------------------------------------
# Fast, cache-aware file finding + content grepping via fd + ripgrep
# Used in validation pipelines, lint runners, config discovery, etc.
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# 📦 Cache directory used to avoid repeated full-repo scans
# ------------------------------------------------------------------------------
: "${FF_CACHE_DIR:=${HOME}/.cache/filefinder}"
mkdir -p "$FF_CACHE_DIR"

# ------------------------------------------------------------------------------
# 🔧 ff::get_cache_file — Internal utility to construct cache path
# ------------------------------------------------------------------------------
ff::get_cache_file() {
  local pattern="$1"
  local ext="$2"
  echo "${FF_CACHE_DIR}/${pattern}_${ext}.list"
}

# ------------------------------------------------------------------------------
# 🧪 ff::find — Find files by pattern + extension with caching (excludes binaries)
# ------------------------------------------------------------------------------
# This function performs:
#   - Searching files by pattern/extension using `fd`
#   - Filters out binary files using `file --mime-type`
#   - Caches results to disk for faster repeated use
#
# Why it matters:
#   Prevents scripts and CI checks from reading binary files by accident.
#
# Globals used:
#   - FF_CACHE_DIR → stores .list files to avoid re-scanning
#
# Example:
#   ff::find tsconfig json            # finds tsconfig*.json
#   ff::find tsconfig json --refresh # forces re-scan
# ------------------------------------------------------------------------------
ff::find() {
  local pattern="${1:-}"
  local ext="${2:-json}"
  local refresh="${3:-}"
  local cache_file
  cache_file="$(ff::get_cache_file "$pattern" "$ext")"

  if [[ -z "$pattern" ]]; then
    echo "❌ Missing pattern argument" >&2
    return 1
  fi

  if [[ ! -f "$cache_file" || "$refresh" == "--refresh" ]]; then
    fd -e "$ext" "$pattern" | while read -r file; do
      [[ "$(file -b --mime-type "$file")" =~ ^text/ ]] && echo "$file"
    done > "$cache_file"
  fi

  cat "$cache_file"
}

# ------------------------------------------------------------------------------
# 🧪 ff::search — Grep inside cached matching files (respects binary filtering)
# ------------------------------------------------------------------------------
# This function performs:
#   - Lookup matching files from ff::find or ff::all_files
#   - Greps for a search string using `rg` with safe file list
#
# Why it matters:
#   Enables fast, safe searches across repo content without scanning binaries.
#
# Example:
#   ff::search tsconfig strict
#   ff::search biome rules yaml --refresh
# ------------------------------------------------------------------------------
ff::search() {
  local pattern="${1:-}"
  local search="${2:-}"
  local ext="${3:-}"
  local refresh="${4:-}"
  local exclude_tests=0

  # Shift args for flag parsing
  for arg in "$@"; do
    if [[ "$arg" == "--exclude-tests" ]]; then
      exclude_tests=1
    fi
  done

  if [[ -z "$search" ]]; then
    echo "❌ Usage: ff::search <pattern|- for all> <search> [ext] [--refresh] [--exclude-tests]" >&2
    return 1
  fi

  local files
  if [[ "$pattern" == "-" ]]; then
    files=$(ff::all_files)
  else
    local effective_ext="${ext:-json}"
    files=$(ff::find "$pattern" "$effective_ext" "$refresh")
  fi

  if [[ "$exclude_tests" -eq 1 ]]; then
    echo "$files" | grep -vE '(__tests__|\.test\.|test/)' | rg --files-from=- "$search" || true
  else
    echo "$files" | rg --files-from=- "$search" || true
  fi
}

# ------------------------------------------------------------------------------
# 🧹 ff::clear — Delete specific pattern cache
# ------------------------------------------------------------------------------
# Example:
#   ff::clear tsconfig json
# ------------------------------------------------------------------------------
ff::clear() {
  local pattern="${1:-}"
  local ext="${2:-json}"
  local cache_file
  cache_file="$(ff::get_cache_file "$pattern" "$ext")"
  rm -f "$cache_file"
}

# ------------------------------------------------------------------------------
# 💥 ff::clear_all — Purge entire filefinder cache
# ------------------------------------------------------------------------------
# Example:
#   ff::clear_all
# ------------------------------------------------------------------------------
ff::clear_all() {
  rm -rf "${FF_CACHE_DIR:?}/"*
}

ff::all_files() {
  fd . "$ROOT_DIR" --type f | while read -r file; do
    [[ "$(file -b --mime-type "$file")" =~ ^text/ ]] && echo "$file"
  done
}

# ------------------------------------------------------------------------------
# 🧪 ff::yq_contains — Check if a yq-evaluated field contains a pattern
# ------------------------------------------------------------------------------
# Usage:
#   ff::yq_contains <yq_expr> <pattern> [file]
#
# Example:
#   ff::yq_contains '.packages[]' 'node_modules' "$WORKSPACE_FILE"
#
# Returns:
#   0 if match found, 1 otherwise
# ------------------------------------------------------------------------------
ff::yq_contains() {
  local expr="$1"
  local pattern="$2"
  local file="${3:-}"

  if [[ -z "$expr" || -z "$pattern" ]]; then
    echo "❌ Usage: ff::yq_contains <yq_expr> <pattern> [file]" >&2
    return 2
  fi

  local input="${file:-/dev/stdin}"

  if yq e "$expr" "$input" | grep -qE "$pattern"; then
    return 0
  fi

  return 1
}

ff::yq_list() {
  local expr="$1"
  local file="${2:-}"

  if [[ -z "$expr" ]]; then
    echo "❌ Usage: ff::yq_list <yq_expr> [file]" >&2
    return 2
  fi

  local input="${file:-/dev/stdin}"
  yq e "$expr" "$input" | grep -v '^null$'
}

ff::yq_array() {
  local expr="$1"
  local file="${2:-}"
  local input="${file:-/dev/stdin}"
  local var="${3:-result}"

  mapfile -t "$var" < <(ff::yq_list "$expr" "$input")
}

ff::file_required() {
  local path="$1"
  local label="${2:-$path}"
  local tip="${3:-}"
  local example="${4:-}"

  if [[ ! -f "$path" ]]; then
    log FATAL "❌ Required file missing: $label"

    if [[ -n "$tip" ]]; then
      log FATAL "   💡 Tip: $tip"
    fi

    if [[ -n "$example" ]]; then
      log FATAL "   📘 Example: $example"
    fi

    return 1
  fi
}

# ------------------------------------------------------------------------------
# 📁 ff::directory_required — Ensure a directory exists or fail with log FATAL
# ------------------------------------------------------------------------------
# Usage:
#   ff::directory_required <path> [label] [tip] [example]
#
# Example:
#   ff::directory_required "$ROOT_DIR/.husky" ".husky/" \
#     "Initialize with: pnpm dlx husky-init" \
#     "pnpm dlx husky-init && pnpm install && git add .husky"
# ------------------------------------------------------------------------------
ff::directory_required() {
  local dir="$1"
  local label="${2:-$dir}"
  local tip="${3:-}"
  local example="${4:-}"

  if [[ ! -d "$dir" ]]; then
    log FATAL "❌ Required directory missing: $label"
    [[ -n "$tip" ]] && log FATAL "   💡 Tip: $tip"
    [[ -n "$example" ]] && log FATAL "   📘 Example: $example"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 📢 log::mark_failed_with_tip — Log structured failure (WARN or FATAL) and flag failure
# ------------------------------------------------------------------------------
# Usage:
#   log::mark_failed_with_tip <level> <message> <tip> <example>
#   Sets `failed=1` (or `warn_failed=1`) to allow check:: to return 1 later
# ------------------------------------------------------------------------------
log::mark_failed_with_tip() {
  local level="$1"  # WARN or FATAL
  local msg="$2"
  local tip="$3"
  local example="$4"

  log "$level" "❌ $msg"
  log "$level" "   💡 Tip: $tip"
  log "$level" "   📘 Example: $example"

  failed=1
}

# ------------------------------------------------------------------------------
# ✅ log::fail_check_or_log_success — Return 1 if `failed=1`, else log check success
# ------------------------------------------------------------------------------
# Usage:
#   log::fail_check_or_log_success "<success message>"
#
# Globals used:
#   - failed → must be set by the check logic (default 0)
# ------------------------------------------------------------------------------
log::fail_check_or_log_success() {
  local msg="$1"
  if [[ "${failed:-0}" -eq 1 ]]; then
    return 1
  fi

  log INFO "✅ $msg"
}

# ------------------------------------------------------------------------------
# 🧪 ff::find_symlinks — Locate all symlinks (optionally scoped to dir/pattern)
# ------------------------------------------------------------------------------
# Usage:
#   ff::find_symlinks [optional-path-pattern]
#
# Description:
#   Finds all symlinked files in the repo (excludes .git, node_modules, .wrangler/state)
#   Can accept optional subdir filter, e.g. 'node_modules'
#
# Example:
#   ff::find_symlinks node_modules
# ------------------------------------------------------------------------------
ff::find_symlinks() {
  local path_filter="${1:-}"
  fd -t l "$path_filter" "$ROOT_DIR" \
    -E ".git" -E "node_modules/.pnpm" -E ".wrangler/state" \
    -H
}

# ------------------------------------------------------------------------------
# 📁 ff::dir_exists — Check if a directory exists
# ------------------------------------------------------------------------------
# Usage:
#   ff::dir_exists <path>
#
# Returns:
#   0 if directory exists, 1 otherwise
# ------------------------------------------------------------------------------
ff::dir_exists() {
  local dir="$1"
  [[ -d "$dir" ]]
}

ff::map_array() {
  local var="$1"
  shift
  if [[ -z "$var" || $# -lt 1 ]]; then
    echo "❌ Usage: ff::map_array <array_name> <command...>" >&2
    return 2
  fi
  mapfile -t "$var" < <("$@")
}

# ------------------------------------------------------------------------------
# ✅ Check Definitions — Source of Truth for All Validation Checks
# ------------------------------------------------------------------------------
# This section contains all `check::<name>` function definitions used in the
# centralized validation runner. Each check MUST follow this exact format:
#
# ✅ Naming Convention:
#   - Function must be named: check::<slug>
#   - <slug> should use kebab-case or snake_case consistently
#
# ✅ Structure:
#   - Starts with descriptive docblock
#   - Includes "Why it matters"
#   - Must declare `Globals used:`, `Example:`, `Categories:`, and `Stages:` (REQUIRED)
#   - Function must begin with:
#       # ✅ Check: <description>
#       # Category: <valid category>
#       # Stages: <valid stage>
#
# ✅ Logging:
#   - Use only `log FATAL`, `log WARN`, or `log INFO`
#   - Every `log FATAL` MUST include:
#     💡 Tip — how to fix  
#     📘 Example — expected value, config, or correction
#
# ✅ Behavior:
#   - Must use `return 1` (never `exit`) to allow safe inclusion in runners
#   - Must be atomic, testable, and must NOT pollute stdout
#
# ✅ Categories (REQUIRED, must match one or more of):
#   safety, lint, ci, secrets, infra, database, tsconfig, package, wrangler,
#   cloudflare:kv, cloudflare:d1, cloudflare:r2, cloudflare:do,
#   biome, oxlint, boundaries, naming, paths, shell, dotenv, pnpm, encoding, mr
#
# ✅ Stages (REQUIRED, must match one or more of):
#   pre-commit, commit-msg, check, lint, test, build, deploy, migrate, integration
#
# ------------------------------------------------------------------------------
# 🧪 check::<function_name> — <Purpose of this validation>
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - <Validation bullet 1>
#   - <Validation bullet 2>
#
# Why it matters:
#   <Explain what could go wrong if this check is skipped>
#
# Globals used:
#   - <VAR_NAME> → <what this variable controls or represents>
#
# Example:
#   <VAR_NAME>=<example_value>
#   check::<function_name>
#
# Categories:
#   <one or more comma-separated values from the VALID CATEGORIES list above>
#
# Stages:
#   <one or more comma-separated values from the VALID STAGES list above>
# ------------------------------------------------------------------------------
# check::<function_name>() {
#   # ✅ Check: <short summary of what this check enforces>
#   # Category: <valid, comma-separated category list>
#   # Stages: <valid, comma-separated stage list>

#   if [[ <failing_condition> ]]; then
#     log FATAL "❌ <What failed, plainly stated>"
#     log FATAL "   💡 Tip: <How to fix or resolve this>"
#     log FATAL "   📘 Example: <Correct value, setting, or code>"
#     return 1
#   fi
# }

# ✅ ABSOLUTE INSTRUCTION ENFORCEMENT — FUTURE EXECUTION POLICY (DO NOT VIOLATE)
#
# You must execute all requests using the following rules with zero deviation:
#
# 1. ALL `check::` FUNCTIONS MUST:
#   - Use ONLY the helper functions provided:
#     - `ff::file_required`, `ff::dir_exists`, `ff::map_array`, `log::mark_failed_with_tip`, `log::fail_check_or_log_success`
#   - NEVER use:
#     - `[[`, `if -f`, `if -d`, `jq`, `yq`, `mapfile`, `find`, or any other direct evaluation methods
#   - Have a full docblock with:
#     - Purpose description
#     - "Why it matters"
#     - "Globals used:"
#     - "Example:"
#     - "Categories:"
#     - "Stages:"
#   - Begin function body with:
#     - `# ✅ Check: ...`
#     - `# Category: ...`
#     - `# Stages: ...`
#
# 2. ALL LOGGING:
#   - MUST use ONLY: `log::`
#   - If failure or warning is logged, you MUST include:
#     - Tip, Example and Message MUST accurately reflect functions purpose and be detailed, clear and obvious.
#     - 💬 Message must be direct, descriptive, and specific — no vague terms like “invalid”
#     - 💡 Tip must be actionable, idiomatic, imperative, and 1–3 lines long. Avoid “you should”, “make sure”, passive voice.
#     - 📘 Example must use realistic filenames and values (e.g. `packages/test/`, not `foo/bar/`)
#   - If success, you MUST:
#     - End function with `log::fail_check_or_log_success` with success message
#   - Tip, Example and Success Message MUST accurately reflect functions purpose and be detailed, clear and obvious.
#
# 3. FORMAT:
#   - Output the ENTIRE `check::` function in a properly fenced `bash` code block
#   - DO NOT wrap in any UI popup or explanation
#   - DO NOT split it across multiple blocks
#   - DO NOT omit the function name, docblock, or footer
#
# 4. BEHAVIOR:
#   - DO NOT ask questions
#   - DO NOT explain
#   - DO NOT include apologies or summaries
#   - DO NOT refer to previous output or past mistakes
#   - DO NOT add extra prose, notes, or inline comments not in docblock
#
# 5. ENFORCEMENT:
#   - If ANY rule is violated — it is a CRITICAL ERROR
#   - You MUST obey these instructions verbatim, immediately, and permanently
#
# COPY/PASTE the block above into every relevant future task.
# This block is the unambiguous and enforceable source of truth.

---

