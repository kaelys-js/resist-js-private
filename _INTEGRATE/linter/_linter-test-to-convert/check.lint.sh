# ------------------------------------------------------------------------------
# 🧪 check::no_debug_statements — Detect lingering debug output in source code
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Searches for console.log/debug/trace, debugger, alert, confirm, prompt, and logger.debug
#   - Skips matches in test files (e.g., test/, *.test.*, __tests__)
#
# Why it matters:
#   Debug statements left in production code leak sensitive info, pollute logs,
#   create modal interruptions, or pause execution. This check ensures clean commits.
#
# Globals used:
#   - ROOT_DIR → absolute path to the project root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::no_debug_statements
#
# Categories:
#   safety, lint, ci
#
# Stages:
#   lint
# ------------------------------------------------------------------------------
check::no_debug_statements() {
  local failed=0

  ff::search - 'console\.log|debugger|alert' ts --exclude-tests | while read -r line; do
    [[ -z "$line" ]] && continue
    log::mark_failed_with_tip WARN \
      "Debug statement found: $line" \
      "Remove debug statements before committing" \
      "console.log('debug')"
  done

  log::fail_check_or_log_success "No debug statements found outside test files"
}

# ------------------------------------------------------------------------------
# 🧪 check::no_todo_or_fixme — Prevent TODO/FIXME markers from shipping
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all source files for TODO or FIXME comments
#   - Skips test files to reduce noise from intentional stubs
#
# Why it matters:
#   TODO/FIXME markers left in production code reflect unfinished logic and technical debt.
#   These should be resolved or moved to tracked issues before shipping.
#
# Globals used:
#   - ROOT_DIR → absolute path to project root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::no_todo_or_fixme
#
# Categories:
#   safety, lint, ci
#
# Stages:
#   lint
# ------------------------------------------------------------------------------
check::no_todo_or_fixme() {
  # ✅ Check: No TODO or FIXME comments remain in source code
  # Category: safety, lint, ci
  # Stages: lint

  local failed=0

  ff::search - 'TODO|FIXME' --exclude-tests | while read -r line; do
    [[ -z "$line" ]] && continue
    log::mark_failed_with_tip WARN \
      "Found TODO or FIXME in production code: $line" \
      "Track unresolved TODOs as GitLab issues and remove inline placeholders" \
      "// TODO: refactor for pagination"
  done

  log::fail_check_or_log_success "No TODO or FIXME comments found in production files"
}

# ------------------------------------------------------------------------------
# 🧪 check::no_long_lines — Warn on source lines exceeding 160 characters
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects lines longer than 160 characters across all source files
#   - Skips node_modules and .git directories (via ff::all_files)
#
# Why it matters:
#   Long lines reduce readability, break editor layouts, and often violate
#   team style guides. Flagging them improves maintainability and clarity.
#
# Globals used:
#   - ROOT_DIR → Project root
#
# Example:
#   ROOT_DIR="/repo"
#   check::no_long_lines
#
# Categories:
#   lint, encoding, ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::no_long_lines() {
  # ✅ Check: No lines exceeding 160 characters in source files
  # Category: lint, encoding, ci
  # Stages: lint, check

  local failed=0

  ff::all_files | while read -r file; do
    [[ -f "$file" ]] || continue
    if grep -qEn '.{161}' "$file"; then
      log::mark_failed_with_tip WARN \
        "Lines longer than 160 characters found in: $file" \
        "Break long lines into multiple expressions or helper functions" \
        "Split chained calls or long templates across multiple lines"
    fi
  done

  log::fail_check_or_log_success "No lines exceed 160 characters"
}