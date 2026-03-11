# ------------------------------------------------------------------------------
# 🧪 check::package_json_name_presence — Ensure all workspace package.json files define a valid "name"
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Uses workspace globs to find package.json files
#   - Ensures each has a non-empty "name" field
#
# Why it matters:
#   Required for workspace resolution, publishing, linking, and CI correctness.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml or root package.json
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::package_json_name_presence
#
# Categories:
#   package, pnpm, ci
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::package_json_name_presence() {
  # ✅ Check: All workspace package.json files must define a non-empty "name"
  # Category: package, pnpm, ci
  # Stages: lint, check, build

  local failed=0
  local pkg_globs=()
  ff::yq_array '.packages[]' "$WORKSPACE_FILE" pkg_globs

  for pattern in "${pkg_globs[@]}"; do
    local pkgs=()
    ff::map_array pkgs fd 'package.json' "$ROOT_DIR/$pattern" -d 2

    for pkg in "${pkgs[@]}"; do
      local name
      name=$(ff::yq_list '.name // ""' "$pkg" | head -n1)

      if [[ -z "$name" ]]; then
        log::mark_failed_with_tip FATAL \
          "Missing 'name' in $pkg" \
          "Each workspace package.json must define a valid 'name'" \
          "{ \"name\": \"@your-org/pkg\" }"
      fi
    done
  done

  log::fail_check_or_log_success "All workspace package.json files define a valid 'name'"
}

# ------------------------------------------------------------------------------
# 🧪 check::duplicate_package_names — Ensure all packages have unique names
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all package.json files in the workspace
#   - Fails if any duplicate "name" fields are found
#
# Why it matters:
#   Duplicate package names break workspace linking, cause dependency resolution
#   ambiguity, and can result in incorrect installs or runtime behavior.
#
# Globals used:
#   - ROOT_DIR → root of the monorepo
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::duplicate_package_names
#
# Categories:
#   package, pnpm, ci
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::duplicate_package_names() {
  # ✅ Check: No duplicate package names across package.json files
  # Category: package, pnpm, ci
  # Stages: lint, check, build

  local failed=0
  local pkg_globs=()
  ff::yq_array '.packages[]' "$WORKSPACE_FILE" pkg_globs

  declare -A seen=()
  declare -A seen_paths=()

  for pattern in "${pkg_globs[@]}"; do
    local pkgs=()
    ff::map_array pkgs fd 'package.json' "$ROOT_DIR/$pattern" -d 2

    for pkg in "${pkgs[@]}"; do
      local name
      name=$(ff::yq_list '.name // ""' "$pkg" | head -n1)
      if [[ -z "$name" ]]; then
        continue
      fi

      if [[ -n "${seen[$name]:-}" ]]; then
        log::mark_failed_with_tip FATAL \
          "Duplicate package name: $name" \
          "Package names must be unique across the workspace" \
          "$name appears in both:\n  ↳ ${seen_paths[$name]}\n  ↳ $pkg"
        failed=1
      else
        seen["$name"]=1
        seen_paths["$name"]="$pkg"
      fi
    done
  done

  log::fail_check_or_log_success "All package.json names are unique"
}

