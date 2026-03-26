# ------------------------------------------------------------------------------
# 🧪 check::git_directory_present — Ensure project is Git version-controlled
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Confirms that the project root contains a .git directory or file
#   - Ensures workspace is versioned and CI/CD-safe
#
# Why it matters:
#   Without Git version control, CI pipelines, commit-based workflows, and tools
#   that rely on Git metadata will fail or behave inconsistently.
#
# Globals used:
#   - ROOT_DIR → absolute path to the monorepo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::git_directory_present
#
# Categories:
#   ci, infra, safety
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::git_directory_present() {
  # ✅ Check: Ensure project is initialized as a Git repository
  # Category: ci, infra, safety
  # Stages: pre-commit, check

  local failed=0
  local dotgit="$ROOT_DIR/.git"

  if ! ff::dir_exists "$dotgit" && ! ff::file_exists "$dotgit"; then
    log::mark_failed_with_tip \
      "FATAL" \
      "Missing .git — project is not under Git version control" \
      "Run \`git init\` in the root directory" \
      "cd \"$ROOT_DIR\" && git init"
  fi

  log::fail_check_or_log_success "Git repository detected at: $dotgit"
}

