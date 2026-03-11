# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_file_present — Ensure pnpm-workspace.yaml exists
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies the presence of pnpm-workspace.yaml in the monorepo root
#   - Ensures workspace definitions are correctly established for pnpm
#
# Why it matters:
#   pnpm workspaces require a pnpm-workspace.yaml file to link packages,
#   manage dependencies, and enable proper monorepo operations.
#
# Globals used:
#   - ROOT_DIR → absolute path to the monorepo root
#
# Example:
#   ROOT_DIR="/path/to/repo"
#   check::pnpm_workspace_file_present
#
# Categories:
#   package, pnpm, ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::pnpm_workspace_file_present() {
  # ✅ Check: Ensure pnpm-workspace.yaml exists at the root
  # Category: package, pnpm, ci
  # Stages: lint, check

  local failed=0

  ff::file_required "$ROOT_DIR/pnpm-workspace.yaml" \
    "pnpm-workspace.yaml" \
    "Create it using \`pnpm init -w\` or commit it to your repo" \
    "pnpm init -w && echo -e 'packages:\\n  - packages/*' > pnpm-workspace.yaml" || failed=1

  log::fail_check_or_log_success "pnpm-workspace.yaml exists at repo root"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_structure — Validate pnpm-workspace.yaml structure
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures the 'packages:' field exists and is a non-empty array
#   - Prevents workspace misconfiguration that breaks monorepo linking
#
# Why it matters:
#   A missing or malformed 'packages:' field disables pnpm's workspace behavior,
#   breaks dependency linking, and disables tooling across packages.
#
# Globals used:
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_structure
#
# Categories:
#   pnpm, package, ci
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::pnpm_workspace_structure() {
  # ✅ Check: `packages:` field must be a non-empty array
  # Category: pnpm, package, ci
  # Stages: lint, check, build

  local failed=0
  local packages=()

  ff::file_required "$WORKSPACE_FILE" \
    "pnpm-workspace.yaml" \
    "Define your workspace packages in this file for pnpm to work correctly" \
    "Example: packages:\n  - packages/*" || failed=1

  ff::yq_array '.packages[]' "$WORKSPACE_FILE" packages || {
    log::mark_failed_with_tip FATAL "'packages:' must be a YAML array in $WORKSPACE_FILE" \
      "Use list format with dashes like: packages:\n  - packages/*" \
      "packages:\n  - 'packages/*'\n  - 'apps/*'"
  }

  if [[ "${#packages[@]}" -eq 0 ]]; then
    log::mark_failed_with_tip FATAL "'packages:' array is empty — no workspace globs defined" \
      "Add at least one valid glob entry under 'packages:'" \
      "packages:\n  - 'packages/*'"
  fi

  log::fail_check_or_log_success "'packages:' field is valid in pnpm-workspace.yaml"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_globs_resolve — Ensure all pnpm workspace globs resolve
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies each glob in pnpm-workspace.yaml resolves to at least one valid package.json
#   - Prevents silently broken monorepo setups due to unmatched globs
#
# Why it matters:
#   Invalid or unmatched workspace globs can break dependency linking,
#   cause missed builds, and silently fail CI validation logic.
#
# Globals used:
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml
#   - ROOT_DIR → absolute path to the monorepo root
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_globs_resolve
#
# Categories:
#   pnpm, package, ci, paths
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::pnpm_workspace_globs_resolve() {
  # ✅ Check: All workspace globs resolve to valid package.json paths
  # Category: pnpm, package, ci, paths
  # Stages: lint, check, build

  local failed=0
  local globs=()
  ff::yq_array '.packages[]' "$WORKSPACE_FILE" globs || {
    log::mark_failed_with_tip FATAL "Unable to parse 'packages:' array in $WORKSPACE_FILE" \
      "Ensure 'packages:' is defined and is a valid YAML list" \
      "packages:\n  - 'packages/*'\n  - 'apps/*'"
  }

  for glob in "${globs[@]}"; do
    local matches=()
    ff::map_array matches fd --glob 'package.json' "$glob" "$ROOT_DIR" --exclude node_modules --exclude dist --exclude build || continue

    if [[ "${#matches[@]}" -eq 0 ]]; then
      log::mark_failed_with_tip FATAL "Glob '$glob' does not resolve to any package.json" \
        "Confirm the path matches a valid folder with package.json" \
        "If using 'packages/*', ensure 'packages/utils/package.json' exists"
    else
      for pkg in "${matches[@]}"; do
        case "$pkg" in
          *node_modules*|*dist*|*build*)
            log WARN "⚠️ Skipping ignored match: $pkg"
            ;;
          *)
            log INFO "✅ Matched package.json from '$glob': $pkg"
            ;;
        esac
      done
    fi
  done

  log::fail_check_or_log_success "All pnpm workspace globs resolve to valid package.json paths"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_globs_relative — Disallow absolute paths in workspace globs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures every workspace entry in pnpm-workspace.yaml uses a relative path
