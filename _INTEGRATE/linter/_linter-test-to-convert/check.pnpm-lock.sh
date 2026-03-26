# ------------------------------------------------------------------------------
# 🧪 check::pnpm_lockfile_exists — Ensure deterministic dependency resolution
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies the existence of pnpm-lock.yaml at the root
#   - Fails if missing, as this would lead to nondeterministic installs
#
# Why it matters:
#   Without a lockfile, package installs can drift between machines and CI runs.
#   The lockfile is critical for reproducible builds and audit consistency.
#
# Globals used:
#   - ROOT_DIR → absolute path to the monorepo root
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::pnpm_lockfile_exists
#
# Categories:
#   package, pnpm, ci
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::pnpm_lockfile_exists() {
  # ✅ Check: pnpm-lock.yaml must exist at project root for deterministic installs
  # Category: package, pnpm, ci
  # Stages: lint, check, build

  local file="$ROOT_DIR/pnpm-lock.yaml"

  ff::file_required "$file" "pnpm-lock.yaml" \
    "Run \`pnpm install\` to generate the lockfile and commit it to source control" \
    "pnpm install && git add pnpm-lock.yaml && git commit -m 'Add missing lockfile'"

  log INFO "✅ Lockfile present: $file"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_lockfile_validity — Validate that pnpm-lock.yaml is structurally sound
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies that the pnpm-lock.yaml file exists
#   - Confirms it contains a top-level 'dependencies:' key
#
# Why it matters:
#   A missing or malformed lockfile can cause broken installs, mislinked dependencies,
#   and nondeterministic behavior across dev and CI environments.
#
# Globals used:
#   - ROOT_DIR → path to the monorepo root
#
# Example:
#   ROOT_DIR="/repo"
#   check::pnpm_lockfile_validity
#
# Categories:
#   pnpm, package, ci, encoding
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::pnpm_lockfile_validity() {
  # ✅ Check: pnpm-lock.yaml must exist and contain a dependencies section
  # Category: pnpm, package, ci, encoding
  # Stages: lint, check, build

  local lockfile="$ROOT_DIR/pnpm-lock.yaml"

  ff::file_required "$lockfile" "pnpm-lock.yaml" \
    "Run \`pnpm install\` to generate the lockfile at the root" \
    "pnpm install && git add pnpm-lock.yaml && git commit -m 'Add missing lockfile'" || return 1

  if ! ff::yq_contains '.' '^dependencies:' "$lockfile"; then
    log::mark_failed_with_tip FATAL \
      "$lockfile appears malformed — missing top-level 'dependencies:'" \
      "Regenerate the lockfile using \`pnpm install\` to fix any corruption" \
      "rm pnpm-lock.yaml && pnpm install"
  fi

  log::fail_check_or_log_success "pnpm-lock.yaml exists and contains a valid 'dependencies:' section"
}

# ------------------------------------------------------------------------------
# 🧪 check::lockfile_consistency — Ensure lockfile matches package.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Runs `pnpm install --frozen-lockfile` to ensure lockfile is in sync
#   - Fails if any mismatch between package.json and pnpm-lock.yaml is detected
#
# Why it matters:
#   Out-of-sync lockfiles lead to nondeterministic installs in CI and dev,
#   causing subtle bugs, security drift, and missed dependency updates.
#
# Globals used:
#   - ROOT_DIR → root of the project or monorepo
#
# Example:
#   ROOT_DIR="/repo"
#   check::lockfile_consistency
#
# Categories:
#   pnpm, package, ci, safety
#
# Stages:
#   test, build, check
# ------------------------------------------------------------------------------
check::lockfile_consistency() {
  # ✅ Check: Lockfile must be in sync with package.json declarations
  # Category: pnpm, package, ci, safety
  # Stages: test, build, check

  local failed=0

  if ! pnpm install --frozen-lockfile &>/dev/null; then
    log::mark_failed_with_tip FATAL \
      "Lockfile is out of sync with one or more package.json files" \
      "Run \`pnpm install\` to regenerate and re-lock all dependencies" \
      "pnpm install && git add pnpm-lock.yaml && git commit -m 'Fix lockfile mismatch'"
  fi

  log::fail_check_or_log_success "Lockfile is consistent with all workspace package.json files"
}

# ------------------------------------------------------------------------------
# 🧪 check::lockfile_no_local_links — Disallow local file/link dependencies
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Searches pnpm-lock.yaml for any 'file:' or 'link:' dependency entries
#   - Fails if any are found, as they are unsafe for CI and remote environments
#
# Why it matters:
#   Local file or link dependencies are non-portable and break reproducibility
#   in CI/CD, especially when the referenced paths are unavailable or machine-specific.
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   ROOT_DIR="/repo"
#   check::lockfile_no_local_links
#
# Categories:
#   pnpm, package, safety, ci
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::lockfile_no_local_links() {
  # ✅ Check: No local 'file:' or 'link:' dependencies in pnpm-lock.yaml
  # Category: pnpm, package, safety, ci
  # Stages: check, lint, test

  local lockfile="$ROOT_DIR/pnpm-lock.yaml"
  local failed=0

  ff::file_required "$lockfile" "$lockfile" \
    "Lockfile is required for portable installs and must not include local paths" \
    "pnpm install && git add pnpm-lock.yaml" || failed=1

  if grep -qE '(file:|link:)' "$lockfile"; then
    log::mark_failed_with_tip FATAL \
      "Found 'file:' or 'link:' dependencies in $lockfile — these are not allowed in CI" \
      "Replace local dependencies with workspace links or versioned packages" \
      'Use "workspace:*" instead of "file:../lib"'
  fi

  log::fail_check_or_log_success "No 'file:' or 'link:' dependencies found in $lockfile"
}

# ------------------------------------------------------------------------------
# 🧪 check::lockfile_no_unpinned_git_shas — Disallow unpinned GitHub SHAs in lockfile
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects github.com dependencies using branch references in pnpm-lock.yaml
#   - Fails if any are found, as they are nondeterministic and unsafe for CI
#
# Why it matters:
#   Git dependencies referencing branches like #main or #master are unstable.
#   They allow upstream changes to silently affect builds and break reproducibility.
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   ROOT_DIR="/repo"
#   check::lockfile_no_unpinned_git_shas
#
# Categories:
#   pnpm, package, safety, ci
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::lockfile_no_unpinned_git_shas() {
  # ✅ Check: pnpm-lock.yaml must not contain GitHub branch references
  # Category: pnpm, package, safety, ci
  # Stages: check, lint, test

  local lockfile="$ROOT_DIR/pnpm-lock.yaml"
  local failed=0

  ff::file_required "$lockfile" "$lockfile" \
    "GitHub dependencies must be pinned to a specific SHA to avoid upstream drift" \
    "github.com/org/repo#abcdef1234567890" || failed=1

  if grep -qE 'github\.com.*#(main|master|next|canary|[^a-fA-F0-9]{6,})' "$lockfile"; then
    log::mark_failed_with_tip FATAL \
      "Unpinned GitHub dependency detected in $lockfile" \
      "Use exact commit SHAs instead of branches for GitHub dependencies" \
      "github.com/org/repo#8fef8ab"
  fi

  log::fail_check_or_log_success "No unpinned GitHub dependencies found in $lockfile"
}
