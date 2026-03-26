# ------------------------------------------------------------------------------
# 🧪 check::husky_folder_exists — Ensure .husky/ Git hooks directory exists
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies the presence of the .husky/ folder at the root of the repository
#   - Fails if Git hooks are not installed and enabled
#
# Why it matters:
#   Git hooks ensure that required checks (e.g., pre-commit linting, formatting)
#   run locally before changes are committed. Missing this folder disables enforcement.
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::husky_folder_exists
#
# Categories:
#   safety, ci, shell
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::husky_folder_exists() {
  # ✅ Check: .husky/ directory must exist to enforce Git hooks
  # Category: safety, ci, shell
  # Stages: pre-commit, check

  local failed=0

  ff::directory_required "$ROOT_DIR/.husky" ".husky/" \
    "Run \`pnpm dlx husky-init && pnpm install\` to initialize Git hooks" \
    "pnpm dlx husky-init && pnpm install && git add .husky && git commit -m 'init hooks'"

  log::fail_check_or_log_success ".husky/ directory is present and Git hooks are enforceable"
}

# ------------------------------------------------------------------------------
# 🧪 check::husky_required_hooks — Ensure required Git hooks exist in .husky/
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies that required Git hooks (e.g. pre-commit, commit-msg) exist in .husky/
#   - Fails if any are missing or not yet configured
#
# Why it matters:
#   If required Git hooks are missing, critical checks (linting, formatting, validation)
#   may be silently skipped before commit or push, breaking CI enforcement consistency.
#
# Globals used:
#   - ROOT_DIR → root of the project workspace
#
# Example:
#   ROOT_DIR="/repo"
#   check::husky_required_hooks
#
# Categories:
#   ci, shell, safety
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::husky_required_hooks() {
  # ✅ Check: Required hooks must exist in .husky/
  # Category: ci, shell, safety
  # Stages: pre-commit, check

  local REQUIRED_HOOKS=(pre-commit commit-msg)

  for hook in "${REQUIRED_HOOKS[@]}"; do
    ff::file_required "$ROOT_DIR/.husky/$hook" ".husky/$hook" \
      "Use pnpm husky add to generate the hook" \
      "pnpm husky add .husky/$hook 'pnpm lint-staged'"
  done

  log::fail_check_or_log_success "All required Git hooks are present in .husky/"
}

# ------------------------------------------------------------------------------
# 🧪 check::husky_hooks_executable — Ensure .husky hooks are executable
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all Git hook scripts in .husky/ are marked as executable
#   - Skips sample files (e.g. pre-commit.sample)
#
# Why it matters:
#   Git will silently ignore hook scripts that are not executable,
#   meaning important pre-commit or commit-msg checks won't run.
#
# Globals used:
#   - ROOT_DIR → root of the project workspace
#
# Example:
#   ROOT_DIR="/repo"
#   check::husky_hooks_executable
#
# Categories:
#   shell, safety, ci
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::husky_hooks_executable() {
  # ✅ Check: All .husky hooks must be executable
  # Category: shell, safety, ci
  # Stages: pre-commit, check

  local failed=0
  local hooks
  hooks=$(ff::all_files | grep "^$ROOT_DIR/.husky/" | grep -v '\.sample$')

  while read -r hook; do
    [[ -z "$hook" || ! -f "$hook" ]] && continue
    if [[ ! -x "$hook" ]]; then
      log::mark_failed_with_tip FATAL \
        "Git hook is not executable: $hook" \
        "Use \`chmod +x $hook\` to make it executable" \
        "chmod +x .husky/pre-commit"
    fi
  done <<< "$hooks"

  log::fail_check_or_log_success "All Git hooks in .husky/ are executable"
}