#   - Flags any entry that starts with an absolute path (e.g. /apps/*)
#
# Why it matters:
#   Absolute globs are invalid in pnpm workspaces and will silently break detection,
#   leading to missing packages, improper linking, and broken monorepo workflows.
#
# Globals used:
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_globs_relative
#
# Categories:
#   pnpm, package, lint, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::pnpm_workspace_globs_relative() {
  # ✅ Check: workspace globs must use relative paths
  # Category: pnpm, package, lint, paths
  # Stages: lint, check

  local failed=0
  local globs=()
  ff::yq_array '.packages[]' "$WORKSPACE_FILE" globs || {
    log::mark_failed_with_tip FATAL "Failed to read workspace globs from $WORKSPACE_FILE" \
      "Ensure 'packages:' is a valid YAML array" \
      "packages:\n  - 'packages/*'"
    return 1
  }

  for glob in "${globs[@]}"; do
    case "$glob" in
      /*)
        log::mark_failed_with_tip FATAL "Absolute path not allowed in workspace glob: $glob" \
          "Use relative globs like './apps/*' or 'packages/*' instead" \
          "packages:\n  - './apps/*'\n  - 'packages/*'"
        ;;
    esac
  done

  log::fail_check_or_log_success "All workspace globs in $WORKSPACE_FILE use relative paths"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_yaml_valid — Validate pnpm-workspace.yaml syntax
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures the file exists using ff::file_required
#   - Confirms it parses using ff::yq_array
#
# Why it matters:
#   Invalid YAML breaks pnpm, leads to missing packages, and derails CI pipelines.
#
# Globals used:
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_yaml_valid
#
# Categories:
#   pnpm, package, lint, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::pnpm_workspace_yaml_valid() {
  # ✅ Check: pnpm-workspace.yaml must parse correctly
  # Category: pnpm, package, lint, encoding
  # Stages: lint, check

  local failed=0

  ff::file_required "$WORKSPACE_FILE" \
    "pnpm-workspace.yaml" \
    "Ensure your monorepo root includes a valid pnpm-workspace.yaml" \
    "echo -e 'packages:\\n  - packages/*' > pnpm-workspace.yaml" || failed=1

  local parsed=()
  ff::yq_array '.packages[]' "$WORKSPACE_FILE" parsed || {
    log::mark_failed_with_tip FATAL "Failed to parse $WORKSPACE_FILE — invalid YAML structure or syntax" \
      "Use \`yq e . $WORKSPACE_FILE\` to validate syntax locally" \
      "Fix indentation or quoting issues in pnpm-workspace.yaml"
  }

  log::fail_check_or_log_success "$WORKSPACE_FILE parses successfully with no YAML errors"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_no_duplicate_globs — Detect duplicate workspace globs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parses the `packages:` field in pnpm-workspace.yaml using ff::yq_array
#   - Fails if any globs are defined more than once
#
# Why it matters:
#   Duplicate globs can break package resolution, cause conflicts during linking,
#   and lead to unpredictable monorepo behavior. Each workspace path must be unique.
#
# Globals used:
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_no_duplicate_globs
#
# Categories:
#   pnpm, package, lint, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::pnpm_workspace_no_duplicate_globs() {
  # ✅ Check: No duplicate globs in pnpm-workspace.yaml
  # Category: pnpm, package, lint, paths
  # Stages: lint, check

  local failed=0
  local globs=()

  ff::file_required "$WORKSPACE_FILE" \
    "pnpm-workspace.yaml" \
    "Create one using \`pnpm init -w\`" \
    "echo -e 'packages:\\n  - packages/*' > pnpm-workspace.yaml" || failed=1

  ff::yq_array '.packages[]' "$WORKSPACE_FILE" globs || {
    log::mark_failed_with_tip FATAL "Could not parse workspace globs from $WORKSPACE_FILE" \
      "Ensure the 'packages:' section is a valid YAML array" \
      "packages:\n  - 'packages/*'"
  }

  local seen=()
  local duplicates=()

  for glob in "${globs[@]}"; do
    if printf '%s\n' "${seen[@]}" | grep -qxF "$glob"; then
      duplicates+=("$glob")
    else
      seen+=("$glob")
    fi
  done

  if (( ${#duplicates[@]} > 0 )); then
    for dup in "${duplicates[@]}"; do
      log::mark_failed_with_tip FATAL "Duplicate workspace glob: $dup" \
        "Each glob under 'packages:' must be unique" \
        "packages:\n  - 'apps/*'  # only once"
    done
  fi

  log::fail_check_or_log_success "No duplicate workspace globs found in $WORKSPACE_FILE"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_package_json_presence — Ensure package.json exists for each workspace
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures each workspace glob defined in pnpm-workspace.yaml resolves to at least one package.json
#
# Why it matters:
#   Missing package.json files break workspace resolution, dependency linking,
#   and can cause CI and local tooling to silently ignore packages.
#
# Globals used:
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml
#   - ROOT_DIR → monorepo root directory
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_package_json_presence
#
# Categories:
#   pnpm, package, paths, ci
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::pnpm_workspace_package_json_presence() {
  # ✅ Check: Each workspace glob must resolve to one or more package.json files
  # Category: pnpm, package, paths, ci
  # Stages: lint, check, build

  local failed=0
  local globs=()
  local all_packages=()

  ff::file_required "$WORKSPACE_FILE" \
    "pnpm-workspace.yaml" \
    "Create it with \`pnpm init -w\` or define the workspace globs manually" \
    "echo -e 'packages:\\n  - packages/*' > pnpm-workspace.yaml" || failed=1

  ff::yq_array '.packages[]' "$WORKSPACE_FILE" globs || {
    log::mark_failed_with_tip FATAL "Failed to parse workspace globs from $WORKSPACE_FILE" \
      "Ensure 'packages:' is a valid YAML array" \
      "packages:\n  - 'packages/*'"
  }

  ff::map_array all_packages ff::find "" json --refresh

  for glob in "${globs[@]}"; do
    local matched=0
    for file in "${all_packages[@]}"; do
      case "$file" in
        "$ROOT_DIR"/$glob/package.json|"$ROOT_DIR"/$glob/*/package.json)
          matched=1
          break
          ;;
      esac
    done

    if [[ "$matched" -eq 0 ]]; then
      log::mark_failed_with_tip FATAL "No package.json found under workspace glob: $glob" \
        "Ensure each defined workspace path includes at least one valid package" \
        "mkdir -p $glob/my-lib && echo '{ \"name\": \"my-lib\" }' > $glob/my-lib/package.json"
    fi
  done

  log::fail_check_or_log_success "All workspace globs resolve to one or more valid package.json files"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_excludes_node_modules — Validate workspace globs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures no entry under `packages:` in pnpm-workspace.yaml contains node_modules