# ------------------------------------------------------------------------------
# 🧪 check::workspace_package_names_valid — Enforce valid package names in package.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all workspace package.json files have a valid "name" field
#   - Enforces npm-compatible naming patterns (lowercase, optional @scope/)
#
# Why it matters:
#   Invalid or missing package names break workspace linking and publishing,
#   and can silently fail in CI/CD or local tooling.
#
# Globals used:
#   - ROOT_DIR → path to the root of the monorepo
#   - WORKSPACE_FILE → pnpm-workspace.yaml path
#
# Example:
#   WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml"
#   check::workspace_package_names_valid
#
# Categories:
#   package, pnpm, naming, ci
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::workspace_package_names_valid() {
  # ✅ Check: all workspace package.json names must follow naming convention
  # Category: package, pnpm, naming, ci
  # Stages: lint, check, build

  local failed=0
  local pkg_globs=()
  ff::yq_array '.packages[]' "$WORKSPACE_FILE" pkg_globs

  for pattern in "${pkg_globs[@]}"; do
    local pkgs=()
    ff::map_array pkgs fd 'package.json' "$ROOT_DIR/$pattern" -d 2

    for pkg in "${pkgs[@]}"; do
      [[ -z "$pkg" ]] && continue

      local name
      name=$(ff::yq_list '.name // ""' "$pkg" | head -n1)

      if [[ -z "$name" ]]; then
        log::mark_failed_with_tip FATAL \
          "package.json missing 'name': $pkg" \
          "Each package must declare a valid name for workspace resolution" \
          "{ \"name\": \"@your-org/utils-lib\" }"
        failed=1
        continue
      fi

      if [[ ! "$name" =~ ^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$ ]]; then
        log::mark_failed_with_tip FATAL \
          "Invalid package name in $pkg: \"$name\"" \
          "Use lowercase, hyphens, underscores, dots, and optional scope (e.g. @scope/name)" \
          "@your-org/core-utils"
        failed=1
      fi
    done
  done

  log::fail_check_or_log_success "All workspace package.json files contain valid 'name' fields"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_package_license — Ensure all packages declare a valid license
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures each package.json includes a `license` field
#   - Confirms the license string matches the canonical LICENSE in /docs/en-US
#   - Warns if license is missing or mismatched
#
# Why it matters:
#   Projects without valid SPDX-compliant license metadata may face legal risks,
#   and license mismatches can violate open-source compliance policies.
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::validate_package_license
#
# Categories:
#   lint, package, paths, ci
#
# Stages:
#   lint, check, integration
# ------------------------------------------------------------------------------
check::validate_package_license() {
  # ✅ Check: All package.json files must declare and match project-wide license
  # Category: lint, package, paths, ci
  # Stages: lint, check, integration

  local failed=0
  local license_file="$ROOT_DIR/docs/en-US/LICENSE"

  ff::file_required "$license_file" "LICENSE file" \
    "Define a SPDX license in docs/en-US/LICENSE for validation against packages" \
    "MIT\nApache-2.0\nGPL-3.0"

  local canonical_license
  canonical_license=$(grep -Eo '^(MIT|Apache-2.0|GPL-3.0|BSD-3-Clause)' "$license_file" | head -n1 || true)

  if [[ -z "$canonical_license" ]]; then
    log::mark_failed_with_tip FATAL \
      "Could not determine canonical license from $license_file" \
      "Start your LICENSE file with a SPDX identifier like MIT or Apache-2.0" \
      "MIT"
    return 1
  fi

  local pkg_globs=()
  ff::yq_array '.packages[]' "$WORKSPACE_FILE" pkg_globs

  for pattern in "${pkg_globs[@]}"; do
    local packages=()
    ff::map_array packages fd 'package.json' "$ROOT_DIR/$pattern" -d 2

    for pkg in "${packages[@]}"; do
      local license
      license=$(ff::yq_list '.license // ""' "$pkg" | head -n1)

      if [[ -z "$license" ]]; then
        log::mark_failed_with_tip FATAL \
          "Missing license in $pkg" \
          "Every package.json must declare a license that matches the root project license" \
          "\"license\": \"$canonical_license\""
        failed=1
        continue
      fi

      if [[ "$license" != "$canonical_license" ]]; then
        log::mark_failed_with_tip FATAL \
          "Mismatched license in $pkg (found: $license, expected: $canonical_license)" \
          "Align license with canonical value in docs/en-US/LICENSE" \
          "\"license\": \"$canonical_license\""
        failed=1
      fi
    done
  done

  log::fail_check_or_log_success "All package.json licenses match: $canonical_license"
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_package_scope — Ensure all package.json names use the required scope
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures each package.json defines a "name" field
#   - Validates that each "name" begins with the required scope (e.g., @my-company/)
#
# Why it matters:
#   - Prevents naming collisions in monorepos and registries
#   - Enforces publishing conventions and namespace discipline
#   - Improves discoverability and consistency of internal packages
#
# Globals used:
#   - ROOT_DIR → absolute path to monorepo root
#   - WORKSPACE_FILE → path to pnpm-workspace.yaml
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::enforce_package_scope
#
# Categories:
#   package, lint, naming
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::enforce_package_scope() {
  # ✅ Check: All package.json names must begin with the required scope
  # Category: package, lint, naming
  # Stages: lint, check, build

  local failed=0
  local required_scope="@my-company/"
  local pkg_globs=()
  ff::yq_array '.packages[]' "$WORKSPACE_FILE" pkg_globs

  for pattern in "${pkg_globs[@]}"; do
    local pkgs=()
    ff::map_array pkgs fd 'package.json' "$ROOT_DIR/$pattern" -d 2

    for pkg in "${pkgs[@]}"; do
      local name
      name=$(ff::yq_list '.name // ""' "$pkg" | head -n1)

      if [[ -z "$name" ]]; then
        log::mark_failed_with_tip FATAL \
          "Missing 'name' in $pkg" \
          "Every package.json must include a scoped name" \
          "\"name\": \"${required_scope}analytics\""
        failed=1
        continue
      fi

      if [[ "$name" != ${required_scope}* ]]; then
        log::mark_failed_with_tip FATAL \
          "Package name '$name' in $pkg does not start with required scope '$required_scope'" \
          "Prefix all internal packages with the approved namespace" \
          "\"name\": \"${required_scope}analytics\""
        failed=1
      fi
    done
  done

  log::fail_check_or_log_success "All package.json names begin with required scope: $required_scope"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_package_type_consistency — Enforce consistent "type" field
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures sibling packages under the same group (e.g., products, shared)
#     use a consistent `"type"` field in package.json (e.g., "module", "commonjs")
#
# Why it matters:
#   - Mixed module types within a group can cause runtime errors, tooling conflicts,
#     and inconsistent import behavior across build tools (ESM vs CJS).
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::validate_package_type_consistency
#
# Categories:
#   package, tsconfig, lint
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::validate_package_type_consistency() {
  # ✅ Check: All sibling packages use the same "type" field in package.json
  # Category: package, tsconfig, lint
  # Stages: check, lint, test

  local failed=0
  local group_dirs=()
  ff::map_array group_dirs fd . "$ROOT_DIR/packages" --type d --exact-depth 2

  for group_dir in "${group_dirs[@]}"; do
    declare -A type_counts=()
    local pkgs=()
    ff::map_array pkgs ff::find package json --refresh

    # filter only under this group_dir
    local group_pkgs=()
    for pkg in "${pkgs[@]}"; do
      [[ "$pkg" == "$group_dir/"* ]] && group_pkgs+=("$pkg")
    done

    [[ "${#group_pkgs[@]}" -eq 0 ]] && continue

    for pkg in "${group_pkgs[@]}"; do
      local type
      type=$(ff::yq_list '.type // "commonjs"' "$pkg" | head -n1)
      [[ -n "$type" ]] && ((type_counts["$type"]++))
    done

    if (( ${#type_counts[@]} > 1 )); then
      log FATAL "❌ Inconsistent 'type' fields found in sibling packages under: $group_dir"
      for pkg in "${group_pkgs[@]}"; do
        local t
        t=$(ff::yq_list '.type // "commonjs"' "$pkg" | head -n1)
        log FATAL "   ↳ $pkg → type: $t"
      done
      log FATAL "   💡 Tip: Use the same 'type' value across all sibling packages to avoid module resolution issues"
      log FATAL "   📘 Example: Set all to \"type\": \"module\" or \"commonjs\" consistently"
      failed=1
    fi
  done

  log::fail_check_or_log_success "All sibling package groups use consistent 'type' fields"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_package_bin_targets — Ensure bin entries point to valid executables
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Confirms all bin paths defined in a package.json exist on disk
#   - Ensures bin targets are marked as executable
#
# Why it matters:
#   - Prevents broken CLI behavior for consumers of packages
#   - Ensures correct execution permissions for all published CLI tools
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::validate_package_bin_targets
#
# Categories:
#   package, lint, ci
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::validate_package_bin_targets() {
  # ✅ Check: All bin targets in package.json exist and are executable
  # Category: package, lint, ci
  # Stages: check, lint, test

  local failed=0
  local pkgs=()
  ff::map_array pkgs ff::find package json --refresh

  for pkg_file in "${pkgs[@]}"; do
    local pkg_dir="$ROOT_DIR/$(dirname "$pkg_file")"
    local bin_paths=()
    local bin_keys=()

    # Load bin entries from JSON
    if jq -e '.bin | type == "string"' "$pkg_file" &>/dev/null; then
      bin_paths+=("$(jq -r '.bin' "$pkg_file")")
      bin_keys+=(".bin")

    elif jq -e '.bin | type == "object"' "$pkg_file" &>/dev/null; then
      while IFS=$'\t' read -r key value; do
        bin_keys+=("$key")
        bin_paths+=("$value")
      done < <(jq -r '.bin | to_entries[] | "\(.key)\t\(.value)"' "$pkg_file")
    fi

    for i in "${!bin_paths[@]}"; do
      local rel_path="${bin_paths[$i]}"
      local abs_path="$pkg_dir/$rel_path"

      if [[ ! -f "$abs_path" ]]; then
        log::mark_failed_with_tip FATAL \
          "Missing bin target in: $pkg_file → ${bin_keys[$i]}: \"$rel_path\"" \
          "Ensure the file exists and matches the path in package.json" \
          "$abs_path"
      elif [[ ! -x "$abs_path" ]]; then
        log::mark_failed_with_tip FATAL \
          "Bin target is not executable: $pkg_file → ${bin_keys[$i]}: \"$rel_path\"" \
          "Make the file executable for CLI use" \
          "chmod +x $abs_path"
      fi
    done
  done

  log::fail_check_or_log_success "All bin targets in package.json are present and executable"
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_git_https_dependencies — Block git+https dependencies in package.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects any dependency value starting with `git+https://`
#   - Blocks unpinned GitHub or Git-based dependencies in dependencies/dev/peer/optional
#
# Why it matters:
#   - Git-based dependencies bypass lockfiles and version guarantees
#   - Branch-based refs (e.g., #main) can silently break reproducibility
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_git_https_dependencies
#
# Categories:
#   package, safety
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::disallow_git_https_dependencies() {
  # ✅ Check: No dependencies may use git+https URLs or branch-based refs
  # Category: package, safety
  # Stages: check, lint

  local failed=0
  local pkg_files=()
  ff::map_array pkg_files ff::find package json --refresh

  for pkg in "${pkg_files[@]}"; do
    while IFS=$'\t' read -r key value; do
      log::mark_failed_with_tip FATAL \
        "Disallowed git+https dependency in $pkg → $key: $value" \
        "Replace git+https dependencies with pinned tarballs or published versions" \
        "https://registry.npmjs.org/pkg/-/pkg-1.2.3.tgz"
    done < <(
      jq -r '
        [.dependencies, .devDependencies, .optionalDependencies, .peerDependencies] 
        | map(to_entries[]) 
        | flatten 
        | map(select(.value | test("^git\\+https://"))) 
        | .[] 
        | "\(.key)\t\(.value)"
      ' "$pkg" 2>/dev/null || true
    )
  done

  log::fail_check_or_log_success "No git+https dependencies found in package.json files"
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_ts_node — Disallow ts-node usage in monorepo
# ------------------------------------------------------------------------------
# This function blocks the use of `ts-node` in package.json dependencies or scripts.
#
# Why it matters:
#   - ts-node is slow and introduces runtime compilation inconsistencies
#   - Modern toolchains (Bun, Biome) replace this need
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_ts_node
#
# Categories:
#   lint, tsconfig, package
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_ts_node() {
  # ✅ Check: Block use of ts-node in dependencies or scripts
  # Category: lint, tsconfig, package
  # Stages: lint, check

  local failed=0
  local pkg_files=()
  ff::map_array pkg_files ff::find package json --refresh

  for pkg in "${pkg_files[@]}"; do
    while IFS=$'\t' read -r key value; do
      log::mark_failed_with_tip FATAL \
        "Disallowed ts-node usage in $pkg → $key: $value" \
        "Remove ts-node from scripts and dependencies; use Bun or Biome instead" \
        "pnpm remove ts-node"
    done < <(
      jq -r '
        [.dependencies, .devDependencies, .optionalDependencies, .scripts]
        | map(to_entries[]) 
        | flatten 
        | map(select(.value | test("ts-node"))) 
        | .[] 
        | "\(.key)\t\(.value)"
      ' "$pkg" 2>/dev/null || true
    )
  done

  log::fail_check_or_log_success "No ts-node usage found in package.json files"
}
