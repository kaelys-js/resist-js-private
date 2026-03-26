# ------------------------------------------------------------------------------
# 🧪 check::no_dangerous_shell_commands — Detect unsafe or destructive shell patterns
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans for `rm -rf /`, `:(){ :|:& };:`, and other catastrophic shell patterns
#   - Flags any line containing known destructive or exploit-prone syntax
#
# Why it matters:
#   These patterns can cause irreversible data loss or crash the host system.
#   They must never appear in committed code, scripts, or docs.
#
# Globals used:
#   - ROOT_DIR → absolute path to project root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::no_dangerous_shell_commands
#
# Categories:
#   safety, shell, ci
#
# Stages:
#   lint
# ------------------------------------------------------------------------------
check::no_dangerous_shell_commands() {
  # ✅ Check: Reject destructive or dangerous shell commands in source
  # Category: safety, shell, ci
  # Stages: lint

  local failed=0

  ff::search - 'rm\s+-rf\s+/|:\(\)\s*{\s*:\s*\|:\s*;};:' sh --refresh | while read -r line; do
    [[ -z "$line" ]] && continue
    log::mark_failed_with_tip \
      "FATAL" \
      "Dangerous shell pattern detected: $line" \
      "Never commit destructive commands — wrap with guards or validate inputs" \
      '[[ "$DEST" != "/" ]] && rm -rf "$DEST"'
  done

  log::fail_check_or_log_success "No destructive shell patterns found in shell scripts"
}

# ------------------------------------------------------------------------------
# 🧪 check::executable_files_have_shebang — Warn if executable files lack shebang
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all executable files (regardless of extension) for missing shebang lines
#
# Why it matters:
#   Executable files without a shebang may behave inconsistently depending on how
#   they are invoked (e.g. via shell vs. subprocess). A missing shebang causes
#   unpredictable behavior, especially in CI or container environments.
#
# Globals used:
#   - ROOT_DIR → absolute path to the monorepo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::executable_files_have_shebang
#
# Categories:
#   safety, shell, lint
#
# Stages:
#   lint
# ------------------------------------------------------------------------------
check::executable_files_have_shebang() {
  # ✅ Check: Executable files should include a valid shebang line
  # Category: safety, shell, lint
  # Stages: lint

  local failed=0

  ff::all_files | while read -r file; do
    [[ -z "$file" || ! -x "$file" || ! -f "$file" ]] && continue

    if ! head -n1 "$file" | grep -q '^#!'; then
      log::mark_failed_with_tip \
        "WARN" \
        "Executable file missing shebang: $file" \
        "Add a proper shebang line to ensure correct interpreter is used" \
        "#!/usr/bin/env bash"
    fi
  done

  log::fail_check_or_log_success "All executable files include a valid shebang"
}
