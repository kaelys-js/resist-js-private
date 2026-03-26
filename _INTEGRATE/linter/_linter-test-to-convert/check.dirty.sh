# ------------------------------------------------------------------------------
# 🧪 check::untracked_artifacts — Detect leftover temp, backup, or OS files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Searches the repository for .DS_Store, *.tmp, and *.bak files
#   - Warns if local artifacts are found that should not be committed
#
# Why it matters:
#   These files are often editor-generated, OS-specific, or unintended artifacts.
#   They pollute version control, increase noise, and introduce platform issues.
#
# Globals used:
#   - ROOT_DIR → absolute path to the repo root
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::untracked_artifacts
#
# Categories:
#   safety, ci, paths, shell
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::untracked_artifacts() {
  # ✅ Check: Detect untracked local artifacts like .DS_Store, *.tmp, *.bak
  # Category: safety, ci, paths, shell
  # Stages: pre-commit, check

  local failed=0

  ff::all_files | while read -r file; do
    [[ "$file" =~ \.tmp$|\.bak$|/\.DS_Store$ ]] || continue

    log::mark_failed_with_tip WARN \
      "Untracked local artifact: $file" \
      "Add this file to .gitignore or remove it from the working tree" \
      "echo '.DS_Store' >> .gitignore && git rm --cached \"$file\""
  done

  log::fail_check_or_log_success "No untracked OS/editor artifacts found"
}

# ------------------------------------------------------------------------------
# 🧪 check::broken_symlinks_in_node_modules — Detect broken symlinks in node_modules
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans for invalid symlinks inside node_modules
#   - Fails if any symlinks point to missing or deleted targets
#
# Why it matters:
#   Broken symlinks inside node_modules can result in runtime failures,
#   missing dependencies, or corrupted workspace setups.
#
# Globals used:
#   - ROOT_DIR → absolute path to the repository root
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::broken_symlinks_in_node_modules
#
# Categories:
#   safety, package, pnpm
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::broken_symlinks_in_node_modules() {
  # ✅ Check: Detect broken symlinks in node_modules (e.g., corrupted install)
  # Category: safety, package, pnpm
  # Stages: check, lint, test

  local failed=0
  local target_dir="$ROOT_DIR/node_modules"

  if ! ff::dir_exists "$target_dir"; then
    log INFO "ℹ️ Skipping check — node_modules directory does not exist"
    return 0
  fi

  ff::all_files "$target_dir" | while read -r file; do
    [[ -L "$file" && ! -e "$file" ]] || continue
    log::mark_failed_with_tip \
      "FATAL" \
      "Broken symlink detected in node_modules: $file" \
      "Try reinstalling modules to restore missing links" \
      "pnpm install --force"
  done

  log::fail_check_or_log_success "No broken symlinks found in node_modules"
}

# ------------------------------------------------------------------------------
# 🧪 check::leftover_sqlite_artifacts — Detect local dev SQLite files from D1
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Recursively scans for .wrangler/state/*.sqlite* anywhere in the repo
#   - Warns on leftover D1 local artifacts that should not be checked in
#
# Why it matters:
#   Wrangler creates .sqlite files when running D1 locally. These are transient
#   and should never be committed or left behind in CI or deployment builds.
#
# Globals used:
#   - ROOT_DIR → absolute path to the monorepo root
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::leftover_sqlite_artifacts
#
# Categories:
#   cloudflare:d1, ci, infra
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::leftover_sqlite_artifacts() {
  # ✅ Check: Detect any .wrangler/state/*.sqlite* files under packages/products
  # Category: cloudflare:d1, ci, infra
  # Stages: check, lint

  local failed=0
  local base_path="$ROOT_DIR/packages/products"

  if ! ff::dir_exists "$base_path"; then
    log INFO "ℹ️ Skipping check — directory not found: $base_path"
    return 0
  fi

  find "$base_path" -type f -path '*/.wrangler/state/*.sqlite*' 2>/dev/null | while read -r file; do
    [[ -z "$file" ]] && continue
    log::mark_failed_with_tip \
      "WARN" \
      "Detected leftover SQLite artifact: $file" \
      "Wrangler creates these locally for D1 — remove before commit or CI" \
      "rm -rf '$file'"
  done

  log::fail_check_or_log_success "No leftover Wrangler SQLite artifacts found under $base_path"
}