#   - Prevents performance issues and incorrect behavior caused by invalid glob expansion
#
# Why it matters:
#   Including node_modules in workspace globs causes serious resolution failures,
#   broken dependency trees, and degraded performance in pnpm-based monorepos.
#
# Globals used:
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml (default: $ROOT_DIR/pnpm-workspace.yaml)
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_excludes_node_modules
#
# Categories:
#   pnpm, package, ci, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::pnpm_workspace_excludes_node_modules() {
  # ✅ Check: Workspace globs must not include node_modules
  # Category: pnpm, package, ci, lint
  # Stages: lint, check

  local failed=0
  local file="${WORKSPACE_FILE:-$ROOT_DIR/pnpm-workspace.yaml}"
  local globs=()

  ff::file_required "$file" \
    "pnpm-workspace.yaml" \
    "Run \`pnpm init -w\` to initialize the workspace" \
    "echo -e 'packages:\\n  - packages/*' > pnpm-workspace.yaml" || failed=1

  ff::yq_array '.packages[]' "$file" globs || {
    log::mark_failed_with_tip FATAL "Unable to parse 'packages:' field in $file" \
      "Ensure it's a valid YAML list of globs" \
      "packages:\n  - 'packages/*'\n  - 'apps/*'"
  }

  for g in "${globs[@]}"; do
    case "$g" in
      *node_modules* )
        log::mark_failed_with_tip FATAL "Invalid workspace glob includes 'node_modules': $g" \
          "Remove or update globs to exclude node_modules directories" \
          "packages:\n  - 'apps/*'\n  # ❌ Avoid: 'apps/**/node_modules/*'"
        ;;
    esac
  done

  log::fail_check_or_log_success "No workspace globs include 'node_modules' in $file"
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

  local file="$ROOT_DIR/pnpm-lock.yaml"

  ff::file_required "$file" "pnpm-lock.yaml" \
    "Run \`pnpm install\` to generate the lockfile" \
    "pnpm install" || return 1

  if ! ff::yq_contains 'has("dependencies")' '.' "$file"; then
    log::mark_failed_with_tip FATAL "pnpm-lock.yaml is missing a top-level 'dependencies' key" \
      "Ensure the lockfile is fully generated and contains resolved dependencies" \
      "pnpm install"
    return 1
  fi

  log::fail_check_or_log_success "pnpm-lock.yaml exists and contains a valid 'dependencies' section"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_globs_no_trailing_slash — Enforce no trailing slashes
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures that all entries in `packages:` do not end with a `/`
#   - Prevents subtle workspace matching issues caused by glob slashes
#
# Why it matters:
#   Trailing slashes in workspace globs are unnecessary and can break
#   resolution in tooling like pnpm, IDEs, and CI systems.
#
# Globals used:
#   - WORKSPACE_FILE → Path to pnpm-workspace.yaml (default: $ROOT_DIR/pnpm-workspace.yaml)
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_globs_no_trailing_slash
#
# Categories:
#   pnpm, package, lint, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::pnpm_workspace_globs_no_trailing_slash() {
  # ✅ Check: workspace globs must not end with a trailing slash
  # Category: pnpm, package, lint, paths
  # Stages: lint, check

  local workspace_file="${WORKSPACE_FILE:-$ROOT_DIR/pnpm-workspace.yaml}"
  local globs=()

  ff::file_required "$workspace_file" "pnpm-workspace.yaml" \
    "Run \`pnpm init -w\` to create a pnpm-workspace.yaml file" \
    "echo -e 'packages:\\n  - packages/*' > pnpm-workspace.yaml" || return 1

  ff::yq_array '.packages[]' "$workspace_file" globs || {
    log::mark_failed_with_tip FATAL "Unable to read workspace globs from $workspace_file" \
      "Ensure 'packages:' is a valid YAML array of strings" \
      "packages:\n  - packages/*\n  - apps/*"
    return 1
  }

  local failed=0

  for g in "${globs[@]}"; do
    case "$g" in
      */)
        log::mark_failed_with_tip FATAL "Invalid workspace glob with trailing slash: $g" \
          "Remove trailing slashes from globs" \
          "packages:\n  - packages/*\n  - apps/*"
        ;;
    esac
  done

  log::fail_check_or_log_success "All workspace globs in $workspace_file are free of trailing slashes"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_globs_exclude_test_dirs — Prevent inclusion of non-package dirs in pnpm workspace globs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures that pnpm-workspace.yaml does not include test, fixtures, or examples in workspace globs
