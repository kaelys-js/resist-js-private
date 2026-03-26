# ------------------------------------------------------------------------------
# 🧪 check::empty_directories_without_gitkeep — Detect untracked empty dirs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans for empty directories that are not dotfiles
#   - Warns if they lack a .gitkeep or other placeholder
#
# Why it matters:
#   Git does not track empty directories unless a placeholder file is included.
#   Without a .gitkeep or similar file, these directories will disappear on clone.
#
# Globals used:
#   - ROOT_DIR → absolute path to the monorepo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::empty_directories_without_gitkeep
#
# Categories:
#   safety, ci, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::empty_directories_without_gitkeep() {
  # ✅ Check: Empty directories should include a .gitkeep to persist in Git
  # Category: safety, ci, paths
  # Stages: lint, check

  local failed=0

  # Walk all folders from ff::all_files (already excludes binaries/dotfiles)
  cut -d/ -f1- --output-delimiter=/ < <(ff::all_files) | while read -r file; do
    dir=$(dirname "$file")
    [[ -d "$dir" ]] || continue
    find "$dir" -mindepth 1 -type f | grep -q . && continue
    if [[ ! -f "$dir/.gitkeep" ]]; then
      log::mark_failed_with_tip \
        "WARN" \
        "Empty directory missing .gitkeep: $dir" \
        "Add a .gitkeep file to preserve empty directories in Git" \
        "touch \"$dir/.gitkeep\" && git add \"$dir/.gitkeep\""
    fi
  done

  log::fail_check_or_log_success "No untracked empty directories found"
}
