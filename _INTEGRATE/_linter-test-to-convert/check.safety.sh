# ------------------------------------------------------------------------------
# 🚫 Execution Guard — Prevent this file from being run directly
# ------------------------------------------------------------------------------
# This block ensures the script is only used via `source`, not direct invocation.
#
# Why it matters:
#   When executed directly (e.g. `bash check.sh`), function definitions are discarded
#   after exit. Sourcing ensures all `check::` functions remain available to the caller.
#
# Globals used:
#   - BASH_SOURCE[0] → path to this file when sourced
#   - $0             → path to this file when executed
#
# Example:
#   source ./scripts/checks.sh     ✅ Loads check:: functions
#   bash ./scripts/checks.sh       ❌ Blocked (exits immediately)
# ------------------------------------------------------------------------------
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "❌ This script is meant to be sourced, not executed directly."
  echo "💡 Usage: source ${BASH_SOURCE[0]}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 🧪 check::no_merge_conflict_markers — Detect unresolved Git merge conflicts
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all files in the repo for Git conflict markers using `ff::search`
#
# Why it matters:
#   Accidental commits containing conflict markers break builds, cause merge loss,
#   and confuse teammates. This check ensures the working tree is clean.
#
# Globals used:
#   - ROOT_DIR → absolute path to the project root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::no_merge_conflict_markers
#
# Categories:
#   safety, ci, lint
#
# Stages:
#   check
# ------------------------------------------------------------------------------
check::no_merge_conflict_markers() {
  # ✅ Check: Git conflict markers are not present in any file
  # Category: safety, ci, lint
  # Stages: check

  local failed=0
  local matches
  matches=$(ff::search - '^(<<<<<<<|=======|>>>>>>>)' || true)

  if [[ -n "$matches" ]]; then
    while read -r line; do
      [[ -z "$line" ]] && continue
      log::mark_failed_with_tip FATAL \
        "Unresolved Git conflict marker: $line" \
        "Search and resolve all Git conflict markers before committing" \
        "Remove \`<<<<<<< HEAD\` and manually resolve the merge"
    done <<< "$matches"
  fi

  log::fail_check_or_log_success "No Git conflict markers found in source files"
}

# ------------------------------------------------------------------------------
# 🧪 check::no_utf8_bom_headers — Ensure no files contain UTF-8 BOM headers
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all repo files for UTF-8 BOM (Byte Order Mark) headers
#   - Excludes binary files, node_modules, .git, and .wrangler/state via ff::all_files
#
# Why it matters:
#   UTF-8 BOMs break shell scripts, JSON/YAML parsing, and CI tools.
#   These invisible characters cause cross-platform inconsistencies.
#
# Globals used:
#   - ROOT_DIR → root of the repo to scan
#
# Example:
#   ROOT_DIR="/repo"
#   check::no_utf8_bom_headers
#
# Categories:
#   encoding, lint, safety
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::no_utf8_bom_headers() {
  # ✅ Check: No UTF-8 BOM headers exist in repo files
  # Category: encoding, lint, safety
  # Stages: lint, check

  local failed=0

  while IFS= read -r file; do
    [[ -z "$file" || ! -f "$file" ]] && continue
    if file "$file" | grep -q 'UTF-8 Unicode (with BOM)'; then
      log::mark_failed_with_tip FATAL \
        "UTF-8 BOM detected in file: $file" \
        "Remove the BOM to ensure compatibility across tools" \
        "sed -i '1s/^\xEF\xBB\xBF//' \"$file\""
    fi
  done < <(ff::all_files)

  log::fail_check_or_log_success "No UTF-8 BOM headers found in repo files"
}

# ------------------------------------------------------------------------------
# 🧪 check::no_crlf_line_endings — Block Windows-style (CRLF) line endings
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all tracked files in the repo for CRLF line endings
#   - Excludes binary files, node_modules, .git/, and .wrangler/state/
#
# Why it matters:
#   CRLF line endings break Unix tooling, cause shell scripts to fail,
#   and pollute diffs in cross-platform teams. All files must use LF.
#
# Globals used:
#   - ROOT_DIR → Root of the repo
#
# Example:
#   ROOT_DIR="/repo"
#   check::no_crlf_line_endings
#
# Categories:
#   encoding, lint, safety
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::no_crlf_line_endings() {
  # ✅ Check: No Windows-style CRLF line endings anywhere in the repo
  # Category: encoding, lint, safety
  # Stages: lint, check

  local failed=0

  while IFS= read -r file; do
    [[ -z "$file" || ! -f "$file" ]] && continue
    if file "$file" | grep -q 'CRLF'; then
      log::mark_failed_with_tip FATAL \
        "CRLF line endings detected in: $file" \
        "Convert to LF using dos2unix or configure your editor for Unix-style endings" \
        "dos2unix \"$file\""
    fi
  done < <(ff::all_files)

  log::fail_check_or_log_success "No CRLF line endings detected in repo files"
}