#   - Fails if any matching path is detected in the `packages:` array
#
# Why it matters:
#   Including non-package directories like tests or fixtures in workspace globs can break
#   dependency resolution, link invalid folders, and confuse workspace tooling.
#
# Globals used:
#   - ROOT_DIR → path to the monorepo root
#
# Example:
#   ROOT_DIR="/repo"
#   check::pnpm_globs_exclude_test_dirs
#
# Categories:
#   pnpm, package, paths, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::pnpm_globs_exclude_test_dirs() {
  # ✅ Check: workspace globs must exclude test/, fixtures/, examples/
  # Category: pnpm, package, paths, lint
  # Stages: lint, check

  local workspace_file="$ROOT_DIR/pnpm-workspace.yaml"
  local globs=()

  ff::file_required "$workspace_file" "pnpm-workspace.yaml" \
    "Ensure the file exists and defines only valid package globs" \
    "packages:\n  - packages/*\n  - apps/*" || return 1

  ff::yq_array '.packages[]' "$workspace_file" globs || {
    log::mark_failed_with_tip FATAL "Unable to read workspace globs from $workspace_file" \
      "Ensure 'packages:' is a valid YAML array of strings" \
      "packages:\n  - packages/*\n  - apps/*"
    return 1
  }

  local failed=0

  for g in "${globs[@]}"; do
    if [[ "$g" =~ (^|/)(test|tests|fixtures|examples)(/|$) ]]; then
      log::mark_failed_with_tip FATAL "pnpm workspace glob includes invalid directory: $g" \
        "Only include actual package roots, not test or fixture folders" \
        "packages:\n  - packages/*\n  - apps/*"
    fi
  done

  log::fail_check_or_log_success "All pnpm workspace globs exclude tests, fixtures, and examples"
}