# ------------------------------------------------------------------------------
# 🧪 check::husky_hooks_syntax — Ensure all Git hooks include required syntax
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies each non-sample file in .husky/ contains a valid shebang
#   - Verifies presence of Husky bootstrap line for proper hook initialization
#
# Why it matters:
#   Without the shebang and Husky bootstrap line, Git hooks will silently fail.
#   This can lead to skipped checks and invalid commits reaching CI.
#
# Globals used:
#   - ROOT_DIR → absolute path to project root
#
# Example:
#   ROOT_DIR="/repo"
#   check::husky_hooks_syntax
#
# Categories:
#   shell, ci, safety
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::husky_hooks_syntax() {
  # ✅ Check: All Husky hooks include required shebang and bootstrap lines
  # Category: shell, ci, safety
  # Stages: pre-commit, check

  local failed=0
  local hooks
  hooks=$(ff::all_files | grep "^$ROOT_DIR/.husky/" | grep -v '\.sample$')

  while read -r hook; do
    [[ -z "$hook" || ! -f "$hook" ]] && continue

    if ! grep -q '^#!/bin/sh' "$hook"; then
      log::mark_failed_with_tip FATAL \
        "Missing shebang in Git hook: $hook" \
        "Add \`#!/bin/sh\` to the top of the hook script" \
        "echo '#!/bin/sh' > $hook"
    fi

    if ! grep -q 'husky\.sh' "$hook"; then
      log::mark_failed_with_tip FATAL \
        "Missing Husky bootstrap in: $hook" \
        "Add \`. \"\$(dirname \"\$0\")/_/husky.sh\"\` to initialize Husky" \
        "echo '. \"\$(dirname \"\$0\")/_/husky.sh\"' >> $hook"
    fi
  done <<< "$hooks"

  log::fail_check_or_log_success "All Git hooks contain required syntax and Husky bootstrap"
}

# ------------------------------------------------------------------------------
# 🧪 check::husky_core_script_present — Ensure husky.sh core script exists
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies the presence of the Husky bootstrap script: .husky/_/husky.sh
#   - Fails if it is missing, as Git hooks depend on this core script
#
# Why it matters:
#   Without the husky.sh bootstrap file, Git hooks will not be executed correctly.
#   This results in skipped checks and potentially invalid commits being allowed.
#
# Globals used:
#   - ROOT_DIR → absolute project path (inherited from environment)
#
# Example:
#   ROOT_DIR="/repo"
#   check::husky_core_script_present
#
# Categories:
#   shell, ci, safety
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::husky_core_script_present() {
  # ✅ Check: .husky/_/husky.sh bootstrap file must exist
  # Category: shell, ci, safety
  # Stages: pre-commit, check

  local file="$ROOT_DIR/.husky/_/husky.sh"

  local failed=0

  ff::file_required "$file" \
    ".husky/_/husky.sh" \
    "Run \`pnpm dlx husky-init && pnpm install\` to regenerate missing core hooks" \
    "pnpm dlx husky-init && pnpm install && git add .husky && git commit -m 'restore husky'" || failed=1

  log::fail_check_or_log_success "Husky bootstrap script exists: .husky/_/husky.sh"
}

# ------------------------------------------------------------------------------
# 🧪 check::husky_hook_script_references — Ensure .husky hooks reference valid scripts
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all .husky/* files for relative script paths ending in .sh
#   - Fails if any referenced script does not exist on disk
#
# Why it matters:
#   Broken script references inside Git hook files cause silent hook failures
#   and skipped validation, leading to untested or malformed commits.
#
# Globals used:
#   - ROOT_DIR → absolute path to monorepo root (inherited from environment)
#
# Example:
#   ROOT_DIR="/repo"
#   check::husky_hook_script_references
#
# Categories:
#   shell, ci, paths, safety
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::husky_hook_script_references() {
  # ✅ Check: All referenced shell scripts in .husky hooks must exist
  # Category: shell, ci, paths, safety
  # Stages: pre-commit, check

  local failed=0
  local hooks
  hooks=$(ff::all_files | grep "^$ROOT_DIR/.husky/" | grep -v '\.sample$')

  while read -r hook; do
    [[ -z "$hook" || ! -f "$hook" ]] && continue

    grep -oE '\.\./[^[:space:]]+\.sh' "$hook" | while read -r rel_script; do
      local script_path
      script_path="$(realpath --no-symlinks --canonicalize-missing "$(dirname "$hook")/$rel_script")"

      if [[ ! -f "$script_path" ]]; then
        log::mark_failed_with_tip FATAL \
          "Git hook $hook references missing script: $rel_script" \
          "Ensure this relative script path exists and is committed" \
          "mkdir -p scripts && touch scripts/validate.sh"
      fi
    done
  done <<< "$hooks"

  log::fail_check_or_log_success "All .husky hooks reference valid shell scripts"
}