# ------------------------------------------------------------------------------
# 🧪 check::no_trailing_whitespace — Warn on trailing spaces/tabs in files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Searches all tracked source files for trailing whitespace at end of lines
#   - Skips node_modules and lockfiles to avoid noise
#
# Why it matters:
#   Trailing whitespace causes unnecessary diffs, pollutes version history,
#   and leads to noisy linter output or accidental formatting conflicts.
#
# Globals used:
#   - ROOT_DIR → Project root
#
# Example:
#   ROOT_DIR="/repo"
#   check::no_trailing_whitespace
#
# Categories:
#   lint, encoding, ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::no_trailing_whitespace() {
  # ✅ Check: No trailing whitespace in source files
  # Category: lint, encoding, ci
  # Stages: lint, check

  local failed=0

  while IFS= read -r file; do
    [[ "$file" =~ node_modules|\.lock$ ]] && continue
    if grep -q '[[:blank:]]$' "$file"; then
      log::mark_failed_with_tip WARN \
        "Trailing whitespace found in: $file" \
        "Strip trailing whitespace using your editor or a tool like \`sed\`" \
        "sed -i 's/[[:space:]]\\+\$//' \"$file\""
    fi
  done < <(ff::all_files)

  log::fail_check_or_log_success "No trailing whitespace detected in repo files"
}

# ------------------------------------------------------------------------------
# 🧪 check::no_tabs_in_code — Enforce use of spaces over tabs in code files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all text-based source files for literal tab characters
#   - Covers common formats including code, config, scripts, and docs
#
# Why it matters:
#   Tab characters lead to inconsistent formatting across platforms and editors,
#   cause noisy diffs, and break indentation rules enforced by linters.
#
# Globals used:
#   - ROOT_DIR → Project root
#
# Example:
#   ROOT_DIR="/repo"
#   check::no_tabs_in_code
#
# Categories:
#   encoding, lint, ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::no_tabs_in_code() {
  # ✅ Check: Tab characters must not appear in source/config/documentation files
  # Category: encoding, lint, ci
  # Stages: lint, check

  local failed=0

  while IFS= read -r file; do
    [[ "$file" =~ node_modules|\.lock$ ]] && continue
    if grep -q $'\t' "$file"; then
      log::mark_failed_with_tip FATAL \
        "Tab character found in: $file" \
        "Configure your editor to use spaces instead of tabs (e.g. 2 or 4 spaces)" \
        "sed -i 's/\\t/  /g' \"$file\""
    fi
  done < <(ff::all_files)

  log::fail_check_or_log_success "No tab characters found in source files"
}

# ------------------------------------------------------------------------------
# 🧪 check::all_files_are_utf8 — Ensure all project files are UTF-8 encoded
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all non-binary, non-node_modules files in the repo
#   - Fails if any file is not UTF-8 encoded
#
# Why it matters:
#   Non-UTF-8 encodings can break shell scripts, CI tools, Git diffs, and editors.
#   Ensuring UTF-8 consistency prevents subtle bugs and tooling inconsistencies.
#
# Globals used:
#   - ROOT_DIR → Project root
#
# Example:
#   ROOT_DIR="/repo"
#   check::all_files_are_utf8
#
# Categories:
#   encoding, safety, ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::all_files_are_utf8() {
  # ✅ Check: All project files must be UTF-8 encoded
  # Category: encoding, safety, ci
  # Stages: lint, check

  local failed=0

  while IFS= read -r file; do
    [[ ! -f "$file" ]] && continue
    local encoding
    encoding=$(file -i "$file" | awk -F'charset=' '{print $2}' | tr -d '[:space:]')
    if [[ "$encoding" != "utf-8" ]]; then
      log::mark_failed_with_tip FATAL \
        "Non-UTF-8 encoding detected in: $file" \
        "Convert this file to UTF-8 using iconv or your editor’s encoding settings" \
        "iconv -f ISO-8859-1 -t UTF-8 \"$file\" -o \"$file.utf8\""
    fi
  done < <(ff::all_files)

  log::fail_check_or_log_success "All project files are UTF-8 encoded"
}