# ------------------------------------------------------------------------------
# 🧪 check::workspace_paths_exist — Ensure all workspace paths resolve to directories
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies that each glob declared in `pnpm-workspace.yaml` resolves to a real directory
#   - Fails on missing, misspelled, or deleted folders
#
# Why it matters:
#   Invalid paths in pnpm-workspace.yaml break workspace detection, tooling,
#   dependency linking, and deployment workflows.
#
# Globals used:
#   - ROOT_DIR → Project root (assumes pnpm-workspace.yaml is in $ROOT_DIR)
#
# Example:
#   ROOT_DIR="/repo"
#   check::workspace_paths_exist
#
# Categories:
#   pnpm, package, paths, ci
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::workspace_paths_exist() {
  # ✅ Check: All workspace paths declared in pnpm-workspace.yaml must exist
  # Category: pnpm, package, paths, ci
  # Stages: lint, check, build

  local workspace_file="$ROOT_DIR/pnpm-workspace.yaml"
  local globs=()

  ff::file_required "$workspace_file" "pnpm-workspace.yaml" \
    "Run \`pnpm init -w\` or define a valid 'packages:' array" \
    "packages:\n  - packages/*\n  - apps/*" || return 1

  ff::yq_array '.packages[]' "$workspace_file" globs || {
    log::mark_failed_with_tip FATAL "Unable to read workspace globs from $workspace_file" \
      "Ensure 'packages:' is defined as a YAML array of string globs" \
      "packages:\n  - packages/*\n  - apps/*"
    return 1
  }

  local failed=0
  for glob in "${globs[@]}"; do
    # Expand glob to absolute paths and check each
    local matches=()
    IFS=$'\n' read -r -d '' -a matches < <(cd "$ROOT_DIR" && compgen -G "$glob" && printf '\0')
    if [[ "${#matches[@]}" -eq 0 ]]; then
      log::mark_failed_with_tip FATAL "No matching directory found for workspace glob: $glob" \
        "Verify the path exists or correct the glob. Globs must match actual folders relative to pnpm-workspace.yaml" \
        "packages:\n  - packages/app\n  - apps/web"
    else
      for m in "${matches[@]}"; do
        ff::dir_exists "$ROOT_DIR/$m" || log::mark_failed_with_tip FATAL "Matched path is not a directory: $m" \
          "Globs must resolve to valid folders, not files or broken paths" \
          "mkdir -p $m && touch $m/package.json"
      done
    fi
  done

  log::fail_check_or_log_success "All workspace globs resolve to existing directories"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_has_schema — Ensure $schema is declared in pnpm-workspace.yaml
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies that pnpm-workspace.yaml contains a $schema line at the top
#   - Prevents missing schema that would disable IDE validation
#
# Why it matters:
#   A missing $schema declaration can break autocomplete, validation, and tooling
#   support in IDEs. This check ensures consistent dev experience across teams.
#
# Globals used:
#   - ROOT_DIR → root of the monorepo
#   - WORKSPACE_FILE → override path to pnpm-workspace.yaml (optional)
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::pnpm_workspace_has_schema
#
# Categories:
#   lint, package, pnpm
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::pnpm_workspace_has_schema() {
  # ✅ Check: pnpm-workspace.yaml declares $schema for language server
  # Category: lint, package, pnpm
  # Stages: lint, check, pre-commit

  local workspace_file="${WORKSPACE_FILE:-$ROOT_DIR/pnpm-workspace.yaml}"
  local required_line="# yaml-language-server: \$schema=./packages/shared/schemas/pnpm/pnpm-workspace.schema.json"

  ff::file_required "$workspace_file" "$workspace_file" \
    "Create a pnpm-workspace.yaml using \`pnpm init -w\` if missing" \
    "echo -e '# yaml-language-server: \$schema=./packages/shared/schemas/pnpm/pnpm-workspace.schema.json\\npackages:\\n  - packages/*' > $workspace_file" || return 1

  if ! grep -Fxq "$required_line" "$workspace_file"; then
    log::mark_failed_with_tip FATAL "\$schema declaration missing in $workspace_file" \
      "Add the schema comment as the first line to enable IDE validation and autocomplete" \
      "# yaml-language-server: \$schema=./packages/shared/schemas/pnpm/pnpm-workspace.schema.json"
    return 1
  fi

  log::fail_check_or_log_success "\$schema is correctly declared at the top of $workspace_file"
}

# ------------------------------------------------------------------------------
# 🧪 check::pnpm_workspace_glob_duplicates — Detect duplicate entries in pnpm-workspace.yaml
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parses the `packages:` array in pnpm-workspace.yaml
#   - Identifies and fails on any duplicate globs
#
# Why it matters:
#   - Duplicate globs can lead to confusion in dependency resolution and redundant linking
#   - Prevents ambiguous workspace resolution during `pnpm install`
#
# Globals used:
#   - ROOT_DIR → path to the monorepo root
#
# Example:
#   check::pnpm_workspace_glob_duplicates
#
# Categories:
#   pnpm, paths
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::pnpm_workspace_glob_duplicates() {
  # ✅ Check: Detect duplicate globs in pnpm-workspace.yaml
  # Category: pnpm, paths
  # Stages: check, lint

  local file="$ROOT_DIR/pnpm-workspace.yaml"
  local globs=()

  ff::file_required "$file" "pnpm-workspace.yaml" \
    "This file defines which directories are treated as workspace packages" \
    "touch pnpm-workspace.yaml && echo -e 'packages:\\n  - packages/*' > pnpm-workspace.yaml" || return 1

  ff::yq_array '.packages[]' "$file" globs || {
    log::mark_failed_with_tip FATAL "Unable to read 'packages:' from $file" \
      "Declare workspace folders as a YAML array of strings under the 'packages:' key" \
      "packages:\n  - packages/*\n  - apps/*"
    return 1
  }

  local seen=()
  local dupes=()

  for g in "${globs[@]}"; do
    if [[ " ${seen[*]} " =~ " $g " ]]; then
      dupes+=("$g")
    else
      seen+=("$g")
    fi
  done

  if [[ "${#dupes[@]}" -gt 0 ]]; then
    for d in "${dupes[@]}"; do
      log::mark_failed_with_tip FATAL "Duplicate workspace glob found: $d" \
        "Each workspace glob should appear only once. Remove any repeated entries." \
        "packages:\n  - packages/*\n  - apps/*"
    done
    return 1
  fi

  log::fail_check_or_log_success "No duplicate workspace globs found in $file"
}
