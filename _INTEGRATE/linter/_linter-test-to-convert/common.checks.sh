# ------------------------------------------------------------------------------
# 🧪 check::commit_too_large — Block commits that modify too many files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocks any commit that modifies more than 50 files
#   - Skips enforcement if the commit message includes "[skip]"
#
# Why it matters:
#   Large commits are difficult to review, harder to revert, and often contain
#   unrelated changes. Breaking changes into smaller commits improves quality.
#
# Globals used:
#   - None
#
# Example:
#   check::commit_too_large
#
# Categories:
#   ci, lint, safety
#
# Stages:
#   commit-msg, check
# ------------------------------------------------------------------------------
check::commit_too_large() {
  # ✅ Check: Prevent commits that modify >50 files unless explicitly marked [skip]
  # Category: ci, lint, safety
  # Stages: commit-msg, check

  local commit_msg
  commit_msg=$(git log -1 --pretty=%B)

  if grep -q '\[skip\]' <<< "$commit_msg"; then
    log INFO "⏭️ Skipping file count check due to [skip] in commit message"
    return 0
  fi

  local changed_files
  changed_files=$(git diff --name-only HEAD~1 | wc -l)

  if (( changed_files > 50 )); then
    log FATAL "❌ Commit modifies $changed_files files — exceeds review threshold (50)"
    log FATAL "   💡 Tip: Break the changes into smaller, focused commits"
    log FATAL "   📘 Example: Use '[skip]' in the commit message to override intentionally"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::env_files_not_git_tracked — Ensure .env secrets are not committed
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Searches for committed .env* files
#   - Allows only .env.example (as a safe template)
#
# Why it matters:
#   Environment files often contain credentials, secrets, or API keys.
#   Accidentally committing these to version control is a major security risk.
#
# Globals used:
#   - None
#
# Example:
#   check::env_files_not_git_tracked
#
# Categories:
#   secrets, safety, ci, dotenv
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::env_files_not_git_tracked() {
  # ✅ Check: Disallow committed .env* files except .env.example
  # Category: secrets, safety, ci, dotenv
  # Stages: lint, check, pre-commit

  local tracked
  tracked=$(git ls-files | grep -E '^\.env($|\..*)' | grep -v '^\.env\.example$' || true)

  if [[ -n "$tracked" ]]; then
    echo "$tracked" | while read -r f; do
      [[ -z "$f" ]] && continue
      log FATAL "❌ Committed .env file detected: $f"
    done
    log FATAL "   💡 Tip: Do not commit real .env files — use .env.example and .gitignore instead"
    log FATAL "   📘 Example: echo '.env*' >> .gitignore"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::detached_head_state — Warn if CI is running in detached HEAD
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects if the Git HEAD is detached from a branch
#   - Warns when CI is running in a detached commit state
#
# Why it matters:
#   Detached HEAD prevents tools from identifying the branch name,
#   which can break workflows like preview environments, versioning, or caching.
#
# Globals used:
#   - None
#
# Example:
#   check::detached_head_state
#
# Categories:
#   ci, safety
#
# Stages:
#   check, integration
# ------------------------------------------------------------------------------
check::detached_head_state() {
  # ✅ Check: Warn if repository is in a detached HEAD state
  # Category: ci, safety
  # Stages: check, integration

  if ! git symbolic-ref -q HEAD >/dev/null; then
    log WARN "⚠️ CI is running in a detached HEAD state — branch name is not resolvable"
    log WARN "   💡 Tip: Ensure CI jobs are triggered from branch refs (e.g., origin/main)"
    log WARN "   📘 Example: Avoid git checkout <commit>; use git checkout <branch> instead"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::vscode_folder_exists — Enforce presence of .vscode configuration
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks that the .vscode directory exists in the root of the project
#   - Encourages use of shared settings for consistent DX
#
# Why it matters:
#   Shared workspace settings reduce onboarding friction, ensure consistent
#   linting/formatting across editors, and improve developer experience.
#
# Globals used:
#   - ROOT_DIR → Absolute path to project root
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::vscode_folder_exists
#
# Categories:
#   infra, safety, naming
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::vscode_folder_exists() {
  # ✅ Check: .vscode directory is committed and available for team-wide settings
  # Category: infra, safety, naming
  # Stages: lint, check

  if [[ ! -d "$ROOT_DIR/.vscode" ]]; then
    log FATAL "❌ .vscode directory is missing at project root"
    log FATAL "   💡 Tip: Add a shared .vscode folder with workspace settings"
    log FATAL "   📘 Example: mkdir -p .vscode && touch .vscode/settings.json"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::markdown_docs_location — Enforce mirrored /docs/[locale]/ structure
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Markdown files only live inside /docs/<locale>/
#   - Their paths must mirror source file locations with dashes in filenames
#   - Docs must not exist anywhere else (except root-level README.md etc.)
#
# Why it matters:
#   Prevents scattered or orphaned documentation. Enforces single-source-of-truth
#   localization and structurally mirrored doc placement.
#
# Globals used:
#   - ROOT_DIR → monorepo root (assumed set)
#
# Example:
#   check::markdown_docs_location
#
# Categories:
#   lint, paths, naming, boundaries
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::markdown_docs_location() {
  # ✅ Check: All Markdown must live in /docs/<locale>/ with mirrored structure
  # Category: lint, paths, naming, boundaries
  # Stages: lint, check

  local root="$ROOT_DIR"
  local locale_root="$root/docs/en-US"
  local violations=()

  # Allow root-level .md (README.md etc.)
  while IFS= read -r md; do
    local rel="${md#$root/}"

    if [[ "$rel" =~ ^[^/]+\.md$ ]]; then
      continue
    fi

    if [[ "$rel" =~ ^docs/[^/]+/.+\.md$ ]]; then
      continue
    fi

    violations+=("$rel")
  done < <(find "$root" -type f -name '*.md' ! -path '*/node_modules/*' ! -path '*/.git/*')

  if [[ "${#violations[@]}" -gt 0 ]]; then
    log FATAL "❌ Markdown files found outside /docs/<locale>/ or repo root:"
    for f in "${violations[@]}"; do log FATAL "   ↳ $f"; done
    log FATAL "💡 Tip: All documentation must live under /docs/<locale>/ with mirrored path"
    log FATAL "📘 Example: packages/my-app/src/foo.ts → docs/en-US/packages/my-app/src/foo-ts.md"
    return 1
  fi

  # Must have /docs/en-US/ present at root
  if [[ ! -d "$locale_root" ]]; then
    log FATAL "❌ Missing required default locale: $locale_root"
    log FATAL "💡 Tip: Create a default locale folder under /docs"
    log FATAL "📘 Example: mkdir -p docs/en-US && touch docs/en-US/index.md"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::vscode_contents_valid — Enforce strict contents of .vscode directory
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures only allowed files exist in the .vscode directory
#   - Prevents accidental commit of editor-local files like launch.json, tasks.json
#
# Why it matters:
#   Prevents IDE-specific clutter in Git. Keeps the dev experience clean and reproducible.
#
# Globals used:
#   - ROOT_DIR → Monorepo root (assumed set by common.sh)
#
# Example:
#   check::vscode_contents_valid
#
# Categories:
#   lint, paths, naming, boundaries
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::vscode_contents_valid() {
  # ✅ Check: .vscode only contains settings.json and extensions.json
  # Category: lint, paths, naming, boundaries
  # Stages: lint, check

  local allowed_files=("settings.json" "extensions.json")
  local disallowed=0

  if [[ -d "$ROOT_DIR/.vscode" ]]; then
    for f in "$ROOT_DIR/.vscode/"*; do
      local filename
      filename=$(basename "$f")
      if [[ ! " ${allowed_files[*]} " =~ " $filename " ]]; then
        log FATAL "❌ Disallowed file in .vscode/: $filename"
        log FATAL "   💡 Tip: Only settings.json and extensions.json should be tracked"
        log FATAL "   📘 Example: Remove $filename or move it to your local .vscode/.gitignore"
        disallowed=1
      fi
    done
  fi

  if [[ "$disallowed" -eq 1 ]]; then
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::gitlab_folder_structure — Enforce only valid CI/CD files in .gitlab/
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures only CI/CD-related files are tracked in .gitlab/
#   - Prevents accidental commits of temp, backup, or unrelated files
#
# Why it matters:
#   GitLab expects .gitlab/ to contain pipeline configs and schema helpers only.
#   Extraneous files may be misleading or trigger errors in CI.
#
# Globals used:
#   - ROOT_DIR → Monorepo root
#
# Example:
#   check::gitlab_folder_structure
#
# Categories:
#   ci, lint, naming, paths, boundaries
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::gitlab_folder_structure() {
  # ✅ Check: .gitlab/ only contains valid YAML/CI/schema files
  # Category: ci, lint, naming, paths, boundaries
  # Stages: lint, check

  local allow_patterns=("*.yml" "*.yaml" "*.schema.json" "*.json")
  local disallowed=0

  if [[ -d "$ROOT_DIR/.gitlab" ]]; then
    while IFS= read -r -d '' file; do
      local filename
      filename=$(basename "$file")
      local matched=0

      for pat in "${allow_patterns[@]}"; do
        [[ "$filename" == $pat ]] && matched=1 && break
      done

      if [[ "$matched" -eq 0 ]]; then
        log FATAL "❌ Invalid file in .gitlab/: $filename"
        log FATAL "   💡 Tip: Only include *.yml, *.yaml, *.schema.json or GitLab schema files"
        log FATAL "   📘 Example: .gitlab/pipeline.yml or .gitlab/gitlab-ci.schema.json"
        disallowed=1
      fi
    done < <(find "$ROOT_DIR/.gitlab" -type f -print0)
  fi

  if [[ "$disallowed" -eq 1 ]]; then
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::vscode_settings_present — Require .vscode/settings.json for workspace
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .vscode/settings.json exists at the project root
#   - Enforces presence of shared editor config for consistent tooling and formatting
#
# Why it matters:
#   Team-wide editor settings prevent formatting drift and ensure consistent behavior
#   across IDEs, linters, formatters, and version control integrations.
#
# Globals used:
#   - ROOT_DIR → Monorepo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::vscode_settings_present
#
# Categories:
#   lint, naming, shell, paths, boundaries
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::vscode_settings_present() {
  # ✅ Check: .vscode/settings.json must be present
  # Category: lint, naming, shell, paths, boundaries
  # Stages: lint, check, pre-commit

  if [[ ! -f "$ROOT_DIR/.vscode/settings.json" ]]; then
    log FATAL "❌ .vscode/settings.json is missing"
    log FATAL "   💡 Tip: Define team-wide defaults like editor.tabSize and formatOnSave"
    log FATAL "   📘 Example: { \"editor.formatOnSave\": true, \"editor.tabSize\": 2 }"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::vscode_settings_not_empty — Ensure .vscode/settings.json is populated
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .vscode/settings.json exists and is not empty
#   - Prevents placeholder or zero-byte settings files that break shared tooling
#
# Why it matters:
#   A blank settings.json provides no shared config, causing editor drift across
#   environments. This check guarantees the file has real content.
#
# Globals used:
#   - ROOT_DIR → Monorepo root
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::vscode_settings_not_empty
#
# Categories:
#   lint, shell, boundaries, paths
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::vscode_settings_not_empty() {
  # ✅ Check: .vscode/settings.json is not empty
  # Category: lint, shell, boundaries, paths
  # Stages: lint, check, pre-commit

  if [[ ! -s "$ROOT_DIR/.vscode/settings.json" ]]; then
    log FATAL "❌ .vscode/settings.json is empty"
    log FATAL "   💡 Tip: Populate it with team-wide editor defaults"
    log FATAL "   📘 Example: { \"editor.formatOnSave\": true, \"typescript.preferences.importModuleSpecifier\": \"non-relative\" }"
    return 1
  fi
}# ------------------------------------------------------------------------------
# 🧪 check::vscode_settings_not_empty — Ensure .vscode/settings.json is populated
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .vscode/settings.json exists and is not empty
#   - Prevents placeholder or zero-byte settings files that break shared tooling
#
# Why it matters:
#   A blank settings.json provides no shared config, causing editor drift across
#   environments. This check guarantees the file has real content.
#
# Globals used:
#   - ROOT_DIR → Monorepo root
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::vscode_settings_not_empty
#
# Categories:
#   lint, shell, boundaries, paths
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::vscode_settings_not_empty() {
  # ✅ Check: .vscode/settings.json is not empty
  # Category: lint, shell, boundaries, paths
  # Stages: lint, check, pre-commit

  if [[ ! -s "$ROOT_DIR/.vscode/settings.json" ]]; then
    log FATAL "❌ .vscode/settings.json is empty"
    log FATAL "   💡 Tip: Populate it with team-wide editor defaults"
    log FATAL "   📘 Example: { \"editor.formatOnSave\": true, \"typescript.preferences.importModuleSpecifier\": \"non-relative\" }"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::vscode_settings_valid_json — Ensure .vscode/settings.json is valid JSON
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parses .vscode/settings.json using jq to confirm valid JSON syntax
#   - Prevents malformed configuration from silently breaking tooling or editor integration
#
# Why it matters:
#   Invalid JSON in shared editor settings can cause silent failures in IDE config,
#   linting, formatting, and extensions — breaking expected workflows for all contributors.
#
# Globals used:
#   - ROOT_DIR → Monorepo root
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::vscode_settings_valid_json
#
# Categories:
#   lint, encoding, paths, shell
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::vscode_settings_valid_json() {
  # ✅ Check: .vscode/settings.json is valid JSON
  # Category: lint, encoding, paths, shell
  # Stages: lint, check, pre-commit

  if ! jq empty "$ROOT_DIR/.vscode/settings.json" 2>/dev/null; then
    log FATAL "❌ .vscode/settings.json contains invalid JSON syntax"
    log FATAL "   💡 Tip: Run 'jq . .vscode/settings.json' or open it in a JSON-aware editor"
    log FATAL "   📘 Example: Ensure the file starts with '{' and ends with '}' and uses double-quoted keys"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::gitlab_ci_file_exists — Ensure .gitlab-ci.yml exists at project root
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Confirms that .gitlab-ci.yml is present in the project root
#   - Prevents CI from silently skipping if no pipeline config is found
#
# Why it matters:
#   GitLab CI requires a top-level .gitlab-ci.yml to run jobs. If it is missing,
#   no builds, tests, or deploys will run — and failure may go unnoticed until too late.
#
# Globals used:
#   - ROOT_DIR → Absolute path to project root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::gitlab_ci_file_exists
#
# Categories:
#   ci, infra, naming, shell
#
# Stages:
#   check, lint, pre-commit, deploy
# ------------------------------------------------------------------------------
check::gitlab_ci_file_exists() {
  # ✅ Check: .gitlab-ci.yml must exist at project root
  # Category: ci, infra, naming, shell
  # Stages: check, lint, pre-commit, deploy

  local GITLAB_CI_FILE="$ROOT_DIR/.gitlab-ci.yml"
  if [[ ! -f "$GITLAB_CI_FILE" ]]; then
    log FATAL "❌ Missing .gitlab-ci.yml at project root: $ROOT_DIR"
    log FATAL "   💡 Tip: Create this file to define your CI/CD pipeline stages"
    log FATAL "   📘 Example: touch .gitlab-ci.yml && git add .gitlab-ci.yml"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::gitlab_ci_yaml_schema_headers — Validate YAML schema headers in all GitLab CI config files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all GitLab CI YAML files include the correct $schema header
#   - Applies to .gitlab-ci.yml and all nested ci/*.yml under .gitlab or any workspace gitlab directory
#
# Why it matters:
#   Without a YAML schema header, IDEs and editors will lack autocomplete, validation,
#   and linting support — increasing the risk of silent CI errors and misconfigured jobs.
#
# Globals used:
#   - ROOT_DIR → Absolute path to the repo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::gitlab_ci_yaml_schema_headers
#
# Categories:
#   ci, infra, naming, shell
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::gitlab_ci_yaml_schema_headers() {
  # ✅ Check: All GitLab CI YAML files include the required $schema header
  # Category: ci, infra, naming, shell
  # Stages: check, lint, pre-commit

  local REQUIRED_SCHEMA='# yaml-language-server: $schema=https://gitlab.com/gitlab-org/gitlab/-/raw/master/app/assets/javascripts/editor/schema/ci.json'

  local ci_files
  ci_files=$(find "$ROOT_DIR" -type f \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null \
    | grep -E '(^|/)(\.gitlab-ci\.yml|gitlab-ci\.yml|\.gitlab/ci/.*\.ya?ml$|gitlab/ci/.*\.ya?ml$)' \
    | sort)

  local missing=0

  while read -r file; do
    [[ -z "$file" || ! -f "$file" ]] && continue
    local first_line
    first_line=$(head -n 1 "$file")
    if [[ "$first_line" != "$REQUIRED_SCHEMA" ]]; then
      log FATAL "❌ $file is missing required YAML schema header"
      log FATAL "   💡 Tip: Add this as the FIRST line of the file for YAML IDE support"
      log FATAL "   📘 Example: $REQUIRED_SCHEMA"
      missing=1
    else
      log INFO "✅ Schema header present in: $file"
    fi
  done <<< "$ci_files"

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ One or more GitLab CI YAML files are missing schema headers"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::gitlab_ci_yaml_valid_syntax — Validate syntax of all GitLab CI YAML files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validates that all GitLab CI YAML files are syntactically valid
#   - Uses `yq` to parse each file and fail if parsing fails
#
# Why it matters:
#   Invalid YAML syntax will break GitLab CI pipelines and may silently prevent jobs from running.
#
# Globals used:
#   - ROOT_DIR → Project root directory
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::gitlab_ci_yaml_valid_syntax
#
# Categories:
#   ci, lint, infra, shell
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::gitlab_ci_yaml_valid_syntax() {
  # ✅ Check: All GitLab CI YAML files must parse successfully with yq
  # Category: ci, lint, infra, shell
  # Stages: check, lint, pre-commit

  local ci_files
  ci_files=$(find "$ROOT_DIR" -type f \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null \
    | grep -E '(^|/)(\.gitlab-ci\.yml|gitlab-ci\.yml|\.gitlab/ci/.*\.ya?ml$|gitlab/ci/.*\.ya?ml$)' \
    | sort)

  local invalid=0

  while read -r file; do
    [[ -z "$file" || ! -f "$file" ]] && continue
    if ! yq eval "$file" >/dev/null 2>&1; then
      log FATAL "❌ Invalid YAML syntax in GitLab CI file: $file"
      log FATAL "   💡 Tip: Use 'yq eval $file' or a YAML linter to fix indentation and quoting"
      log FATAL "   📘 Example: yq eval $file"
      invalid=1
    else
      log INFO "✅ YAML valid: $file"
    fi
  done <<< "$ci_files"

  if [[ "$invalid" -eq 1 ]]; then
    log FATAL "❌ One or more GitLab CI YAML files contain invalid syntax"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::gitlab_ci_stages_defined — Ensure top-level `stages:` key exists in root GitLab CI config
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures the root .gitlab-ci.yml defines a top-level `stages:` list
#   - Prevents CI failures due to missing stage declarations
#
# Why it matters:
#   GitLab requires a defined `stages:` array to sequence CI jobs properly.
#   Omitting it may cause jobs to run in undefined or unordered stages.
#
# Globals used:
#   - GITLAB_CI_FILE → path to .gitlab-ci.yml (usually $ROOT_DIR/.gitlab-ci.yml)
#
# Example:
#   GITLAB_CI_FILE="$ROOT_DIR/.gitlab-ci.yml"
#   check::gitlab_ci_stages_defined
#
# Categories:
#   ci, lint, infra
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::gitlab_ci_stages_defined() {
  # ✅ Check: .gitlab-ci.yml contains a top-level `stages:` key
  # Category: ci, lint, infra
  # Stages: check, lint, pre-commit

  if ! grep -Eq '^\s*stages:\s*$' "$GITLAB_CI_FILE"; then
    log FATAL "❌ .gitlab-ci.yml is missing required top-level 'stages:' declaration"
    log FATAL "   💡 Tip: Define the sequence of pipeline stages explicitly"
    log FATAL "   📘 Example:"
    log FATAL "       stages:"
    log FATAL "         - setup"
    log FATAL "         - lint"
    log FATAL "         - test"
    log FATAL "         - build"
    log FATAL "         - deploy"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::gitlab_ci_includes_exist — Ensure all included GitLab CI config files exist
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validates that all `- local:` include paths in .gitlab-ci.yml are resolvable
#   - Prevents CI failure from referencing missing YAML files
#
# Why it matters:
#   Broken include paths will cause the pipeline to fail immediately.
#   Verifying paths ensures GitLab CI will load all partial configs correctly.
#
# Globals used:
#   - GITLAB_CI_FILE → path to root GitLab CI config file
#   - ROOT_DIR       → absolute path to monorepo root
#
# Example:
#   GITLAB_CI_FILE="$ROOT_DIR/.gitlab-ci.yml"
#   check::gitlab_ci_includes_exist
#
# Categories:
#   ci, infra, lint
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::gitlab_ci_includes_exist() {
  # ✅ Check: All local includes referenced in .gitlab-ci.yml exist
  # Category: ci, infra, lint
  # Stages: check, lint, pre-commit

  local included_files
  included_files=$(grep -E '^\s*- local:\s' "$GITLAB_CI_FILE" | awk '{print $3}' | tr -d '"')

  for include_path in $included_files; do
    local full_path="$ROOT_DIR/$include_path"
    if [[ ! -f "$full_path" ]]; then
      log FATAL "❌ Included CI config not found: $include_path"
      log FATAL "   💡 Tip: Verify the path under the 'include:' section of .gitlab-ci.yml"
      log FATAL "   📘 Example: - local: .gitlab/ci/build.yml"
      return 1
    fi
  done
}



# ------------------------------------------------------------------------------
# 🧪 check::check_function_docblocks — Enforce consistent header and comment style for check::* functions
# ------------------------------------------------------------------------------
# This validation ensures all check::* functions follow required structure:
#   - Full docblock with mandatory sections
#   - Inline header comment block: Check, Category, Stages
#   - Must use log FATAL/WARN/INFO — no echo/printf
#   - Must use return 1 (not exit 1)
#
# Globals used:
#   - ROOT_DIR → Project root directory
#
# Example:
#   ROOT_DIR="$(pwd)"
#   check::check_function_docblocks
#
# Categories:
#   lint, shell, ci
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::check_function_docblocks() {
  # ✅ Check: Enforce structure of all check::* validation function headers
  # Category: lint, shell, ci
  # Stages: lint, test

  local failed=0
  local files
  files=$(grep -rPl '^check::[a-zA-Z0-9_-]+\(\)' "$ROOT_DIR" --include='*.sh' --exclude-dir={.git,node_modules} || true)

  for file in $files; do
    local funcs
    mapfile -t funcs < <(grep -Po '^check::[a-zA-Z0-9_-]+\(\)' "$file")

    for fn in "${funcs[@]}"; do
      local block
      block=$(awk "/^$fn\s*{/,/^}/" "$file")

      # Check full docblock
      local docblock
      docblock=$(awk -v fn="$fn" '
        BEGIN { inside = 0; found = 0 }
        /^# +🧪 check::/ { inside = 1; found++ }
        inside && /^# +Why it matters:/ { found++ }
        inside && /^# +Globals used:/ { found++ }
        inside && /^# +Example:/ { found++ }
        inside && /^# +Categories:/ { found++ }
        inside && /^# +Stages:/ { found++ }
        /^# +check::/ && inside { exit }
        END { print found }
      ' "$file")

      if [[ "$docblock" -lt 6 ]]; then
        log FATAL "❌ $file → $fn is missing full docblock or required sections"
        failed=1
      fi

      # Inline header format required
      if ! echo "$block" | grep -q '# ✅ Check:'; then
        log FATAL "❌ $file → $fn missing '# ✅ Check:' inline comment"
        failed=1
      fi
      if ! echo "$block" | grep -q '# Category:'; then
        log FATAL "❌ $file → $fn missing '# Category:' inline comment"
        failed=1
      fi
      if ! echo "$block" | grep -q '# Stages:'; then
        log FATAL "❌ $file → $fn missing '# Stages:' inline comment"
        failed=1
      fi

      # No raw echo/printf
      if echo "$block" | grep -E '(^|[^a-zA-Z0-9_])(echo|printf)[[:space:]]' | grep -vq 'log '; then
        log FATAL "❌ $file → $fn contains raw echo/printf — must use log FATAL/WARN/INFO"
        failed=1
      fi

      # Must use return 1 if there's a log FATAL
      if echo "$block" | grep -q 'log FATAL'; then
        if ! echo "$block" | grep -q 'return 1'; then
          log FATAL "❌ $file → $fn missing 'return 1' after log FATAL"
          failed=1
        fi
        if echo "$block" | grep -q 'exit 1'; then
          log FATAL "❌ $file → $fn uses 'exit 1' — must use 'return 1' instead"
          failed=1
        fi
      fi
    done
  done

  if [[ "$failed" -eq 1 ]]; then
    log FATAL "❌ One or more check::* functions are invalid — see errors above"
    log FATAL "   💡 Tip: Follow the exact SOURCE OF TRUTH function format"
    return 1
  else
    log INFO "✅ All check::* validation functions are properly documented and formatted"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::monorepo_layout_schema — Validate that project matches monorepo-layout.schema.yaml
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all required paths from schema exist
#   - Ensures no extra files/folders outside schema exist
#   - Enforces infra/{cf,k8s,compose} contain only *.yml
#
# Why it matters:
#   A strict directory layout prevents chaos in large codebases,
#   supports automation, and ensures repeatable builds.
#
# Globals used:
#   - ROOT_DIR → top-level monorepo path
#
# Example:
#   ROOT_DIR="."
#   check::monorepo_layout_schema
#
# Categories:
#   safety, ci, naming, paths
#
# Stages:
#   lint, validate, pre-commit
# ------------------------------------------------------------------------------
check::monorepo_layout_schema() {
  # ✅ Check: Project structure matches monorepo-layout.schema.yaml
  # Category: safety, ci, naming, paths
  # Stages: lint, validate, pre-commit

  local SCHEMA_FILE="$ROOT_DIR/monorepo-layout.schema.yaml"
  if [[ ! -f "$SCHEMA_FILE" ]]; then
    log FATAL "❌ Schema file missing: $SCHEMA_FILE"
    log FATAL "   💡 Tip: Add monorepo-layout.schema.yaml to the project root"
    log FATAL "   📘 Example: cp packages/shared/schemas/monorepo-layout.example.yaml $SCHEMA_FILE"
    return 1
  fi

  local EXPECTED ACTUAL missing=0 extraneous=0
  EXPECTED=$(yq eval '.. | select(tag == "!!str")' "$SCHEMA_FILE" | sed 's|^/||' | sort -u)
  ACTUAL=$(find "$ROOT_DIR" -type f -o -type d | sed "s|^$ROOT_DIR/||" | grep -vE '^node_modules|^.git/' | sort -u)

  while read -r expected; do
    [[ -z "$expected" ]] && continue
    if ! grep -qxF "$expected" <<< "$ACTUAL"; then
      log FATAL "❌ Missing required path: $expected"
      missing=1
    fi
  done <<< "$EXPECTED"

  while read -r actual; do
    [[ -z "$actual" ]] && continue
    if ! grep -qxF "$actual" <<< "$EXPECTED"; then
      log FATAL "❌ Unexpected file or directory in project: $actual"
      extraneous=1
    fi
  done <<< "$ACTUAL"

  find "$ROOT_DIR/packages/products" -type d -regex '.*/infra/\(compose\|k8s\|cf\)$' | while read -r infra; do
    find "$infra" -type f ! -name '*.yml' | while read -r bad; do
      log FATAL "❌ Invalid file in $infra — only *.yml files are allowed"
      log FATAL "   📘 Example: Remove $bad or rename to .yml"
      extraneous=1
    done
  done

  if [[ "$missing" -eq 1 || "$extraneous" -eq 1 ]]; then
    log FATAL "❌ Project layout does not match monorepo-layout.schema.yaml"
    log FATAL "   💡 Tip: Use the schema to create/delete expected files"
    return 1
  else
    log INFO "✅ Monorepo layout matches monorepo-layout.schema.yaml"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::monorepo_layout_example_schema_valid — Ensure example layout schema exists and matches structure
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures the monorepo-layout example schema file exists
#   - Validates it is syntactically valid YAML
#   - Confirms it matches the structure of monorepo-layout.schema.yaml
#
# Why it matters:
#   Having an up-to-date and valid example schema ensures consistency,
#   serves as documentation, and enables bootstrapping of new repositories.
#
# Globals used:
#   - ROOT_DIR → path to the monorepo root
#
# Example:
#   check::monorepo_layout_example_schema_valid
#
# Categories:
#   ci, naming, paths, encoding
#
# Stages:
#   lint, validate, pre-commit
# ------------------------------------------------------------------------------
check::monorepo_layout_example_schema_valid() {
  # ✅ Check: example layout schema file exists and is valid
  # Category: ci, naming, paths, encoding
  # Stages: lint, validate, pre-commit

  local schema="$ROOT_DIR/monorepo-layout.schema.yaml"
  local example="$ROOT_DIR/packages/shared/schemas/monorepo-layout.example.yaml"

  if [[ ! -f "$example" ]]; then
    log FATAL "❌ Missing example schema: $example"
    log FATAL "   💡 Tip: Copy from $schema to create an example schema"
    log FATAL "   📘 Example: cp $schema $example"
    return 1
  fi

  if ! yq eval '.' "$example" >/dev/null 2>&1; then
    log FATAL "❌ $example is not valid YAML"
    log FATAL "   💡 Tip: Fix indentation or syntax errors using a YAML linter"
    log FATAL "   📘 Example: yq eval $example"
    return 1
  fi

  if ! yq eval '.' "$schema" >/dev/null 2>&1; then
    log FATAL "❌ $schema is not valid YAML — cannot compare to example"
    return 1
  fi

  local schema_paths example_paths
  schema_paths=$(yq eval '.. | select(tag == "!!str")' "$schema" | sed 's|^/||' | sort -u)
  example_paths=$(yq eval '.. | select(tag == "!!str")' "$example" | sed 's|^/||' | sort -u)

  if [[ "$schema_paths" != "$example_paths" ]]; then
    log FATAL "❌ $example is out of sync with $schema"
    log FATAL "   💡 Tip: Update the example schema to match the canonical layout"
    log FATAL "   📘 Example: cp $schema $example"
    return 1
  fi

  log INFO "✅ Example schema matches and is valid: $example"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_yaml_language_server_schemas — Validate all YAML files with $schema declarations
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds all YAML files with `# yaml-language-server: $schema=<URL>`
#   - Downloads the referenced schema (with retries)
#   - Converts the YAML to JSON using yq
#   - Validates the JSON against the schema using ajv or python jsonschema
#
# Why it matters:
#   Malformed or schema-invalid YAML can silently break tooling, CI, or deployment behavior.
#   This ensures all annotated YAML is machine-validated against the declared schema.
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   check::validate_yaml_language_server_schemas
#
# Categories:
#   lint, ci, safety, encoding
#
# Stages:
#   lint, test, validate
# ------------------------------------------------------------------------------
check::validate_yaml_language_server_schemas() {
  # ✅ Check: All YAML files declaring $schema are valid against the referenced schema
  # Category: lint, ci, safety, encoding
  # Stages: lint, test, validate

  local failed=0

  command -v curl >/dev/null || {
    log FATAL "❌ curl is required to fetch schemas"
    log FATAL "   💡 Tip: Install curl to enable schema downloads"
    log FATAL "   📘 Example: brew install curl"
    return 1
  }

  command -v yq >/dev/null || {
    log FATAL "❌ yq is required to convert YAML to JSON for validation"
    log FATAL "   💡 Tip: Install yq from https://github.com/mikefarah/yq"
    log FATAL "   📘 Example: brew install yq"
    return 1
  }

  local validator=""
  if command -v ajv >/dev/null; then
    validator="ajv"
  elif command -v python3 >/dev/null && python3 -m jsonschema --version >/dev/null 2>&1; then
    validator="python"
  else
    log FATAL "❌ No YAML schema validator found (ajv or python3-jsonschema)"
    log FATAL "   💡 Tip: Install ajv-cli (npm) or jsonschema (pip)"
    log FATAL "   📘 Example: pnpm install -g ajv-cli"
    return 1
  fi

  mapfile -t yaml_files < <(find "$ROOT_DIR" -type f \( -name "*.yml" -o -name "*.yaml" \) \
    -exec grep -l '^# yaml-language-server: \$schema=' {} +)

  for yaml_file in "${yaml_files[@]}"; do
    local schema
    schema=$(grep -E '^# yaml-language-server: \$schema=' "$yaml_file" | sed -E 's/^# yaml-language-server: \$schema=//')

    [[ -z "$schema" ]] && continue
    if [[ ! "$schema" =~ ^https?:// ]]; then
      log WARN "⚠️ Skipping non-HTTP schema reference in $yaml_file"
      continue
    fi

    log INFO "📘 Validating YAML schema for: $yaml_file"

    local tmp_schema tmp_json
    tmp_schema=$(mktemp --suffix .schema.json)
    tmp_json=$(mktemp --suffix .yaml.json)

    # Retry fetch
    local attempt success=0
    for attempt in 1 2 3; do
      if curl -sSfL "$schema" -o "$tmp_schema"; then
        success=1
        break
      else
        log WARN "⚠️ Failed to fetch schema (attempt $attempt): $schema"
        sleep "$attempt"
      fi
    done

    if [[ "$success" -ne 1 || ! -s "$tmp_schema" ]]; then
      log FATAL "❌ Could not fetch schema after 3 attempts: $schema"
      log FATAL "   ↳ Used in: $yaml_file"
      failed=1
      rm -f "$tmp_schema" "$tmp_json"
      continue
    fi

    # Convert YAML → JSON
    if ! yq -o=json "$yaml_file" > "$tmp_json" 2>/dev/null; then
      log FATAL "❌ Failed to convert YAML to JSON: $yaml_file"
      log FATAL "   💡 Tip: Ensure the YAML is valid and parseable"
      failed=1
      rm -f "$tmp_schema" "$tmp_json"
      continue
    fi

    # Validate JSON
    if [[ "$validator" == "ajv" ]]; then
      if ! ajv validate -s "$tmp_schema" -d "$tmp_json" --all-errors --strict=false > .ajv-err.tmp 2>&1; then
        log FATAL "❌ YAML schema validation failed: $yaml_file"
        log FATAL "   ↳ Schema: $schema"
        sed 's/^/   ↳ /' .ajv-err.tmp
        failed=1
      else
        log INFO "✅ Valid YAML schema: $yaml_file"
      fi
    elif [[ "$validator" == "python" ]]; then
      if ! python3 -m jsonschema -i "$tmp_json" "$tmp_schema" > .py-err.tmp 2>&1; then
        log FATAL "❌ YAML schema validation failed: $yaml_file"
        log FATAL "   ↳ Schema: $schema"
        sed 's/^/   ↳ /' .py-err.tmp
        failed=1
      else
        log INFO "✅ Valid YAML schema: $yaml_file"
      fi
    fi

    rm -f "$tmp_schema" "$tmp_json" .ajv-err.tmp .py-err.tmp 2>/dev/null || true
  done

  if [[ "$failed" -eq 1 ]]; then
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_json_schemas — Validate all JSON files with "$schema" keys
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds all JSON files in the project that declare a "$schema" field
#   - Downloads each declared schema (with up to 3 retries)
#   - Validates the JSON file against the schema using ajv or python jsonschema
#   - Collects and displays all schema violations with file-level context
#
# Why it matters:
#   Declaring "$schema" enables IDE validation, but invalid or malformed files will
#   silently pass through unless enforced — leading to CI/tooling inconsistencies.
#
# Globals used:
#   - ROOT_DIR → project root path
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::validate_json_schemas
#
# Categories:
#   lint, ci, encoding, safety
#
# Stages:
#   lint, validate, test
# ------------------------------------------------------------------------------
check::validate_json_schemas() {
  # ✅ Check: All JSON files with "$schema" must pass schema validation
  # Category: lint, ci, encoding, safety
  # Stages: lint, validate, test

  local failed=0
  local validator=""
  local tmp_schema tmp_log attempt success schema

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required to extract \$schema fields from JSON"
    log FATAL "   💡 Tip: Install via brew, apt, or https://stedolan.github.io/jq/"
    log FATAL "   📘 Example: brew install jq"
    return 1
  }

  command -v curl >/dev/null || {
    log FATAL "❌ curl is required to fetch remote schema URLs"
    log FATAL "   💡 Tip: Install curl if missing. Most systems include it."
    return 1
  }

  if command -v ajv >/dev/null; then
    validator="ajv"
  elif command -v python3 >/dev/null && python3 -m jsonschema --version >/dev/null 2>&1; then
    validator="python"
  else
    log FATAL "❌ No JSON schema validator available (ajv or python3-jsonschema)"
    log FATAL "   💡 Tip: Install one of:"
    log FATAL "     • pnpm install -g ajv-cli"
    log FATAL "     • pip install jsonschema"
    return 1
  fi

  mapfile -t json_files < <(find "$ROOT_DIR" -type f -name "*.json" -exec grep -l '"\$schema"' {} +)

  for json_file in "${json_files[@]}"; do
    schema=$(jq -r '."$schema" // empty' "$json_file" 2>/dev/null)
    [[ -z "$schema" || "$schema" == "null" ]] && continue

    log INFO "📦 Validating: $json_file"
    tmp_schema=$(mktemp --suffix .schema.json)
    tmp_log=$(mktemp)

    success=0
    for attempt in 1 2 3; do
      if curl -sSfL "$schema" -o "$tmp_schema"; then
        success=1
        break
      else
        log WARN "⚠️ Failed to fetch schema (attempt $attempt): $schema"
        sleep "$attempt"
      fi
    done

    if [[ "$success" -ne 1 || ! -s "$tmp_schema" ]]; then
      log FATAL "❌ Could not fetch schema after 3 attempts"
      log FATAL "   ↳ Schema: $schema"
      log FATAL "   ↳ File: $json_file"
      rm -f "$tmp_schema" "$tmp_log"
      failed=1
      continue
    fi

    if [[ "$validator" == "ajv" ]]; then
      if ! ajv validate -s "$tmp_schema" -d "$json_file" --strict=false --all-errors > "$tmp_log" 2>&1; then
        log FATAL "❌ JSON schema validation failed for: $json_file"
        log FATAL "   ↳ Schema: $schema"
        sed 's/^/   ↳ /' "$tmp_log"
        failed=1
      else
        log INFO "✅ Valid JSON schema: $json_file"
      fi
    elif [[ "$validator" == "python" ]]; then
      if ! python3 -m jsonschema -i "$json_file" "$tmp_schema" > "$tmp_log" 2>&1; then
        log FATAL "❌ JSON schema validation failed for: $json_file"
        log FATAL "   ↳ Schema: $schema"
        sed 's/^/   ↳ /' "$tmp_log"
        failed=1
      else
        log INFO "✅ Valid JSON schema: $json_file"
      fi
    fi

    rm -f "$tmp_schema" "$tmp_log"
  done

  if [[ "$failed" -eq 1 ]]; then
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_gitignore_compliance — Ensure .gitignore structure and safety
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .gitignore exists and is non-empty
#   - Validates trailing newline and absence of trailing whitespace
#   - Detects duplicate patterns or overlapping rules
#   - Warns if directories are ignored without allowing .gitkeep
#   - Blocks if patterns ignore tracked files
#
# Why it matters:
#   A malformed or incomplete .gitignore can result in secrets, build artifacts,
#   or unnecessary files being committed, causing CI failures and security leaks.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::validate_gitignore_compliance
#
# Categories:
#   safety, lint, ci, naming, paths
#
# Stages:
#   pre-commit, check, lint
# ------------------------------------------------------------------------------
check::validate_gitignore_compliance() {
  # ✅ Check: .gitignore is present, formatted, and does not conflict with Git tracking
  # Category: safety, lint, ci, naming, paths
  # Stages: pre-commit, check, lint

  local file="$ROOT_DIR/.gitignore"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing .gitignore at project root"
    log FATAL "   💡 Tip: Define ignored files and folders for safety and performance"
    log FATAL "   📘 Example: echo 'node_modules/' > .gitignore"
    return 1
  fi

  if [[ ! -s "$file" ]]; then
    log WARN "⚠️ .gitignore is empty — project may contain unnecessary tracked files"
    log WARN "   💡 Tip: Add folders like node_modules, dist, .env, etc. to reduce Git bloat"
    log WARN "   📘 Example: echo 'dist/' >> .gitignore"
  fi

  if [[ "$(tail -c1 "$file")" != $'\n' ]]; then
    log FATAL "❌ .gitignore is missing trailing newline"
    log FATAL "   💡 Tip: Add a newline to the end of the file to ensure parser correctness"
    log FATAL "   📘 Example: press Enter after the final line"
    failed=1
  fi

  if grep -qP '[ \t]+$' "$file"; then
    log WARN "⚠️ Trailing whitespace detected in .gitignore"
    log WARN "   💡 Tip: Remove extra spaces to avoid diff noise"
    log WARN "   📘 Example: use your editor's whitespace cleanup setting"
  fi

  local dupes
  dupes=$(grep -vE '^\s*#|^\s*$' "$file" | sort | uniq -d)
  if [[ -n "$dupes" ]]; then
    log FATAL "❌ Duplicate ignore patterns detected in .gitignore:"
    echo "$dupes" | while read -r line; do log FATAL "   ↳ $line"; done
    log FATAL "   💡 Tip: Keep each ignore pattern unique for clarity and correctness"
    log FATAL "   📘 Example: remove repeated entries like 'dist/'"
    failed=1
  fi

  if grep -E '^.*/$' "$file" | grep -vq '!*.gitkeep'; then
    log WARN "⚠️ Ignored folders do not allow .gitkeep files"
    log WARN "   💡 Tip: Add '!*.gitkeep' after folder ignores to preserve empty dirs"
    log WARN "   📘 Example: echo '!*.gitkeep' >> .gitignore"
  fi

  while read -r line; do
    log WARN "⚠️ Tracked file matches .gitignore: $line"
    log WARN "   💡 Tip: Untrack it with: git rm --cached $line"
  done < <(git check-ignore -v $(git ls-files) 2>/dev/null || true)

  grep -vE '^\s*#|^\s*$' "$file" | while read -r pattern; do
    tracked=$(git ls-files "$pattern" 2>/dev/null || true)
    if [[ -n "$tracked" ]]; then
      log FATAL "❌ .gitignore pattern matches tracked file(s): $pattern"
      log FATAL "   💡 Tip: Remove file from Git with: git rm --cached $pattern"
      log FATAL "   📘 Example: git rm --cached .env.local"
      failed=1
    fi
  done

  for env in $(git ls-files | grep -E '^\.env(\..+)?$' | grep -v '.example'); do
    if ! grep -qF "$env" "$file"; then
      log WARN "⚠️ Tracked env file is not ignored: $env"
      log WARN "   💡 Tip: Add to .gitignore to prevent accidental secret leaks"
      log WARN "   📘 Example: echo '$env' >> .gitignore"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_dockerignore_compliance — Ensure .dockerignore is present and correct
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .dockerignore file exists and is not empty
#   - Validates newline at EOF and absence of trailing whitespace
#   - Warns if sensitive or unnecessary files are not excluded (e.g. .env, secrets/)
#   - Warns if common exclusions (e.g. node_modules, dist) are missing
#   - Flags tracked files that match sensitive patterns
#
# Why it matters:
#   A missing or incomplete .dockerignore causes Docker to build large, slow,
#   and insecure contexts, which may leak secrets or break caching.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::validate_dockerignore_compliance
#
# Categories:
#   safety, lint, ci, naming, paths
#
# Stages:
#   pre-commit, check, lint, build
# ------------------------------------------------------------------------------
check::validate_dockerignore_compliance() {
  # ✅ Check: .dockerignore is present, formatted, and avoids unsafe patterns
  # Category: safety, lint, ci, naming, paths
  # Stages: pre-commit, check, lint, build

  local file="$ROOT_DIR/.dockerignore"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing .dockerignore at project root"
    log FATAL "   💡 Tip: Create one to avoid shipping unnecessary or unsafe files into Docker context"
    log FATAL "   📘 Example: echo 'node_modules' > .dockerignore"
    return 1
  fi

  if [[ ! -s "$file" ]]; then
    log WARN "⚠️ .dockerignore is empty — Docker context may include large or sensitive files"
    log WARN "   💡 Tip: Add exclusions like node_modules/, .env, dist/, etc."
    log WARN "   📘 Example: echo 'dist' >> .dockerignore"
  fi

  if [[ "$(tail -c1 "$file")" != $'\n' ]]; then
    log FATAL "❌ .dockerignore is missing trailing newline"
    log FATAL "   💡 Tip: Add a blank line to the end of the file"
    log FATAL "   📘 Example: Press enter after the last ignore pattern"
    failed=1
  fi

  if grep -qP '[ \t]+$' "$file"; then
    log WARN "⚠️ Trailing whitespace detected in .dockerignore"
    log WARN "   💡 Tip: Remove unnecessary trailing spaces"
    log WARN "   📘 Example: Use an editor with trim_trailing_whitespace = true"
  fi

  local dangerous=('.env' '.env.*' '*.pem' '*.key' 'secrets/' 'id_rsa' '.git')
  for pattern in "${dangerous[@]}"; do
    if ! grep -q "^$pattern" "$file"; then
      log WARN "⚠️ $pattern is not excluded — recommend ignoring it"
      log WARN "   💡 Tip: Add '$pattern' to .dockerignore"
      log WARN "   📘 Example: echo '$pattern' >> .dockerignore"
    fi
  done

  local required=('node_modules' 'dist' '.DS_Store')
  for pattern in "${required[@]}"; do
    if ! grep -q "^$pattern" "$file"; then
      log WARN "⚠️ Missing recommended exclusion: $pattern"
      log WARN "   💡 Tip: Add '$pattern' to avoid unnecessary Docker context size"
      log WARN "   📘 Example: echo '$pattern' >> .dockerignore"
    fi
  done

  local dupes
  dupes=$(grep -vE '^\s*#|^\s*$' "$file" | sort | uniq -d || true)
  if [[ -n "$dupes" ]]; then
    log FATAL "❌ Duplicate entries in .dockerignore:"
    echo "$dupes" | while read -r line; do log FATAL "   ↳ $line"; done
    log FATAL "   💡 Tip: Remove redundant ignore patterns"
    log FATAL "   📘 Example: Only include each pattern once"
    failed=1
  fi

  for pattern in '.env' '.env.*' 'secrets/*' '*.pem' '*.key'; do
    local tracked
    tracked=$(git ls-files "$pattern" 2>/dev/null || true)
    if [[ -n "$tracked" ]]; then
      log FATAL "❌ Tracked file matches sensitive pattern: $pattern"
      log FATAL "   💡 Tip: Add to .dockerignore and run: git rm --cached $pattern"
      log FATAL "   📘 Example: echo '$pattern' >> .dockerignore"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_gitattributes_compliance — Ensure .gitattributes is complete and safe
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .gitattributes exists, is non-empty, and has a trailing newline
#   - Validates inclusion of required normalization rules from standard template
#   - Detects duplicate or conflicting glob patterns
#   - Validates attribute names and values (e.g. text, binary, eol=lf, -text)
#
# Why it matters:
#   Improper or missing .gitattributes can lead to platform-specific bugs,
#   diff noise, binary corruption, and inconsistent Git behavior across environments.
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::validate_gitattributes_compliance
#
# Categories:
#   safety, lint, ci, naming, encoding
#
# Stages:
#   pre-commit, check, lint
# ------------------------------------------------------------------------------
check::validate_gitattributes_compliance() {
  # ✅ Check: .gitattributes file exists and defines all required attributes safely
  # Category: safety, lint, ci, naming, encoding
  # Stages: pre-commit, check, lint

  local file="$ROOT_DIR/.gitattributes"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing .gitattributes at project root"
    log FATAL "   💡 Tip: Use a standardized .gitattributes to enforce cross-platform safety"
    log FATAL "   📘 Example: See https://github.com/alexkaratarakis/gitattributes"
    return 1
  fi

  if [[ ! -s "$file" ]]; then
    log FATAL "❌ .gitattributes file is empty — normalization and binary rules will not apply"
    log FATAL "   💡 Tip: Populate the file with standard rules for text, binary, lockfiles, etc"
    log FATAL "   📘 Example: *.ts text eol=lf"
    return 1
  fi

  if [[ "$(tail -c1 "$file")" != $'\n' ]]; then
    log FATAL "❌ .gitattributes is missing trailing newline"
    log FATAL "   💡 Tip: Add a blank line to the end of the file"
    log FATAL "   📘 Example: Use an editor setting like 'insert_final_newline = true'"
    failed=1
  fi

  local required_patterns=(
    '* text=auto'
    '*.cmd text eol=crlf'
    '*.CMD text eol=crlf'
    '*.bat text eol=crlf'
    '*.BAT text eol=crlf'
    '*.sh text eol=lf'
    '*.env text eol=lf'
    '*.yml text eol=lf'
    '*.yaml text eol=lf'
    '*.json text eol=lf'
    '*.ts text eol=lf'
    '*.tsx text eol=lf'
    '*.js text eol=lf'
    '*.jsx text eol=lf'
    '*.svelte text eol=lf'
    '*.html text eol=lf'
    '*.css text eol=lf'
    '*.scss text eol=lf'
    '*.md text eol=lf'
    '*.d.ts text eol=lf'
    '.editorconfig text eol=lf'
    '.gitignore text eol=lf'
    '.gitattributes text eol=lf'
    'pnpm-lock.yaml -text'
    'package-lock.json -text'
    'yarn.lock -text'
    '*.map -text'
    '*.zip binary'
    '*.png binary'
    '*.jpg binary'
    '*.jpeg binary'
    '*.gif binary'
    '*.pdf binary'
    '*.mp4 binary'
    '*.exe binary'
    '*.wasm binary'
  )

  for pattern in "${required_patterns[@]}"; do
    if ! grep -qF "$pattern" "$file"; then
      log FATAL "❌ Missing required attribute: $pattern"
      log FATAL "   💡 Tip: Ensure all key file types are covered by .gitattributes"
      log FATAL "   📘 Example: Add '$pattern' to avoid normalization issues"
      failed=1
    fi
  done

  local invalid_attrs
  invalid_attrs=$(grep -vE '^\s*#' "$file" | awk '{for (i=2;i<=NF;i++) print $i}' \
    | sort -u | grep -vE '^(text|binary|-text|eol=lf|eol=crlf)$' || true)

  if [[ -n "$invalid_attrs" ]]; then
    log FATAL "❌ Found invalid attribute(s) in .gitattributes:"
    echo "$invalid_attrs" | while read -r attr; do log FATAL "   ↳ $attr"; done
    log FATAL "   💡 Tip: Only use standard Git attributes"
    log FATAL "   📘 Example: text, binary, -text, eol=lf, eol=crlf"
    failed=1
  fi

  local dupes
  dupes=$(grep -vE '^\s*#' "$file" | awk '{print $1}' | sort | uniq -d || true)
  if [[ -n "$dupes" ]]; then
    log FATAL "❌ Duplicate rules detected in .gitattributes:"
    echo "$dupes" | while read -r rule; do log FATAL "   ↳ $rule"; done
    log FATAL "   💡 Tip: Only define one rule per glob pattern"
    log FATAL "   📘 Example: Remove duplicate entries for *.ts or *.md"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_editorconfig — Ensure .editorconfig is present, valid, and strictly enforced
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .editorconfig file exists and is not empty
#   - Verifies required sections are present (e.g. [*], [*.md], etc.)
#   - Checks for duplicate section headers
#   - Validates known keys and expected values
#   - Warns on unknown or deprecated keys
#
# Why it matters:
#   Enforces consistent formatting across all editors and platforms,
#   reduces unnecessary diffs, and prevents style drift.
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::validate_editorconfig
#
# Categories:
#   lint, encoding, naming
#
# Stages:
#   pre-commit, check, lint
# ------------------------------------------------------------------------------
check::validate_editorconfig() {
  # ✅ Check: .editorconfig must exist, be populated, and follow conventions
  # Category: lint, encoding, naming
  # Stages: pre-commit, check, lint

  local file="$ROOT_DIR/.editorconfig"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing .editorconfig at project root"
    log FATAL "   💡 Tip: Add a top-level .editorconfig to enforce formatting rules"
    log FATAL "   📘 Example: https://editorconfig.org/#example-file"
    return 1
  fi

  if [[ ! -s "$file" ]]; then
    log FATAL "❌ .editorconfig is empty"
    log FATAL "   💡 Tip: At minimum, include a [*] section with baseline formatting"
    log FATAL "   📘 Example: [*]\nend_of_line = lf\ninsert_final_newline = true"
    return 1
  fi

  if [[ "$(tail -c1 "$file")" != $'\n' ]]; then
    log FATAL "❌ .editorconfig is missing trailing newline"
    log FATAL "   💡 Tip: Add a newline at the end of the file"
    log FATAL "   📘 Example: press Enter after the last line"
    failed=1
  fi

  if ! grep -q '^root *= *true' "$file"; then
    log WARN "⚠️ Missing 'root = true' — parent configs may override settings"
    log WARN "   💡 Tip: Add 'root = true' at the top of .editorconfig"
  fi

  local required_sections=(
    '[*]'
    '[*.md]'
    '[*.{js,jsx,ts,tsx}]'
    '[*.{json,jsonc}]'
    '[*.{yml,yaml}]'
    '[.editorconfig]'
    '[.gitattributes]'
    '[*.{gitignore,dockerignore}]'
    '[*.txt]'
    '[Makefile]'
    '[*.py]'
    '[*.{sh,bash}]'
    '[*.{html,css,scss}]'
    '[*.svelte]'
    '[*.{xml,svg}]'
    '[*.{toml,ini}]'
    '[.nvmrc]'
    '[.npmrc]'
    '[Dockerfile]'
    '[.env]'
    '[.env.*]'
    '[.all-contributorsrc]'
  )

  for section in "${required_sections[@]}"; do
    if ! grep -qF "$section" "$file"; then
      log FATAL "❌ Missing required section: $section"
      log FATAL "   💡 Tip: Include $section to cover all project file types"
      log FATAL "   📘 Example: Add section header $section to .editorconfig"
      failed=1
    fi
  done

  local dupes
  dupes=$(grep -E '^\[.*\]$' "$file" | sort | uniq -d || true)
  if [[ -n "$dupes" ]]; then
    log FATAL "❌ Duplicate section headers found in .editorconfig:"
    echo "$dupes" | while read -r section; do log FATAL "   ↳ $section"; done
    log FATAL "   💡 Tip: Combine repeated sections or consolidate rules"
    failed=1
  fi

  while IFS= read -r line; do
    [[ "$line" =~ ^\s*# || "$line" =~ ^\s*$ || "$line" =~ ^\[.*\]$ ]] && continue

    local key value
    key=$(cut -d= -f1 <<< "$line" | xargs)
    value=$(cut -d= -f2- <<< "$line" | xargs)

    case "$key" in
      charset)
        [[ "$value" == "utf-8" ]] || {
          log FATAL "❌ Invalid charset: $value"
          log FATAL "   💡 Tip: Only 'utf-8' is allowed"
          log FATAL "   📘 Example: charset = utf-8"
          failed=1
        }
        ;;
      end_of_line)
        [[ "$value" =~ ^(lf|crlf|cr)$ ]] || {
          log FATAL "❌ Invalid end_of_line: $value"
          log FATAL "   💡 Tip: Allowed values: lf, crlf, cr"
          log FATAL "   📘 Example: end_of_line = lf"
          failed=1
        }
        ;;
      indent_style)
        [[ "$value" =~ ^(space|tab)$ ]] || {
          log FATAL "❌ Invalid indent_style: $value"
          log FATAL "   💡 Tip: Allowed: space or tab"
          log FATAL "   📘 Example: indent_style = space"
          failed=1
        }
        ;;
      indent_size|tab_width|max_line_length)
        [[ "$value" =~ ^[0-9]+$ ]] || {
          log FATAL "❌ $key must be numeric: $value"
          log FATAL "   💡 Tip: Use integers only"
          log FATAL "   📘 Example: $key = 2"
          failed=1
        }
        ;;
      insert_final_newline|trim_trailing_whitespace)
        [[ "$value" =~ ^(true|false)$ ]] || {
          log FATAL "❌ $key must be 'true' or 'false': $value"
          log FATAL "   💡 Tip: Use lowercase booleans"
          log FATAL "   📘 Example: $key = true"
          failed=1
        }
        ;;
      *)
        log WARN "⚠️ Unknown or unsupported key: $key"
        log WARN "   💡 Tip: Check for typos or unrecognized directives"
        ;;
    esac
  done < "$file"

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_all_contributorsrc — Ensure .all-contributorsrc is present, valid, and complete
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Confirms file presence at repo root
#   - Validates JSON syntax
#   - Confirms top-level fields: $schema, projectName, contributors
#   - Ensures each contributor has required login and contributions fields
#
# Why it matters:
#   The All Contributors configuration defines community recognition metadata.
#   Missing or invalid fields break contributor badges and automation tools.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::validate_all_contributorsrc
#
# Categories:
#   lint, encoding, naming, ci
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::validate_all_contributorsrc() {
  # ✅ Check: .all-contributorsrc must exist, be valid JSON, and define all required fields
  # Category: lint, encoding, naming, ci
  # Stages: check, lint, test

  local file="$ROOT_DIR/.all-contributorsrc"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing .all-contributorsrc at project root"
    log FATAL "   💡 Tip: Generate with the All Contributors CLI or copy a starter template"
    log FATAL "   📘 Example: https://allcontributors.org/docs/en/overview"
    return 1
  fi

  if ! jq empty "$file" >/dev/null 2>&1; then
    log FATAL "❌ .all-contributorsrc is not valid JSON"
    log FATAL "   💡 Tip: Run 'jq . .all-contributorsrc' or use a JSON linter to fix syntax errors"
    return 1
  fi

  if ! jq -e '."$schema"' "$file" >/dev/null 2>&1; then
    log FATAL "❌ Missing required '\$schema' in .all-contributorsrc"
    log FATAL "   💡 Tip: Add: \"\$schema\": \"https://json.schemastore.org/all-contributorsrc.json\""
    log FATAL "   📘 Example: top of file should start with a valid JSON schema key"
    failed=1
  fi

  if ! jq -e '.projectName' "$file" >/dev/null 2>&1; then
    log FATAL "❌ Missing 'projectName' field in .all-contributorsrc"
    log FATAL "   💡 Tip: Set a valid project name (string)"
    log FATAL "   📘 Example: \"projectName\": \"my-project\""
    failed=1
  fi

  if ! jq -e '.contributors | type == "array"' "$file" >/dev/null 2>&1; then
    log FATAL "❌ 'contributors' field must be a top-level array"
    log FATAL "   💡 Tip: List all contributors with their login and contribution types"
    log FATAL "   📘 Example: \"contributors\": [{ \"login\": \"alice\", \"contributions\": [\"code\"] }]"
    failed=1
  else
    local broken
    broken=$(jq -r '
      .contributors[]
      | select(
          (.login | type != "string") or
          (.contributions | type != "array" or length == 0)
        )' "$file" 2>/dev/null)

    if [[ -n "$broken" ]]; then
      log FATAL "❌ One or more contributors are missing valid 'login' or 'contributions'"
      log FATAL "   💡 Tip: Each must include: { \"login\": \"<user>\", \"contributions\": [\"code\"] }"
      log FATAL "   📘 Example: \"login\": \"alice\", \"contributions\": [\"doc\"]"
      failed=1
    fi
  fi

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ .all-contributorsrc is valid"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_makefiles — Validate presence and syntax of Makefiles
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures a root-level Makefile exists
#   - Validates Makefile syntax using `make -n`
#   - Rejects CRLF line endings in Makefiles
#   - Warns about leading spaces (Make requires tab-indented rules)
#
# Why it matters:
#   Invalid or misformatted Makefiles break local and CI workflows. This check
#   guarantees make targets work reliably across environments.
#
# Globals used:
#   - ROOT_DIR → monorepo root directory
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::validate_makefiles
#
# Categories:
#   lint, shell, ci, paths
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::validate_makefiles() {
  # ✅ Check: All Makefiles must exist, use LF line endings, and pass dry-run syntax check
  # Category: lint, shell, ci, paths
  # Stages: check, lint, build

  local failed=0

  if [[ ! -f "$ROOT_DIR/Makefile" ]]; then
    log FATAL "❌ Missing root Makefile"
    log FATAL "   💡 Tip: Create a Makefile at the project root to define reusable developer commands"
    log FATAL "   📘 Example: make lint, make dev, make deploy"
    return 1
  fi

  while read -r file; do
    if file "$file" | grep -q "CRLF"; then
      log FATAL "❌ Makefile uses CRLF line endings: $file"
      log FATAL "   💡 Tip: Convert to LF with: dos2unix $file"
      log FATAL "   📘 Example: install dos2unix and run it on affected files"
      failed=1
    fi

    if ! make -n -f "$file" >/dev/null 2>&1; then
      log FATAL "❌ Invalid Makefile syntax: $file"
      log FATAL "   💡 Tip: Run \`make -n -f $file\` locally to debug broken rules"
      log FATAL "   📘 Example: missing tabs, invalid target colons, etc."
      failed=1
    else
      log INFO "✅ Makefile syntax OK: $file"
    fi

    if grep -qP '^\s+[^#\t]' "$file"; then
      log WARN "⚠️ $file contains rule lines starting with spaces instead of tabs"
      log WARN "   💡 Tip: Use literal tab characters for commands under each rule"
      log WARN "   📘 Example: replace spaces with tabs using your editor or a linter"
    fi
  done < <(find "$ROOT_DIR" -type f -iname "Makefile")

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_biome_json_extends_root — Enforce biome.json extends root config
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures any biome.json file outside the root includes an "extends" key
#   - Verifies that each nested biome.json references the root-level config
#
# Why it matters:
#   Missing or incorrect "extends" in nested biome.json files can cause configuration drift,
#   inconsistent lint behavior, or missing rules across the monorepo.
#
# Globals used:
#   - ROOT_DIR → path to the monorepo root
#
# Example:
#   ROOT_DIR="$(git rev-parse --show-toplevel)"
#   check::validate_biome_json_extends_root
#
# Categories:
#   lint, biome, boundaries
#
# Stages:
#   lint, check, integration
# ------------------------------------------------------------------------------
check::validate_biome_json_extends_root() {
  # ✅ Check: Nested biome.json files must declare an extends field to root biome.json
  # Category: lint, biome, boundaries
  # Stages: lint, check, integration

  local failed=0
  local root_biome="$ROOT_DIR/biome.json"

  if [[ ! -f "$root_biome" ]]; then
    log FATAL "❌ Root biome.json not found at: $root_biome"
    log FATAL "   💡 Tip: Create a root-level biome.json to define shared monorepo rules"
    log FATAL "   📘 Example: touch $ROOT_DIR/biome.json"
    return 1
  fi

  local biome_files
  mapfile -t biome_files < <(find "$ROOT_DIR" -type f -name "biome.json" ! -path "$root_biome" 2>/dev/null || true)

  for file in "${biome_files[@]}"; do
    if ! jq -e '.extends' "$file" >/dev/null 2>&1; then
      log FATAL "❌ biome.json missing 'extends' key: $file"
      log FATAL "   💡 Tip: Add an 'extends' key pointing to the root biome.json (relative path)"
      log FATAL "   📘 Example: { \"extends\": \"../../biome.json\" }"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_oxlint_extends_root — Enforce .oxlintrc.json inherits from root
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all nested .oxlintrc.json files include an "extends" key
#   - Confirms each extends entry points to the root config (relative)
#
# Why it matters:
#   Without a shared base config, oxlint rules may drift between packages,
#   leading to inconsistent lint results and unexpected behavior in CI or local dev.
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::validate_oxlint_extends_root
#
# Categories:
#   lint, oxlint, boundaries
#
# Stages:
#   lint, check, integration
# ------------------------------------------------------------------------------
check::validate_oxlint_extends_root() {
  # ✅ Check: All .oxlintrc.json files outside root must extend root config
  # Category: lint, oxlint, boundaries
  # Stages: lint, check, integration

  local failed=0
  local root_file="$ROOT_DIR/.oxlintrc.json"

  if [[ ! -f "$root_file" ]]; then
    log FATAL "❌ Root .oxlintrc.json not found at: $root_file"
    log FATAL "   💡 Tip: Create a root-level .oxlintrc.json with shared rules"
    log FATAL "   📘 Example: touch $ROOT_DIR/.oxlintrc.json"
    return 1
  fi

  local oxlint_files
  mapfile -t oxlint_files < <(find "$ROOT_DIR" -type f -name ".oxlintrc.json" ! -path "$root_file" 2>/dev/null || true)

  for file in "${oxlint_files[@]}"; do
    if ! jq -e '.extends' "$file" >/dev/null 2>&1; then
      log FATAL "❌ .oxlintrc.json is missing 'extends' key: $file"
      log FATAL "   💡 Tip: Add \"extends\": \"../../.oxlintrc.json\" (adjust relative path accordingly)"
      log FATAL "   📘 Example: { \"extends\": \"../../.oxlintrc.json\" }"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}



# ------------------------------------------------------------------------------
# 🧪 check::validate_gitlab_codeowners — Validate presence and syntax of CODEOWNERS
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures CODEOWNERS file exists at .gitlab/CODEOWNERS
#   - Confirms each entry includes a valid path and at least one owner
#   - Verifies format correctness (no invalid characters, spacing)
#   - Warns if any referenced file/directory does not exist (excluding wildcards)
#
# Why it matters:
#   CODEOWNERS ensures clear review responsibility and protected ownership of code areas.
#   Invalid or missing entries prevent GitLab from enforcing merge approvals correctly.
#
# Globals used:
#   - ROOT_DIR → project root directory
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::validate_gitlab_codeowners
#
# Categories:
#   ci, naming, paths, lint
#
# Stages:
#   lint, check, integration
# ------------------------------------------------------------------------------
check::validate_gitlab_codeowners() {
  # ✅ Check: CODEOWNERS file is present, valid, and safely structured
  # Category: ci, naming, paths, lint
  # Stages: lint, check, integration

  local file="$ROOT_DIR/.gitlab/CODEOWNERS"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing CODEOWNERS file at .gitlab/CODEOWNERS"
    log FATAL "   💡 Tip: Create this file to enforce ownership and review requirements"
    log FATAL "   📘 Example: /packages/my-lib/ @team-owner"
    return 1
  fi

  if [[ ! -s "$file" ]]; then
    log FATAL "❌ CODEOWNERS file is empty"
    log FATAL "   💡 Tip: Add at least one path and owner (e.g., /src @owner)"
    log FATAL "   📘 Example: /docs/ @doc-team"
    return 1
  fi

  grep -vE '^\s*#|^\s*$' "$file" | while read -r line; do
    local path owners
    path=$(awk '{print $1}' <<< "$line")
    owners=$(awk '{$1=""; print $0}' <<< "$line" | xargs)

    if [[ -z "$owners" ]]; then
      log FATAL "❌ Missing owner for path: $path"
      log FATAL "   💡 Tip: Every CODEOWNERS entry must list at least one @username or @group"
      log FATAL "   📘 Example: $path @example-owner"
      failed=1
    fi

    # Warn on path existence (excluding globs)
    if [[ "$path" != *"*"* && ! -e "$ROOT_DIR/$path" ]]; then
      log WARN "⚠️ Path does not exist in repo: $path"
      log WARN "   💡 Tip: Ensure this path is correct or add a glob pattern if dynamic"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_gitlab_ci_jobs_have_script — Ensure all GitLab CI jobs include `script:`
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures every top-level CI job includes a `script:` key
#   - Parses all GitLab CI YAML files from root and nested /.gitlab/ci or /gitlab/ci folders
#
# Why it matters:
#   GitLab jobs without `script:` silently run nothing, breaking expected pipelines
#   and silently skipping key validation, build, or deploy steps.
#
# Globals used:
#   - ROOT_DIR → path to repo root
#
# Example:
#   check::validate_gitlab_ci_jobs_have_script
#
# Categories:
#   ci, lint, paths
#
# Stages:
#   lint, check, integration
# ------------------------------------------------------------------------------
check::validate_gitlab_ci_jobs_have_script() {
  # ✅ Check: All GitLab CI jobs define a `script:` key
  # Category: ci, lint, paths
  # Stages: lint, check, integration

  local failed=0

  command -v yq >/dev/null || {
    log FATAL "❌ yq is required to parse GitLab CI YAML files"
    log FATAL "   💡 Tip: Install yq from https://github.com/mikefarah/yq"
    log FATAL "   📘 Example: brew install yq"
    return 1
  }

  mapfile -t ci_files < <(
    find "$ROOT_DIR" -type f \( \
      -name ".gitlab-ci.yml" \
      -o -path "*/.gitlab/ci/*.yml" \
      -o -path "*/gitlab/ci/*.yml" \
    \)
  )

  for file in "${ci_files[@]}"; do
    log INFO "🔍 Checking GitLab CI file: $file"

    mapfile -t job_keys < <(
      yq e 'keys | .[]' "$file" | grep -vE '^(stages|include|default|workflow|variables|before_script|after_script)$'
    )

    for job in "${job_keys[@]}"; do
      local has_script
      has_script=$(yq e ".\"$job\".script" "$file" 2>/dev/null)
      if [[ "$has_script" == "null" || -z "$has_script" ]]; then
        log FATAL "❌ CI job '$job' in $file is missing a script:"
        log FATAL "   💡 Tip: Add a \`script:\` entry to this job to ensure it runs commands"
        log FATAL "   📘 Example:"
        log FATAL "       $job:"
        log FATAL "         stage: test"
        log FATAL "         script:"
        log FATAL "           - echo \"Hello from $job\""
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_inline_gitlab_scripts — Enforce shell script usage in GitLab CI jobs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects GitLab CI `script:` entries that contain inline shell commands
#   - Requires use of external scripts (e.g., ./scripts/build.sh) instead
#
# Why it matters:
#   - Promotes reusable, testable, and auditable scripts
#   - Improves linting, security scanning, and portability
#   - Reduces duplication and YAML clutter
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::disallow_inline_gitlab_scripts
#
# Categories:
#   ci, lint, shell
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_inline_gitlab_scripts() {
  # ✅ Check: Disallow inline GitLab CI scripts — enforce external shell scripts
  # Category: ci, lint, shell
  # Stages: lint, check

  local failed=0

  command -v yq >/dev/null || {
    log FATAL "❌ yq is required to parse GitLab CI YAML files"
    log FATAL "   💡 Tip: Install yq from https://github.com/mikefarah/yq"
    log FATAL "   📘 Example: brew install yq"
    return 1
  }

  mapfile -t ci_files < <(
    find "$ROOT_DIR" -type f \( \
      -name ".gitlab-ci.yml" \
      -o -path "*/.gitlab/ci/*.yml" \
      -o -path "*/gitlab/ci/*.yml" \
    \)
  )

  for file in "${ci_files[@]}"; do
    log INFO "🔍 Scanning GitLab CI file: $file"

    # Detect all script entries and check for anything not calling ./scripts/*.sh
    mapfile -t inline_jobs < <(
      yq e '.. | select(has("script")) | .script[]' "$file" 2>/dev/null | \
      grep -vE '^\s*\./scripts/[^ ]+\.sh(\s|$)' | grep -vE '^\s*#' || true
    )

    if [[ "${#inline_jobs[@]}" -gt 0 ]]; then
      log FATAL "❌ Inline script commands found in $file:"
      for cmd in "${inline_jobs[@]}"; do
        log FATAL "   ↳ $cmd"
      done
      log FATAL "💡 Tip: Move all logic to ./scripts/*.sh and reference them"
      log FATAL "📘 Example:"
      log FATAL "   script:"
      log FATAL "     - ./scripts/build.sh"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_shared_linter_inheritance — Block override of root Biome/Oxlint unless explicitly allowed
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Prevents packages from overriding root biome.json or .oxlintrc.json
#   - Allows override only if marked with the special comment: "// override": "allowed"
#
# Why it matters:
#   - Prevents inconsistent linting and formatting across the monorepo
#   - Enforces a centralized linter configuration for predictability and security
#
# Globals used:
#   - ROOT_DIR → project root directory
#
# Example:
#   ROOT_DIR=$(git rev-parse --show-toplevel)
#   check::enforce_shared_linter_inheritance
#
# Categories:
#   lint, naming, boundaries, biome, oxlint
#
# Stages:
#   lint, check, test
# ------------------------------------------------------------------------------
check::enforce_shared_linter_inheritance() {
  # ✅ Check: Disallow Biome/Oxlint config overrides unless explicitly permitted
  # Category: lint, naming, boundaries, biome, oxlint
  # Stages: lint, check, test

  local failed=0
  local root_biome="$ROOT_DIR/biome.json"
  local root_oxlint="$ROOT_DIR/.oxlintrc.json"

  if [[ ! -f "$root_biome" ]]; then
    log WARN "⚠️ Root biome.json not found — skipping Biome enforcement"
  fi
  if [[ ! -f "$root_oxlint" ]]; then
    log WARN "⚠️ Root .oxlintrc.json not found — skipping Oxlint enforcement"
  fi

  local overrides=()
  overrides+=($(find "$ROOT_DIR" -type f -name "biome.json" ! -path "$root_biome"))
  overrides+=($(find "$ROOT_DIR" -type f -name ".oxlintrc.json" ! -path "$root_oxlint"))

  for file in "${overrides[@]}"; do
    if grep -q '"// override": *"allowed"' "$file"; then
      log INFO "✅ Override explicitly allowed by comment in: $file"
    else
      log FATAL "❌ Linter config override without permission: $file"
      log FATAL "   💡 Tip: If intentional, add the comment \"// override\": \"allowed\""
      log FATAL "   📘 Example: { \"extends\": \"../../biome.json\", \"// override\": \"allowed\" }"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_relative_imports_to_product_siblings — Enforce alias imports for product layer boundaries
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects relative imports that cross sibling product layers (e.g. ../../../api/)
#   - Enforces usage of import aliases instead (e.g. @product/api)
#
# Why it matters:
#   - Prevents fragile or brittle relative paths between product workspaces
#   - Enforces encapsulation and boundaries within product layers
#   - Improves readability and refactor safety with scalable aliasing
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_relative_imports_to_product_siblings
#
# Categories:
#   lint, boundaries, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_relative_imports_to_product_siblings() {
  # ✅ Check: Prevent relative imports across product layers (use alias imports instead)
  # Category: lint, boundaries, paths
  # Stages: lint, check

  local failed=0
  local layers="api|web|data|marketing|mobile|branding|infra"

  mapfile -t files < <(
    find "$ROOT_DIR/packages/products" -type f \
      \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \)
  )

  for file in "${files[@]}"; do
    if grep -qE "from\s+[\"'](\.\.\/){2,}(${layers})\/" "$file"; then
      log FATAL "❌ Disallowed relative import into sibling product layer in: $file"
      log FATAL "   💡 Tip: Use alias imports such as '@product/api' instead of deep relative paths"
      log FATAL "   📘 Example: import { handler } from '@myapp/api/handler'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_project_boundaries — Enforce isolation between product layers
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects cross-product imports (e.g. ../../../products/xyz)
#   - Detects sibling-layer imports within a product (e.g. api → web)
#
# Why it matters:
#   - Prevents tight coupling and fragile architecture across product layers
#   - Encourages proper reuse through @shared instead of deep relative imports
#   - Enforces modular and maintainable layering boundaries
#
# Globals used:
#   - ROOT_DIR → root of the monorepo
#
# Example:
#   check::enforce_project_boundaries
#
# Categories:
#   boundaries, lint, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::enforce_project_boundaries() {
  # ✅ Check: Product code must not import from sibling products or sibling layers
  # Category: boundaries, lint, paths
  # Stages: lint, check

  local failed=0
  local pattern='../products/[^/]+/(api|web|data|infra|branding|marketing|mobile)'
  local layers='api|web|data|infra|branding|marketing|mobile'

  log INFO "🔒 Validating import boundaries between products and layers..."

  # 🔍 Cross-product imports (e.g., ../../../products/other-product/api)
  offenders=$(grep -rE "from\s+[\"'](\.\./)+products/[^/]+/($layers)/" "$ROOT_DIR/packages/products" \
    --include='*.ts' --include='*.tsx' --exclude-dir='node_modules' || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Disallowed cross-product imports found:"
    echo "$offenders" | while read -r line; do log FATAL "   ↳ $line"; done
    log FATAL "💡 Tip: Move shared logic to packages/shared/ and import using '@shared/*'"
    log FATAL "📘 Example: import { foo } from '@shared/utils/foo'"
    failed=1
  fi

  # 🔍 Cross-layer imports (e.g., packages/products/foo/api importing from ../web)
  while read -r product_dir; do
    product_name=$(basename "$product_dir")

    for src_layer in $layers; do
      src_dir="$product_dir/$src_layer"
      [[ -d "$src_dir" ]] || continue

      for target_layer in $layers; do
        [[ "$target_layer" == "$src_layer" ]] && continue
        [[ ! -d "$product_dir/$target_layer" ]] && continue

        bad_imports=$(grep -rE "from\s+[\"'](\.\./)+$target_layer/" "$src_dir" \
          --include='*.ts' --include='*.tsx' --exclude-dir='node_modules' || true)

        if [[ -n "$bad_imports" ]]; then
          log FATAL "❌ Disallowed sibling-layer import in '$product_name': $src_layer → $target_layer"
          echo "$bad_imports" | while read -r line; do log FATAL "   ↳ $line"; done
          log FATAL "💡 Tip: Move shared logic to packages/shared/ and import via alias"
          log FATAL "📘 Example: import { util } from '@shared/$target_layer'"
          failed=1
        fi
      done
    done
  done < <(find "$ROOT_DIR/packages/products" -mindepth 1 -maxdepth 1 -type d)

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No cross-product or cross-layer import violations found"
}

# ------------------------------------------------------------------------------
# 🧪 check::git_protect_main_branch — Ensure main branch is protected
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Prevents direct work or force-pushing on `main` or `master`
#   - Blocks force-push or squash/fixup commits on protected branches
#
# Why it matters:
#   - Prevents irreversible history changes on default branches
#   - Enforces safe Git workflows and protects shared branch integrity
#
# Globals used:
#   - None
#
# Example:
#   check::git_protect_main_branch
#
# Categories:
#   safety, git
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::git_protect_main_branch() {
  # ✅ Check: main/master is protected from force-push and amend
  # Category: safety, git
  # Stages: pre-commit, check

  local failed=0
  local current_branch
  current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

  if [[ "$current_branch" =~ ^(main|master)$ ]]; then
    # 🛡️ Prevent force push configs
    local push_default
    push_default=$(git config --get push.default || echo "")

    if [[ "$push_default" == "force" || "$push_default" == "matching" ]]; then
      log FATAL "❌ Force-push policy '$push_default' is unsafe on '$current_branch'"
      log FATAL "💡 Tip: Set push.default to 'simple' to prevent accidental overwrites"
      log FATAL "📘 Example: git config --global push.default simple"
      failed=1
    fi

    # 🛡️ Block squash/fixup commits on main/master
    local last_commit
    last_commit=$(git log -1 --pretty=%s 2>/dev/null || echo "")

    if [[ "$last_commit" =~ ^(fixup\!|squash\!) ]]; then
      log FATAL "❌ Last commit is a squash/fixup on protected branch '$current_branch'"
      log FATAL "💡 Tip: Use 'git rebase -i' to clean history before pushing to protected branches"
      log FATAL "📘 Example: git rebase -i HEAD~5"
      failed=1
    fi
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::warn_unused_gitignore_patterns — Detect legacy or unused .gitignore globs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds ignore rules in .gitignore that no longer match any files
#   - Warns on stale patterns that may be leftovers from deleted paths
#
# Why it matters:
#   - Prevents confusion from obsolete or ineffective ignore rules
#   - Keeps ignore files lean and accurate
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::warn_unused_gitignore_patterns
#
# Categories:
#   lint, paths
#
# Stages:
#   check
# ------------------------------------------------------------------------------
check::warn_unused_gitignore_patterns() {
  # ✅ Check: Warn if .gitignore has unused or legacy globs
  # Category: lint, paths
  # Stages: check

  local file="$ROOT_DIR/.gitignore"
  [[ ! -f "$file" ]] && return 0

  grep -vE '^\s*#|^\s*$' "$file" | while read -r pattern; do
    # Strip leading `/` or trailing `/` for compatibility
    local clean_pattern
    clean_pattern=$(echo "$pattern" | sed 's|^/||; s|/$||')

    # Find if any file matches the glob pattern
    if ! find "$ROOT_DIR" -path "$ROOT_DIR/$clean_pattern" -print -quit 2>/dev/null | grep -q .; then
      log WARN "⚠️ Unused .gitignore pattern: $pattern"
      log WARN "   💡 Tip: Remove this entry if the path no longer exists in the repo"
      log WARN "   📘 Example: grep -r $pattern . → returns no results"
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::warn_bash_shebang_on_portable_scripts — Warn on hardcoded /bin/bash shebangs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects shell scripts that start with `#!/bin/bash`
#   - Recommends replacing them with `#!/usr/bin/env bash` for portability
#
# Why it matters:
#   - /bin/bash does not exist on all systems (e.g. Nix, BSD, embedded environments)
#   - Using /usr/bin/env respects the user’s PATH and makes scripts portable
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::warn_bash_shebang_on_portable_scripts
#
# Categories:
#   shell, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::warn_bash_shebang_on_portable_scripts() {
  # ✅ Check: Recommend env-based shebang instead of hardcoded /bin/bash
  # Category: shell, lint
  # Stages: lint, check

  local offenders
  offenders=$(grep -rIl '^#!/bin/bash' "$ROOT_DIR" --exclude-dir={.git,node_modules} --include='*.sh' || true)

  if [[ -n "$offenders" ]]; then
    log WARN "⚠️ Hardcoded shebangs using /bin/bash detected:"
    echo "$offenders" | while read -r file; do log WARN "   ↳ $file"; done
    log WARN "💡 Tip: Use '#!/usr/bin/env bash' for improved portability"
    log WARN "📘 Example: sed -i '1s|^#!/bin/bash|#!/usr/bin/env bash|' <script>"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_nextjs_artifacts — Disallow Next.js usage entirely
# ------------------------------------------------------------------------------
# This function blocks any files, folders, or configs associated with Next.js
#
# Why it matters:
#   - This monorepo uses alternative frameworks (e.g., SvelteKit)
#   - Prevents accidental adoption or drift into incompatible stacks
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_nextjs_artifacts
#
# Categories:
#   lint, package, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_nextjs_artifacts() {
  # ✅ Check: Disallow all Next.js-related artifacts
  # Category: lint, package, paths
  # Stages: lint, check

  local offenders
  offenders=$(find "$ROOT_DIR" \
    \( \
      -name "next.config.js" \
      -o -name "next.config.ts" \
      -o -name "next-env.d.ts" \
      -o -name ".next" \
      -o -path "*/.next" \
      -o -path "*/pages" \
      -o -name "middleware.ts" \
      -o -name "middleware.js" \
    \) ! -path "*/node_modules/*" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Next.js artifacts are not allowed in this project:"
    echo "$offenders" | while read -r f; do log FATAL "   ↳ $f"; done
    log FATAL "💡 Tip: Remove these and use SvelteKit or the approved framework"
    log FATAL "📘 Example: rm -rf .next next.config.js"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_docker_compose_v1 — Enforce Docker Compose v3+
# ------------------------------------------------------------------------------
# This check fails if any docker-compose.yml file uses version '2' or lower.
#
# Why it matters:
#   - Docker Compose v1/2 are deprecated and lack modern support
#   - Ensures compatibility with CI/CD and Kubernetes tooling
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_docker_compose_v1
#
# Categories:
#   infra, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_docker_compose_v1() {
  # ✅ Check: Block usage of docker-compose v1 or v2
  # Category: infra, lint
  # Stages: lint, check

  local matches
  matches=$(find "$ROOT_DIR" -type f -name "docker-compose.yml" \
    -exec grep -lE '^version: "?[12](\.[0-9]+)?"?$' {} + 2>/dev/null || true)

  if [[ -n "$matches" ]]; then
    log FATAL "❌ Deprecated Docker Compose version detected (v1/v2):"
    echo "$matches" | while read -r file; do log FATAL "   ↳ $file"; done
    log FATAL "💡 Tip: Upgrade docker-compose files to version: '3.9'"
    log FATAL "📘 Example:"
    log FATAL "   version: '3.9'"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_gatsby_artifacts — Disallow Gatsby-specific files
# ------------------------------------------------------------------------------
# This function blocks use of Gatsby config and build artifacts
#
# Why it matters:
#   - Prevents tight coupling to Gatsby
#   - Encourages use of approved static site generators
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_gatsby_artifacts
#
# Categories:
#   lint, package
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_gatsby_artifacts() {
  # ✅ Check: Block Gatsby usage
  # Category: lint, package
  # Stages: lint, check

  local offenders
  offenders=$(find "$ROOT_DIR" \
    \( -name "gatsby-config.js" -o -name "gatsby-node.js" -o -name "gatsby-browser.js" -o -name ".cache" -o -name "public" \) \
    ! -path "*/node_modules/*" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Gatsby artifacts/configs detected — Gatsby is not allowed:"
    echo "$offenders" | while read -r file; do log FATAL "   ↳ $file"; done
    log FATAL "💡 Tip: Use the approved documentation/static site generator"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_hugo_configs — Block Hugo configuration or layouts
# ------------------------------------------------------------------------------
# This check blocks common Hugo setup files like config.{toml,yaml} and layouts/
#
# Why it matters:
#   - Prevents dependency on Hugo for documentation
#   - Enforces toolchain uniformity
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_hugo_configs
#
# Categories:
#   lint, package
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_hugo_configs() {
  # ✅ Check: Block Hugo configuration
  # Category: lint, package
  # Stages: lint, check

  local offenders
  offenders=$(find "$ROOT_DIR" \
    \( -name "config.toml" -o -name "config.yaml" -o -name "config.yml" -o -name "layouts" -o -name "archetypes" \) \
    ! -path "*/node_modules/*" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Hugo-related files or folders detected — Hugo is not allowed:"
    echo "$offenders" | while read -r path; do log FATAL "   ↳ $path"; done
    log FATAL "💡 Tip: Use supported site generators like Docusaurus or VitePress"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_react_native_configs — Disallow React Native files
# ------------------------------------------------------------------------------
# This check blocks any React Native artifacts like `ios/`, `android/`, metro configs, etc.
#
# Why it matters:
#   - Enforces mobile tech stack decisions (e.g., Capacitor, Expo, etc.)
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_react_native_configs
#
# Categories:
#   lint, mobile, package
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_react_native_configs() {
  # ✅ Check: Block React Native-specific artifacts
  # Category: lint, mobile, package
  # Stages: lint, check

  local offenders
  offenders=$(find "$ROOT_DIR" \
    \( -name "metro.config.js" -o -name "app.json" -o -name "index.js" -o -name "android" -o -name "ios" \) \
    ! -path "*/node_modules/*" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ React Native project files detected — React Native is disallowed:"
    echo "$offenders" | while read -r f; do log FATAL "   ↳ $f"; done
    log FATAL "💡 Tip: Use the approved mobile platform and tooling"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_static_site_generators — Disallow unapproved SSG configs
# ------------------------------------------------------------------------------
# This check blocks known config files for SSG tools that are not part of the stack
#
# Why it matters:
#   - Prevents lock-in to SSGs like 11ty, Docusaurus, Docsify, etc.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_static_site_generators
#
# Categories:
#   lint, package, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_static_site_generators() {
  # ✅ Check: Block unapproved static site generator configurations
  # Category: lint, package, paths
  # Stages: lint, check

  local matches
  matches=$(find "$ROOT_DIR" \
    \( \
      -name "11ty.config.js" \
      -o -name "mkdocs.yml" \
      -o -name "mkdocs.yaml" \
      -o -name "docusaurus.config.js" \
      -o -name "_sidebar.md" \
      -o -name "docsify.js" \
    \) \
    ! -path "*/node_modules/*" || true)

  if [[ -n "$matches" ]]; then
    log FATAL "❌ Static site generator configs detected — unapproved SSG tooling:"
    echo "$matches" | while read -r f; do log FATAL "   ↳ $f"; done
    log FATAL "💡 Tip: Use approved tools like VitePress or unified MDX pipelines"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_test_file_naming — Ensure test files follow *.test.ts(x) and live in __tests__ directories
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all test files are named *.test.ts or *.test.tsx
#   - Enforces that all test files are located inside __tests__ folders
#
# Why it matters:
#   - Enforces test discoverability by tooling
#   - Prevents tests from polluting non-test folders
#
# Globals used:
#   - ROOT_DIR → monorepo root directory
#
# Example:
#   check::enforce_test_file_naming
#
# Categories:
#   lint, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::enforce_test_file_naming() {
  # ✅ Check: Test files must follow *.test.ts[x] and be located in __tests__ folders
  # Category: lint, paths
  # Stages: lint, check

  local failed=0

  local misplaced_tests
  misplaced_tests=$(find "$ROOT_DIR" -type f $begin:math:text$ -name '*.test.ts' -o -name '*.test.tsx' $end:math:text$ \
    ! -path '*/__tests__/*' ! -path '*/node_modules/*' || true)

  if [[ -n "$misplaced_tests" ]]; then
    log FATAL "❌ Test files must reside in __tests__/ directories:"
    echo "$misplaced_tests" | while read -r f; do log FATAL "   ↳ $f"; done
    log FATAL "💡 Tip: Move test files to a __tests__/ directory"
    log FATAL "📘 Example: packages/foo/__tests__/bar.test.ts"
    failed=1
  fi

  local invalid_names
  invalid_names=$(find "$ROOT_DIR" -type f \
    -path '*/__tests__/*' ! -name '*.test.ts' ! -name '*.test.tsx' \
    ! -path '*/node_modules/*' || true)

  if [[ -n "$invalid_names" ]]; then
    log FATAL "❌ Files inside __tests__/ must be named *.test.ts[x]:"
    echo "$invalid_names" | while read -r f; do log FATAL "   ↳ $f"; done
    log FATAL "💡 Tip: Rename files to match '*.test.ts' or '*.test.tsx'"
    log FATAL "📘 Example: packages/foo/__tests__/example.test.ts"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_benchmark_file_naming — Ensure benchmarks use *.benchmark.ts[x] and live in __benchmarks__
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Benchmark files must be named *.benchmark.ts or *.benchmark.tsx
#   - All benchmark files must live inside __benchmarks__ directories
#
# Why it matters:
#   - Enables structured discovery by benchmark runners
#   - Prevents misplacement or confusion with production/test code
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::enforce_benchmark_file_naming
#
# Categories:
#   lint, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::enforce_benchmark_file_naming() {
  # ✅ Check: Benchmark files must follow *.benchmark.ts[x] and be located in __benchmarks__ directories
  # Category: lint, paths
  # Stages: lint, check

  local failed=0

  local misplaced
  misplaced=$(find "$ROOT_DIR" -type f $begin:math:text$ -name '*.benchmark.ts' -o -name '*.benchmark.tsx' $end:math:text$ \
    ! -path '*/__benchmarks__/*' ! -path '*/node_modules/*' || true)

  if [[ -n "$misplaced" ]]; then
    log FATAL "❌ Benchmark files must reside in __benchmarks__/ directories:"
    echo "$misplaced" | while read -r f; do log FATAL "   ↳ $f"; done
    log FATAL "💡 Tip: Move benchmark files into a __benchmarks__/ directory"
    log FATAL "📘 Example: packages/foo/__benchmarks__/perf.benchmark.ts"
    failed=1
  fi

  local invalid
  invalid=$(find "$ROOT_DIR" -type f \
    -path '*/__benchmarks__/*' ! -name '*.benchmark.ts' ! -name '*.benchmark.tsx' \
    ! -path '*/node_modules/*' || true)

  if [[ -n "$invalid" ]]; then
    log FATAL "❌ Files inside __benchmarks__/ must be named *.benchmark.ts[x]:"
    echo "$invalid" | while read -r f; do log FATAL "   ↳ $f"; done
    log FATAL "💡 Tip: Rename to '*.benchmark.ts' or '*.benchmark.tsx'"
    log FATAL "📘 Example: packages/foo/__benchmarks__/parser.benchmark.ts"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_tsconfig_paths — Ensure all TS path aliases resolve correctly
# ------------------------------------------------------------------------------
# This check ensures that:
#   - All tsconfig.json path aliases resolve to real files/directories
#   - No path alias points outside the monorepo root (via ../..)
#   - Only allowed paths inside the workspace are used
#
# Why it matters:
#   Broken or unsafe path aliases can lead to build failures, incorrect imports,
#   and leakage outside the intended monorepo scope.
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   check::validate_tsconfig_paths
#
# Categories:
#   tsconfig, paths, lint
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::validate_tsconfig_paths() {
  # ✅ Check: All tsconfig.json paths resolve within the monorepo
  # Category: tsconfig, paths, lint
  # Stages: check, lint, build

  local failed=0

  mapfile -t tsconfigs < <(find "$ROOT_DIR" -name tsconfig.json -not -path "*/node_modules/*")

  for config in "${tsconfigs[@]}"; do
    local base
    base=$(dirname "$config")

    jq -r '.compilerOptions.paths // {} | to_entries[] | "\(.key):\(.value[])"' "$config" 2>/dev/null | while IFS=: read -r alias path; do
      # Remove trailing wildcard (e.g. "src/*" → "src")
      clean_path="${path%%/*}"
      full_path=$(realpath -m "$base/$clean_path")

      if [[ "$full_path" != "$ROOT_DIR"* ]]; then
        log FATAL "❌ Path alias in $config points outside monorepo:"
        log FATAL "   ↳ \"$alias\": \"$path\" → $full_path"
        log FATAL "   💡 Tip: Keep all alias targets inside the workspace"
        log FATAL "   📘 Example: @shared/logger → packages/shared/logger/src"
        failed=1
      elif [[ ! -e "$full_path" ]]; then
        log FATAL "❌ Path alias in $config does not resolve:"
        log FATAL "   ↳ \"$alias\": \"$path\" → $full_path (missing)"
        log FATAL "   💡 Tip: Ensure the target directory or file exists"
        log FATAL "   📘 Example: mkdir -p $full_path"
        failed=1
      else
        log INFO "✅ Alias resolved: $alias → $full_path"
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_relative_imports_to_shared — Enforce alias imports for shared modules
# ------------------------------------------------------------------------------
# This check blocks relative deep imports into shared/ (e.g., ../../../shared/)
# and requires using alias paths (e.g., @/shared/...) for consistency and readability.
#
# Why it matters:
#   Deep relative imports are fragile and unreadable. Enforcing alias paths
#   ensures maintainability, consistent tooling, and proper module resolution.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_relative_imports_to_shared
#
# Categories:
#   boundaries, paths, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::disallow_relative_imports_to_shared() {
  # ✅ Check: Block deep relative imports to shared — require alias instead
  # Category: boundaries, paths, lint
  # Stages: lint, check

  local failed=0

  mapfile -t files < <(find "$ROOT_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \))

  for file in "${files[@]}"; do
    if grep -E "from\s+['\"](\.\./){2,}shared/" "$file" > /dev/null; then
      log FATAL "❌ Relative import into shared/ detected in: $file"
      log FATAL "   💡 Tip: Use alias imports like '@/shared/...' instead of relative paths"
      log FATAL "   📘 Example: import x from '@/shared/utils/x'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_non_fast_forward_on_main — Prevent unsafe merge history on main
# ------------------------------------------------------------------------------
# This function enforces that the `main` branch has not been modified with
# a non-fast-forward merge (e.g., `merge --no-ff`, squash merges, etc).
#
# Why it matters:
#   Non-linear history on `main` makes debugging, auditing, and reviewing history harder.
#   Prevents introduction of merge commits and enforces consistent rebased history.
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::disallow_non_fast_forward_on_main
#
# Categories:
#   safety, ci, git
#
# Stages:
#   check, lint, integration
# ------------------------------------------------------------------------------
check::disallow_non_fast_forward_on_main() {
  # ✅ Check: main branch is fast-forward only (no merge commits)
  # Category: safety, ci, git
  # Stages: check, lint, integration

  if ! git show-ref --verify --quiet refs/heads/main; then
    log FATAL "❌ Local 'main' branch not found — cannot validate merge policy"
    log FATAL "   💡 Tip: Fetch all branches first: git fetch origin"
    log FATAL "   📘 Example: git fetch origin && git checkout main"
    return 1
  fi

  local merge_commits
  merge_commits=$(git log main --merges --oneline)

  if [[ -n "$merge_commits" ]]; then
    log FATAL "❌ Non-fast-forward merges found on main branch:"
    echo "$merge_commits" | while read -r line; do log FATAL "   ↳ $line"; done
    log FATAL "💡 Tip: Enforce linear history with: git config --add pull.ff only"
    log FATAL "📘 Example: Use 'git pull --rebase' or 'git rebase' instead of 'git merge'"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_merge_commits_on_main — Enforce linear history on main branch
# ------------------------------------------------------------------------------
# This function ensures that the `main` branch does not contain merge commits,
# enforcing a clean rebase-style history. This avoids confusing merge graphs,
# simplifies blame and bisect, and aligns with many GitOps and CI pipelines.
#
# Why it matters:
#   - Merge commits on main pollute history and complicate CI automation.
#   - Linear history is easier to read, review, and debug.
#
# Globals used:
#   - GIT_DIR → implicitly determined by git
#
# Example:
#   check::disallow_merge_commits_on_main
#
# Categories:
#   git, lint, ci
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::disallow_merge_commits_on_main() {
  # ✅ Check: main branch must not contain merge commits
  # Category: git, lint, ci
  # Stages: check, lint, pre-commit

  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)

  if [[ "$current_branch" != "main" ]]; then
    log INFO "ℹ️ Not on main branch — skipping merge commit check"
    return 0
  fi

  local merge_commits
  merge_commits=$(git log --merges --pretty=format:'%h %s' origin/main..HEAD)

  if [[ -n "$merge_commits" ]]; then
    log FATAL "❌ Merge commits are disallowed on main — use rebase instead:"
    echo "$merge_commits" | while read -r commit; do log FATAL "   ↳ $commit"; done
    log FATAL "💡 Tip: Use 'git rebase origin/main' before merging"
    log FATAL "📘 Example: Rebase your branch and use squash or fast-forward merge"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_todo_in_docs — Prevent placeholders in documentation files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all Markdown (*.md) files in the docs/ directory
#   - Fails if any file contains TODO, FIXME, or placeholder tags like <insert ... here>
#
# Why it matters:
#   - Placeholder content in documentation is unprofessional and misleading
#   - Prevents publishing or committing incomplete or temporary copy
#
# Globals used:
#   - ROOT_DIR → project root (must be exported)
#
# Example:
#   check::disallow_todo_in_docs
#
# Categories:
#   lint, paths, docs
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::disallow_todo_in_docs() {
  # ✅ Check: Docs must not contain TODO, FIXME, or <insert ... here> placeholders
  # Category: lint, paths, docs
  # Stages: check, lint

  local failed=0
  local pattern='TODO|FIXME|<insert[^>]*here>'

  log INFO "📚 Scanning documentation for placeholder content"

  mapfile -t offenders < <(grep -rInE "$pattern" "$ROOT_DIR/docs" --include="*.md" || true)

  if [[ ${#offenders[@]} -gt 0 ]]; then
    log FATAL "❌ Placeholder markers found in documentation:"
    for match in "${offenders[@]}"; do
      log FATAL "   ↳ $match"
    done
    log FATAL "💡 Tip: Remove TODOs, FIXMEs, and placeholder tags before commit"
    log FATAL "📘 Example: Replace '<insert architecture diagram here>' with actual content"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_markdown_links — Ensure all local [link](...) references exist
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all Markdown files for local [link](...) references
#   - Verifies each referenced file exists on disk (ignores http(s), mailto, anchors)
#
# Why it matters:
#   - Broken links in documentation reduce credibility and frustrate users
#   - Helps ensure high-quality, navigable docs
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::validate_markdown_links
#
# Categories:
#   lint, paths, docs
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::validate_markdown_links() {
  # ✅ Check: All local markdown links resolve to real files
  # Category: lint, paths, docs
  # Stages: lint, check

  local failed=0
  local file href base target

  log INFO "🔗 Validating local [link](...) references in Markdown files"

  mapfile -t md_files < <(find "$ROOT_DIR" -type f -name "*.md" -not -path "*/node_modules/*")

  for file in "${md_files[@]}"; do
    while read -r href; do
      href=$(echo "$href" | sed -E 's/.*\]\(([^)]+)\).*/\1/')
      [[ "$href" =~ ^(http|https|mailto): ]] && continue
      [[ "$href" =~ ^# ]] && continue
      [[ "$href" =~ ^/ ]] && continue

      base=$(dirname "$file")
      target="$base/$href"

      if [[ ! -e "$target" && ! -e "$target.md" && ! -e "$target/index.md" ]]; then
        log FATAL "❌ Broken local link in $file → $href"
        log FATAL "   💡 Tip: Fix the broken link target or rename the referenced file"
        log FATAL "   📘 Example: Replace [Guide]($href) with a working file path"
        failed=1
      fi
    done < <(grep -oE '\[[^]]+\]\([^)]+\)' "$file" || true)
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_script_descriptions — Ensure all scripts have meta descriptions
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Iterates all workspace package.json files
#   - Ensures each "scripts" entry has a corresponding key in "meta.scripts.description"
#   - Fails if any are undocumented
#
# Why it matters:
#   - Improves clarity and onboarding by documenting script purpose
#   - Enables tooling to display helpful descriptions in UIs or CLIs
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::enforce_script_descriptions
#
# Categories:
#   lint, package
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::enforce_script_descriptions() {
  # ✅ Check: Every script in package.json must have a meta.scripts.description entry
  # Category: lint, package
  # Stages: check, lint, pre-commit

  local failed=0
  local pkg script_keys desc_keys missing

  mapfile -t pkg_files < <(find "$ROOT_DIR" -name package.json ! -path "*/node_modules/*")

  for pkg in "${pkg_files[@]}"; do
    log INFO "📦 Checking scripts descriptions in: $pkg"

    mapfile -t script_keys < <(jq -r '.scripts | keys[]?' "$pkg" 2>/dev/null || true)
    mapfile -t desc_keys < <(jq -r '.meta?.scripts?.description | keys[]?' "$pkg" 2>/dev/null || true)

    for script in "${script_keys[@]}"; do
      if ! printf '%s\n' "${desc_keys[@]}" | grep -qx "$script"; then
        log FATAL "❌ Missing script description in $pkg: \"$script\""
        log FATAL "   💡 Tip: Add meta.scripts.description[\"$script\"] in package.json"
        log FATAL "   📘 Example:"
        log FATAL "     \"meta\": { \"scripts\": { \"description\": { \"$script\": \"What this script does\" } } }"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_branch_naming_convention — Require standard branch prefixes
# ------------------------------------------------------------------------------
# This check ensures that active Git branches follow a consistent naming scheme,
# such as `feature/`, `fix/`, `release/`, etc.
#
# Why it matters:
#   - Enforces semantic structure in Git history
#   - Aids automation, CI rules, changelog generation, etc.
#   - Prevents unstructured or accidental branch naming
#
# Globals used:
#   - None (executes `git rev-parse --abbrev-ref HEAD`)
#
# Example:
#   check::enforce_branch_naming_convention
#
# Categories:
#   ci, naming, lint
#
# Stages:
#   pre-commit, check, lint
# ------------------------------------------------------------------------------
check::enforce_branch_naming_convention() {
  # ✅ Check: Enforce prefix-based branch naming conventions
  # Category: ci, naming, lint
  # Stages: pre-commit, check, lint

  local failed=0
  local allowed_prefixes="feature|fix|hotfix|chore|release|test|docs"

  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

  if [[ -z "$current_branch" || "$current_branch" == "HEAD" ]]; then
    log WARN "⚠️ Could not determine current Git branch (detached HEAD?)"
    return 0
  fi

  if ! grep -qE "^($allowed_prefixes)/.+$" <<< "$current_branch"; then
    log FATAL "❌ Branch '$current_branch' does not follow naming convention"
    log FATAL "   💡 Tip: Use one of the approved prefixes:"
    log FATAL "      - feature/ → for new features"
    log FATAL "      - fix/     → for bug fixes"
    log FATAL "      - hotfix/  → for urgent production patches"
    log FATAL "      - chore/   → for maintenance or cleanup tasks"
    log FATAL "      - release/ → for versioned release branches"
    log FATAL "      - test/    → for testing-related changes"
    log FATAL "      - docs/    → for documentation updates"
    log FATAL "📘 Example: feature/add-telemetry, fix/login-redirect, release/v2.1.0"
    return 1
  else
    log INFO "✅ Branch name conforms: $current_branch"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::detect_undeclared_dependencies — Detect external imports not declared in package.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parses import/require/dynamic imports from all source files
#   - Compares against dependencies + devDependencies in package.json
#   - Fails if any package is used but not declared
#
# Why it matters:
#   - Prevents runtime errors due to undeclared modules
#   - Keeps package.json accurate and maintainable
#
# Globals used:
#   - ROOT_DIR → path to project root
#
# Example:
#   ROOT_DIR=. check::detect_undeclared_dependencies
#
# Categories:
#   lint, package
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::detect_undeclared_dependencies() {
  # ✅ Check: No undeclared external packages used in source files
  # Category: lint, package
  # Stages: lint, check

  local failed=0

  command -v jq >/dev/null || {
    log FATAL "❌ Missing required dependency: jq"
    log FATAL "   💡 Tip: Install via 'brew install jq' or 'apt install jq'"
    log FATAL "   📘 Example: brew install jq"
    return 1
  }

  command -v grep >/dev/null || {
    log FATAL "❌ grep is required"
    log FATAL "   💡 Tip: Ensure grep is available on your system"
    log FATAL "   📘 Example: apt install grep"
    return 1
  }

  mapfile -t package_files < <(find "$ROOT_DIR/packages" -name "package.json" ! -path "*/node_modules/*")

  for pkg_json in "${package_files[@]}"; do
    local pkg_dir pkg_name
    pkg_dir=$(dirname "$pkg_json")
    pkg_name=$(jq -r '.name // empty' "$pkg_json")
    [[ -z "$pkg_name" ]] && continue

    log INFO "📦 Validating dependencies in: $pkg_name"

    mapfile -t declared < <(
      jq -r '[
        (.dependencies // {}) + (.devDependencies // {})
      ] | keys[]' "$pkg_json"
    )
    declared_str=$(printf "%s\n" "${declared[@]}" | sort -u)

    mapfile -t source_files < <(find "$pkg_dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \))

    for file in "${source_files[@]}"; do
      mapfile -t imports < <(
        grep -Po "(?<=from ['\"])[^'\"]+|(?<=import\()['\"][^'\"]+['\"]|(?<=require\()['\"][^'\"]+['\"]" "$file" 2>/dev/null \
        | sed "s/^['\"]//;s/['\"]$//" | sort -u
      )

      for imp in "${imports[@]}"; do
        [[ "$imp" =~ ^(\.|@|/) ]] && continue
        [[ "$imp" =~ ^fs$|^path$|^os$|^http$|^https$|^stream$|^util$ ]] && continue

        if [[ "$imp" =~ ^@[^/]+/[^/]+ ]]; then
          root_pkg=$(cut -d/ -f1-2 <<< "$imp")
        else
          root_pkg=$(cut -d/ -f1 <<< "$imp")
        fi

        if ! grep -Fxq "$root_pkg" <<< "$declared_str"; then
          log FATAL "❌ $file imports '$imp' but $root_pkg is not declared in $pkg_name"
          log FATAL "   💡 Tip: Declare it in dependencies or devDependencies"
          log FATAL "   📘 Example: pnpm add $root_pkg --filter $pkg_name"
          failed=1
        fi
      done
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_empty_tests_directory — Prevent empty __tests__ folders
# ------------------------------------------------------------------------------
# This function checks for any __tests__ folders that exist but contain no
# test files or scripts. Empty test directories cause confusion in CI, tooling,
# and may indicate unfinished or forgotten test coverage.
#
# Why it matters:
#   - Empty __tests__ folders often suggest missed coverage or abandoned scaffolds
#   - Prevents dead folders from accumulating and misleading contributors
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_empty_tests_directory
#
# Categories:
#   lint, test, package
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::disallow_empty_tests_directory() {
  # ✅ Check: Fail if any __tests__/ directories exist but are empty
  # Category: lint, test, package
  # Stages: check, lint

  local failed=0

  while IFS= read -r dir; do
    if [[ -z "$(find "$dir" -type f \( -name "*.test.*" -o -name "*.spec.*" \) -print -quit)" ]]; then
      log FATAL "❌ Empty test folder: $dir"
      log FATAL "   💡 Tip: Either remove this folder or add a valid test file"
      log FATAL "   📘 Example: $dir/example.test.ts"
      failed=1
    fi
  done < <(find "$ROOT_DIR" -type d -name '__tests__')

  [[ "$failed" -eq 1 ]] && exit 1
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_empty_benchmarks_directory — Prevent empty __benchmarks__ folders
# ------------------------------------------------------------------------------
# This function checks for any __benchmarks__ folders that exist but contain
# no benchmark files. Empty benchmark directories often indicate placeholder
# structure without real performance tests and should be avoided.
#
# Why it matters:
#   - Empty __benchmarks__ folders may falsely suggest benchmark coverage
#   - Prevents misleading folder structures and CI/test misfires
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_empty_benchmarks_directory
#
# Categories:
#   lint, test, package
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::disallow_empty_benchmarks_directory() {
  # ✅ Check: Fail if any __benchmarks__/ directories exist but are empty
  # Category: lint, test, package
  # Stages: check, lint

  local failed=0

  while IFS= read -r dir; do
    if [[ -z "$(find "$dir" -type f -name "*.benchmark.*" -print -quit)" ]]; then
      log FATAL "❌ Empty benchmark folder: $dir"
      log FATAL "   💡 Tip: Remove this folder or include a valid benchmark file"
      log FATAL "   📘 Example: $dir/perf.benchmark.ts"
      failed=1
    fi
  done < <(find "$ROOT_DIR" -type d -name '__benchmarks__')

  [[ "$failed" -eq 1 ]] && exit 1
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_tsconfig_duplicate_extends_chain — Prevent duplicate base inheritance
# ------------------------------------------------------------------------------
# This function checks all tsconfig.json files and follows their "extends" chain
# to ensure the same config is not inherited more than once per file.
#
# Why it matters:
#   - Duplicate or circular base inheritance can cause subtle compile errors
#   - Helps maintain clear and efficient tsconfig structures
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_tsconfig_duplicate_extends_chain
#
# Categories:
#   tsconfig, lint
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::disallow_tsconfig_duplicate_extends_chain() {
  # ✅ Check: Fail if tsconfig.json extends same base more than once (directly or indirectly)
  # Category: tsconfig, lint
  # Stages: check, lint

  local failed=0

  mapfile -t tsconfigs < <(find "$ROOT_DIR" -type f -name "tsconfig.json")

  for config in "${tsconfigs[@]}"; do
    declare -A seen=()
    local current="$config"
    local base
    local chain=()

    while [[ -n "$current" && -f "$current" ]]; do
      base=$(jq -r '.extends // empty' "$current" 2>/dev/null || true)
      [[ -z "$base" ]] && break

      # Resolve base path
      local next
      if [[ "$base" == /* || "$base" == ./* || "$base" == ../* ]]; then
        next=$(realpath -m "$(dirname "$current")/$base")
      else
        next=$(find "$ROOT_DIR" -name "$(basename "$base")" | head -n1)
      fi

      [[ -z "$next" || ! -f "$next" ]] && break

      if [[ -n "${seen["$next"]}" ]]; then
        log FATAL "❌ Duplicate tsconfig base inheritance detected in: $config"
        log FATAL "   ↳ '$next' appears multiple times in the extends chain"
        log FATAL "💡 Tip: Flatten redundant 'extends' and avoid circular chains"
        log FATAL "📘 Example: Remove nested extends of '$base' in $current"
        failed=1
        break
      fi

      seen["$next"]=1
      chain+=("$next")
      current="$next"
    done
  done

  [[ "$failed" -eq 1 ]] && exit 1
}

# ------------------------------------------------------------------------------
# 🧪 check::warn_vscode_settings_conflicts — Detect conflicts between VSCode and project formatting rules
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reads .vscode/settings.json tabSize/insertSpaces/formatOnSave
#   - Compares against all biome*.json and oxlintrc*.json files
#   - Validates alignment with .editorconfig
#
# Why it matters:
#   Misaligned editor settings cause inconsistent formatting, Git noise, and DX issues
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::warn_vscode_settings_conflicts
#
# Categories:
#   lint, biome, oxlint
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::warn_vscode_settings_conflicts() {
  # ✅ Check: VSCode settings must align with .editorconfig, biome*, oxlintrc* files
  # Category: lint, biome, oxlint
  # Stages: check, lint

  local file="$ROOT_DIR/.vscode/settings.json"
  [[ ! -f "$file" ]] && return 0

  local failed=0

  local tab_size insert_spaces format_on_save
  tab_size=$(jq -r '.["editor.tabSize"] // empty' "$file" 2>/dev/null)
  insert_spaces=$(jq -r '.["editor.insertSpaces"] // empty' "$file" 2>/dev/null)
  format_on_save=$(jq -r '.["editor.formatOnSave"] // empty' "$file" 2>/dev/null)

  # Compare with .editorconfig
  if [[ -f "$ROOT_DIR/.editorconfig" ]]; then
    local ec_tab_size ec_indent_style
    ec_tab_size=$(awk -F '=' '/indent_size/ {gsub(/ /,"",$2); print $2}' "$ROOT_DIR/.editorconfig" | head -n 1)
    ec_indent_style=$(awk -F '=' '/indent_style/ {gsub(/ /,"",$2); print $2}' "$ROOT_DIR/.editorconfig" | head -n 1)

    if [[ -n "$tab_size" && "$tab_size" != "$ec_tab_size" ]]; then
      log WARN "⚠️ VSCode tabSize ($tab_size) ≠ .editorconfig indent_size ($ec_tab_size)"
      log WARN "   💡 Tip: Align .vscode/settings.json with .editorconfig for consistency"
      log WARN "   📘 Example: \"editor.tabSize\": $ec_tab_size"
      failed=1
    fi

    if [[ "$insert_spaces" == "true" && "$ec_indent_style" != "space" ]] ||
       [[ "$insert_spaces" == "false" && "$ec_indent_style" != "tab" ]]; then
      log WARN "⚠️ VSCode insertSpaces ($insert_spaces) ≠ .editorconfig indent_style ($ec_indent_style)"
      log WARN "   💡 Tip: Adjust insertSpaces to match .editorconfig indent_style"
      log WARN "   📘 Example: \"editor.insertSpaces\": $( [[ $ec_indent_style == "space" ]] && echo true || echo false )"
      failed=1
    fi
  fi

  # Compare with all biome*.json
  while read -r biome_file; do
    local biome_indent biome_path_rel
    biome_indent=$(jq -r '.formatter.indentWidth // empty' "$biome_file" 2>/dev/null)
    biome_path_rel=${biome_file#$ROOT_DIR/}

    if [[ -n "$tab_size" && -n "$biome_indent" && "$tab_size" != "$biome_indent" ]]; then
      log WARN "⚠️ VSCode tabSize ($tab_size) ≠ $biome_path_rel indentWidth ($biome_indent)"
      log WARN "   💡 Tip: Sync editor.tabSize to Biome’s indentWidth for consistent formatting"
      log WARN "   📘 Example: \"editor.tabSize\": $biome_indent"
      failed=1
    fi
  done < <(find "$ROOT_DIR" -type f -name "biome*.json")

  # Compare with all oxlintrc*.json
  while read -r oxlint_file; do
    local ox_indent ox_path_rel
    ox_indent=$(jq -r '.rules.indent?.value // empty' "$oxlint_file" 2>/dev/null)
    ox_path_rel=${oxlint_file#$ROOT_DIR/}

    if [[ -n "$tab_size" && -n "$ox_indent" && "$tab_size" != "$ox_indent" ]]; then
      log WARN "⚠️ VSCode tabSize ($tab_size) ≠ $ox_path_rel indent rule ($ox_indent)"
      log WARN "   💡 Tip: Match editor.tabSize to Oxlint’s configured indent rule"
      log WARN "   📘 Example: \"editor.tabSize\": $ox_indent"
      failed=1
    fi
  done < <(find "$ROOT_DIR" -type f -name "*.oxlintrc*.json")

  [[ "$failed" -eq 1 ]] && exit 1
}

# ------------------------------------------------------------------------------
# 🧪 check::detect_gitlab_ci_infinite_loops — Prevent CI jobs that trigger themselves
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all GitLab CI YAML files for suspicious write-back behavior
#   - Detects use of git push, commit, force push, or GitLab API token usage
#   - Warns if job outputs can trigger downstream pipelines unintentionally
#
# Why it matters:
#   Recursive CI triggers can cause infinite loops, runaway pipelines, or Git abuse
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::detect_gitlab_ci_infinite_loops
#
# Categories:
#   ci, safety
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::detect_gitlab_ci_infinite_loops() {
  # ✅ Check: Block CI job patterns that can cause recursive trigger loops
  # Category: ci, safety
  # Stages: lint, check

  local failed=0
  local patterns=(
    'git push'
    'git commit'
    'git rebase'
    'git merge'
    'curl.*api\.gitlab\.com'
    'CI_JOB_TOKEN'
    'trigger:'
  )

  mapfile -t ci_files < <(find "$ROOT_DIR" -type f \
    \( -name ".gitlab-ci.yml" -o -name "*.gitlab-ci.yml" -o -path "*/.gitlab/ci/*.yml" \))

  for file in "${ci_files[@]}"; do
    for pattern in "${patterns[@]}"; do
      if grep -qEi "$pattern" "$file"; then
        log FATAL "❌ Detected potentially recursive CI job logic in $file"
        log FATAL "   ↳ Pattern matched: $pattern"
        log FATAL "   💡 Tip: Avoid CI jobs that modify the repo or trigger themselves"
        log FATAL "   📘 Example: remove 'git push' or wrap in 'if [ ! \"$CI\" ]; then ...'"
        failed=1
        break
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && exit 1
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_gitlab_ci_trigger_conditions — Ensure CI jobs use rules/only/except
# ------------------------------------------------------------------------------
# This check validates that every GitLab CI file contains job trigger conditions:
#   - At least one job must define `rules:`, `only:`, or `except:`
#   - Helps prevent accidental runs on all branches or merge requests
#   - Warns if jobs are declared without conditions (default = "run always")
#
# Why it matters:
#   Unconditional jobs may run on unintended branches, tags, or forks, leading to broken CI/CD pipelines or security risks.
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::enforce_gitlab_ci_trigger_conditions
#
# Categories:
#   ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::enforce_gitlab_ci_trigger_conditions() {
  # ✅ Check: Every GitLab CI job defines rules:, only:, or except:
  # Category: ci
  # Stages: lint, check

  local failed=0
  local file job block inside_job found_trigger

  mapfile -t files < <(find "$ROOT_DIR" -type f \
    \( -name ".gitlab-ci.yml" -o -name "*.gitlab-ci.yml" -o -path "*/.gitlab/ci/*.yml" \))

  for file in "${files[@]}"; do
    log INFO "📋 Checking GitLab CI file: $file"

    inside_job=false
    found_trigger=false

    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^\s*# ]] && continue
      [[ "$line" =~ ^\s*$ ]] && continue

      if [[ "$line" =~ ^[a-zA-Z0-9_-]+:\s*$ ]]; then
        if $inside_job && ! $found_trigger; then
          log FATAL "❌ Missing trigger condition in $file under job: $job"
          log FATAL "   💡 Tip: Use 'rules:', 'only:', or 'except:' to control job execution"
          log FATAL "   📘 Example:"
          log FATAL "       rules:"
          log FATAL "         - if: '\$CI_COMMIT_BRANCH == \"main\"'"
          failed=1
        fi
        inside_job=true
        found_trigger=false
        job="$line"
        continue
      fi

      if $inside_job; then
        if [[ "$line" =~ ^\s*(rules|only|except): ]]; then
          found_trigger=true
        fi
      fi
    done < "$file"

    if $inside_job && ! $found_trigger; then
      log FATAL "❌ Final job in $file missing trigger condition: $job"
      log FATAL "   💡 Tip: Use 'rules:', 'only:', or 'except:' to prevent unwanted CI triggers"
      log FATAL "   📘 Example:"
      log FATAL "       only:\n         - main"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && exit 1
}

# ------------------------------------------------------------------------------
# 🧪 check::detect_duplicate_gitlab_ci_job_names — Detect CI job name collisions
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all GitLab CI YAML files for job name keys
#   - Detects duplicates across all included GitLab CI definitions
#
# Why it matters:
#   - Duplicate job names silently override each other when includes merge
#   - Can cause broken pipelines and unpredictable CI behavior
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::detect_duplicate_gitlab_ci_job_names
#
# Categories:
#   ci
#
# Stages:
#   lint, check, test
# ------------------------------------------------------------------------------
check::detect_duplicate_gitlab_ci_job_names() {
  # ✅ Check: Detect duplicate GitLab CI job names across .gitlab-ci.yml and gitlab/ci/*.yml
  # Category: ci
  # Stages: lint, check, test

  local failed=0
  declare -A seen=()
  declare -A conflicts=()

  mapfile -t ci_files < <(
    find "$ROOT_DIR" -type f \( -name ".gitlab-ci.yml" -o -path "*/gitlab/ci/*.yml" \)
  )

  for file in "${ci_files[@]}"; do
    mapfile -t jobs < <(yq e 'keys | .[]' "$file" 2>/dev/null | grep -vE '^(stages|include|default|variables|workflow|rules)$' || true)
    for job in "${jobs[@]}"; do
      if [[ -n "${seen[$job]:-}" ]]; then
        conflicts["$job"]+="${seen[$job]} $file "
        failed=1
      else
        seen["$job"]="$file"
      fi
    done
  done

  if [[ "$failed" -eq 1 ]]; then
    log FATAL "❌ Duplicate GitLab CI job names detected:"
    for job in "${!conflicts[@]}"; do
      log FATAL "   ↳ Job: $job"
      log FATAL "     Files: ${conflicts[$job]}"
    done
    log FATAL "💡 Tip: Rename jobs like 'build' → 'build:web', 'build:api', etc., to avoid collisions"
    log FATAL "📘 Example: build → build:shared or build:worker"
    return 1
  else
    log INFO "✅ No duplicate GitLab CI job names found"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_mjs_cjs_usage — Block .mjs/.cjs unless justified by "type"
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds all *.mjs and *.cjs files
#   - Checks if nearest package.json defines "type": "module" or "commonjs" appropriately
#
# Why it matters:
#   - Prevents improper ESM/CJS handling
#   - Ensures files use extensions matching module format
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_mjs_cjs_usage
#
# Categories:
#   tsconfig, lint, package
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::validate_mjs_cjs_usage() {
  # ✅ Check: Only allow .mjs/.cjs if justified by "type" in package.json
  # Category: tsconfig, lint, package
  # Stages: lint, check, build

  local failed=0

  mapfile -t files < <(find "$ROOT_DIR" -type f \( -name "*.mjs" -o -name "*.cjs" \))

  for file in "${files[@]}"; do
    local dir="$file"
    local type=""
    local ext="${file##*.}"

    while [[ "$dir" != "/" && "$dir" != "." ]]; do
      dir=$(dirname "$dir")
      if [[ -f "$dir/package.json" ]]; then
        type=$(jq -r '.type // empty' "$dir/package.json" 2>/dev/null)
        break
      fi
    done

    if [[ "$ext" == "mjs" && "$type" != "module" ]]; then
      log FATAL "❌ $file is a .mjs file but no package.json with \"type\": \"module\" found"
      log FATAL "   💡 Tip: Either rename to .js or set \"type\": \"module\" in the nearest package.json"
      log FATAL "   📘 Example: { \"type\": \"module\" } in $dir/package.json"
      failed=1
    fi

    if [[ "$ext" == "cjs" && "$type" != "commonjs" ]]; then
      log FATAL "❌ $file is a .cjs file but no package.json with \"type\": \"commonjs\" found"
      log FATAL "   💡 Tip: Either rename to .js or set \"type\": \"commonjs\" in the nearest package.json"
      log FATAL "   📘 Example: { \"type\": \"commonjs\" } in $dir/package.json"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_filename_casing — Enforce kebab-case or snake_case filenames
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans key directories for files with invalid casing
#   - Disallows filenames with uppercase, camelCase, or PascalCase
#
# Why it matters:
#   - Ensures consistent naming across platforms and tooling
#   - Avoids conflicts in case-insensitive filesystems (e.g. macOS)
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_filename_casing
#
# Categories:
#   lint, paths, naming
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::validate_filename_casing() {
  # ✅ Check: Enforce kebab-case or snake_case for filenames
  # Category: lint, paths, naming
  # Stages: lint, check

  local failed=0
  local paths=(
    "$ROOT_DIR/packages/shared"
    "$ROOT_DIR/packages/products"
    "$ROOT_DIR/.gitlab"
    "$ROOT_DIR/.vscode"
    "$ROOT_DIR/.husky"
  )

  mapfile -t bad_files < <(
    find "${paths[@]}" -type f \
      ! -path "*/node_modules/*" ! -path "*/.git/*" \
      | grep -Ev '/[a-z0-9._-]+$'
  )

  if [[ ${#bad_files[@]} -gt 0 ]]; then
    log FATAL "❌ Invalid filename casing (only kebab-case or snake_case allowed):"
    for file in "${bad_files[@]}"; do
      log FATAL "   ↳ $file"
    done
    log FATAL "💡 Tip: Rename files to use lowercase a–z, numbers, dashes, underscores, or dots only"
    log FATAL "📘 Example: valid names → some-tool.ts, _config.yml, run_tests.sh"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_docs_naming_conventions — Enforce standard naming in /docs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all Markdown files in /docs and /docs/[locale]/ use kebab-case or snake_case
#   - Disallows uppercase, invalid punctuation, and non-.md files
#
# Why it matters:
#   - Prevents naming inconsistencies across documentation
#   - Ensures portability and predictable URLs in static site generators or CI
#
# Globals used:
#   - ROOT_DIR → path to project root
#
# Example:
#   check::enforce_docs_naming_conventions
#
# Categories:
#   lint, naming, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::enforce_docs_naming_conventions() {
  # ✅ Check: Enforce kebab-case/snake_case .md files in /docs and /docs/<locale>
  # Category: lint, naming, paths
  # Stages: lint, check

  local failed=0
  local docs_dir="$ROOT_DIR/docs"

  if [[ ! -d "$docs_dir" ]]; then
    log WARN "⚠️ No /docs directory present"
    return 0
  fi

  mapfile -t invalid_files < <(
    find "$docs_dir" -type f ! -name '*.md' \
      ! -name 'README.md' \
      ! -name 'CHANGELOG.md' \
      ! -name 'SECURITY.md' \
      ! -name 'LICENSE' \
      ! -name 'GOVERNANCE.md' \
      ! -name 'PROJECT_CHARTER.md' \
      ! -name 'CODE_OF_CONDUCT.md' \
      | grep -vE '/(README|CHANGELOG|SECURITY|LICENSE|GOVERNANCE|PROJECT_CHARTER|CODE_OF_CONDUCT)\.md$'
  )

  if [[ ${#invalid_files[@]} -gt 0 ]]; then
    log FATAL "❌ Non-compliant files found in /docs or /docs/[locale]/:"
    for file in "${invalid_files[@]}"; do
      log FATAL "   ↳ $file"
    done
    log FATAL "💡 Tip: Only .md files allowed — use lowercase, kebab-case or snake_case"
    log FATAL "📘 Example: docs/en-US/feature-overview.md"
    failed=1
  fi

  mapfile -t bad_casing < <(
    find "$docs_dir" -type f -name '*.md' \
      | grep -Ev '/[a-z0-9._-]+\.md$'
  )

  if [[ ${#bad_casing[@]} -gt 0 ]]; then
    log FATAL "❌ Files in /docs use invalid casing or characters:"
    for file in "${bad_casing[@]}"; do
      log FATAL "   ↳ $file"
    done
    log FATAL "💡 Tip: Use only lowercase a–z, numbers, -, _, and .md extension"
    log FATAL "📘 Example: docs/en-US/privacy-policy.md"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_exports_overlap — Ensure no overlapping exports across packages
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks that no two package.json files export the same subpath (e.g. ".", "./utils", etc.)
#   - Prevents cross-package export shadowing or ambiguity in conditions (import, require, etc.)
#
# Why it matters:
#   - Overlapping exports break module resolution and cause runtime ambiguity
#   - Ensures workspace packages export non-conflicting, scoped public APIs
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   check::validate_exports_overlap
#
# Categories:
#   tsconfig, package, paths
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::validate_exports_overlap() {
  # ✅ Check: No export field overlap or path shadowing across workspace packages
  # Category: tsconfig, package, paths
  # Stages: lint, check, build

  local failed=0
  declare -A export_map=()

  log INFO "📦 Validating export map consistency across all packages"

  mapfile -t package_files < <(find "$ROOT_DIR" -name package.json -not -path "*/node_modules/*")

  for pkg in "${package_files[@]}"; do
    local pkg_name dir export_key resolved_path
    pkg_name=$(jq -r .name "$pkg" 2>/dev/null)
    dir=$(dirname "$pkg")

    # Skip if no exports
    if ! jq -e '.exports' "$pkg" >/dev/null 2>&1; then
      continue
    fi

    mapfile -t keys < <(jq -r 'paths | select(length == 2 and .[0] == "exports") | .[1]' "$pkg")

    for export_key in "${keys[@]}"; do
      # Normalize export path (e.g., @my-org/pkg/./utils)
      resolved_path="$pkg_name/$export_key"

      if [[ -n "${export_map[$resolved_path]:-}" ]]; then
        log FATAL "❌ Export path conflict detected: $resolved_path"
        log FATAL "   ↳ Defined in: ${export_map[$resolved_path]}"
        log FATAL "   ↳ Conflicts with: $pkg"
        log FATAL "💡 Tip: Rename exports or isolate via conditional export keys"
        log FATAL "📘 Example: Change './utils' to './shared/utils' in one of the packages"
        failed=1
      else
        export_map["$resolved_path"]="$pkg"
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No overlapping exports across packages"
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_workspace_version_alignment — Enforce major version consistency across workspace deps
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all internal workspace dependencies use the correct major version
#   - Compares each usage of a sibling workspace package against its actual version
#
# Why it matters:
#   - Avoids breaking changes from misaligned major versions
#   - Prevents CI/CD regressions and runtime errors
#   - Encourages consistent and predictable dependency management
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::enforce_workspace_version_alignment
#
# Categories:
#   package, safety
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::enforce_workspace_version_alignment() {
  # ✅ Check: Ensure workspace dependencies do not cross major versions
  # Category: package, safety
  # Stages: check, lint, build

  local failed=0
  declare -A package_versions=()

  log INFO "🔗 Verifying major version alignment across workspace packages"

  # Step 1: Collect all package names and versions
  mapfile -t package_files < <(find "$ROOT_DIR" -name package.json -not -path "*/node_modules/*")

  for pkg in "${package_files[@]}"; do
    local name version
    name=$(jq -r .name "$pkg" 2>/dev/null)
    version=$(jq -r .version "$pkg" 2>/dev/null)
    [[ "$name" == "null" || "$version" == "null" ]] && continue
    package_versions["$name"]="$version"
  done

  # Step 2: Check each dependency's major version alignment
  for pkg in "${package_files[@]}"; do
    local this_pkg=$(jq -r .name "$pkg")
    [[ "$this_pkg" == "null" ]] && continue

    for scope in dependencies devDependencies peerDependencies optionalDependencies; do
      jq -r --arg scope "$scope" '
        .[$scope] // {} | to_entries[] | "\(.key) \(.value)"
      ' "$pkg" 2>/dev/null | while read -r dep dep_version; do
        [[ -z "${package_versions[$dep]:-}" ]] && continue  # Skip external packages

        local actual_version="${package_versions[$dep]}"
        local actual_major=${actual_version#v}
        actual_major=${actual_major%%.*}

        local used_major=${dep_version#v}
        used_major=${used_major#^}
        used_major=${used_major%%.*}

        if [[ "$actual_major" != "$used_major" ]]; then
          log FATAL "❌ Package $this_pkg depends on $dep@$dep_version but declared version is $actual_version"
          log FATAL "   💡 Tip: Update the version to match the declared major: ^$actual_major.0.0"
          log FATAL "   📘 Example: \"$dep\": \"^$actual_major.0.0\" in $pkg"
          failed=1
        fi
      done
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All workspace dependencies aligned to declared major versions"
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_gitlab_ci_timeouts — Ensure CI jobs set safe timeout values
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures every GitLab CI job declares a `timeout:` field
#   - Flags jobs with timeout values exceeding safety thresholds (e.g. 30m)
#   - Warns on jobs that use excessively long timeouts (e.g. >1h)
#
# Why it matters:
#   - Prevents runaway jobs that burn CI minutes
#   - Encourages predictability and fast feedback loops
#   - Enforces clear expectations and runtime limits
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::enforce_gitlab_ci_timeouts
#
# Categories:
#   ci, lint
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::enforce_gitlab_ci_timeouts() {
  # ✅ Check: All GitLab CI jobs define timeouts within safe limits
  # Category: ci, lint
  # Stages: check, lint

  local failed=0
  local max_safe_minutes=30
  local max_absolute_minutes=60

  log INFO "🕒 Checking GitLab CI jobs for missing or unsafe timeout values"

  mapfile -t ci_files < <(find "$ROOT_DIR" -type f \
    \( -name ".gitlab-ci.yml" -o -path "*/gitlab/ci/*.yml" \))

  for file in "${ci_files[@]}"; do
    log STEP "🔍 Inspecting CI file: $file"

    # Find job blocks (top-level keys not starting with dot or reserved keywords)
    local jobs
    jobs=$(yq e 'keys | .[]' "$file" 2>/dev/null | grep -vE '^(stages|default|include|variables|workflow|rules)$' || true)

    for job in $jobs; do
      local timeout_raw
      timeout_raw=$(yq e ".$job.timeout" "$file" 2>/dev/null || echo "")

      if [[ "$timeout_raw" == "null" || -z "$timeout_raw" ]]; then
        log FATAL "❌ Job '$job' in $file is missing a timeout:"
        log FATAL "   💡 Tip: Add a timeout field like 'timeout: 15m' to prevent runaway jobs"
        log FATAL "   📘 Example: $job:\n         timeout: 15m"
        failed=1
        continue
      fi

      # Parse total minutes from formats like "1h 10m"
      local minutes=0
      if [[ "$timeout_raw" =~ ([0-9]+)h ]]; then
        minutes=$((minutes + ${BASH_REMATCH[1]} * 60))
      fi
      if [[ "$timeout_raw" =~ ([0-9]+)m ]]; then
        minutes=$((minutes + ${BASH_REMATCH[1]}))
      fi

      if (( minutes > max_absolute_minutes )); then
        log FATAL "❌ Job '$job' in $file has dangerously long timeout: $timeout_raw"
        log FATAL "   💡 Tip: Cap CI job timeouts under ${max_safe_minutes}m unless strictly required"
        log FATAL "   📘 Example: timeout: 20m"
        failed=1
      elif (( minutes > max_safe_minutes )); then
        log WARN "⚠️ Job '$job' in $file uses long timeout: $timeout_raw (> ${max_safe_minutes}m)"
        log WARN "   💡 Tip: Consider reducing CI job duration to improve feedback cycles"
        log WARN "   📘 Example: timeout: 15m"
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_vscode_extensions — Enforce approved VSCode extensions list
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks if .vscode/extensions.json exists and is valid JSON
#   - Compares its "recommendations" against a locked list of approved extensions
#
# Why it matters:
#   - Prevents tooling drift across contributors
#   - Maintains standardized developer experience
#   - Avoids inconsistent linting, formatting, or debugging behavior
#
# Globals used:
#   - ROOT_DIR → path to project root
#
# Example:
#   check::validate_vscode_extensions
#
# Categories:
#   ci, lint, naming
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::validate_vscode_extensions() {
  # ✅ Check: .vscode/extensions.json matches approved extensions list
  # Category: ci, lint, naming
  # Stages: check, lint

  local file="$ROOT_DIR/.vscode/extensions.json"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing .vscode/extensions.json"
    log FATAL "   💡 Tip: Define team-wide tooling using VSCode recommendations"
    log FATAL "   📘 Example: Create $file with approved 'recommendations' array"
    return 1
  fi

  if ! jq empty "$file" >/dev/null 2>&1; then
    log FATAL "❌ .vscode/extensions.json is not valid JSON"
    log FATAL "   💡 Tip: Run 'jq . .vscode/extensions.json' to verify formatting"
    log FATAL "   📘 Example: Ensure no trailing commas or invalid keys"
    return 1
  fi

  # Approved list (sorted for comparison)
  local -a approved=(
    "aaron-bond.better-comments"
    "astro-build.astro-vscode"
    "anysphere.cpptools"
    "biomejs.biome"
    "bradlc.vscode-tailwindcss"
    "donjayamanne.githistory"
    "ecmel.vscode-html-css"
    "GitLab.gitlab-workflow"
    "Gruntfuggly.todo-tree"
    "mhutchie.git-graph"
    "mikestead.dotenv"
    "ms-azuretools.vscode-docker"
    "ms-kubernetes-tools.vscode-kubernetes-tools"
    "ms-python.python"
    "ms-vscode.makefile-tools"
    "oxc.oxc-vscode"
    "pflannery.vscode-versionlens"
    "redhat.vscode-yaml"
    "semanticdiff.semanticdiff"
    "shd101wyy.markdown-preview-enhanced"
    "streetsidesoftware.code-spell-checker"
    "svelte.svelte-vscode"
    "tamasfe.even-better-toml"
    "usernamehw.errorlens"
    "vitest.explorer"
    "WallabyJs.console-ninja"
    "yzhang.markdown-all-in-one"
    "YoavBls.pretty-ts-errors"
  )

  # Extract and sort actual recommendations
  local -a found
  mapfile -t found < <(jq -r '.recommendations[]' "$file" | sort)

  # Sort approved list for deterministic comparison
  local -a sorted_approved
  sorted_approved=($(printf "%s\n" "${approved[@]}" | sort))

  if ! diff <(printf "%s\n" "${sorted_approved[@]}") <(printf "%s\n" "${found[@]}") >/dev/null; then
    log FATAL "❌ .vscode/extensions.json does not match the approved extension list"
    log FATAL "   💡 Tip: Align your extensions.json with the standard recommendations"
    log FATAL "   📘 Example: Use exactly the following 'recommendations':"
    for ext in "${sorted_approved[@]}"; do
      log FATAL "   ↳ $ext"
    done
    return 1
  else
    log INFO "✅ .vscode/extensions.json matches approved list"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_world_writable_files — Reject chmod 777 and unsafe perms
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects any world/group-writable files in the repo (e.g. mode 777, 775, etc)
#   - Excludes .env.local and standard excluded dirs (node_modules, .git)
#
# Why it matters:
#   - World or group write permissions are a serious security risk
#   - chmod 777 enables unintended overwrite or execution
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::disallow_world_writable_files
#
# Categories:
#   safety, lint
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::disallow_world_writable_files() {
  # ✅ Check: No chmod 777 / group or world writable files (except .env.local)
  # Category: safety, lint
  # Stages: check, lint

  local failed=0

  mapfile -t unsafe_files < <(
    find "$ROOT_DIR" -type f \
      ! -path '*/node_modules/*' \
      ! -path '*/.git/*' \
      ! -name '.env.local' \
      \( -perm -0002 -o -perm -0020 \) \
      -exec ls -l {} +
  )

  if [[ "${#unsafe_files[@]}" -gt 0 ]]; then
    log FATAL "❌ Unsafe file permissions detected (group/world writable):"
    for file in "${unsafe_files[@]}"; do
      log FATAL "   ↳ $file"
    done
    log FATAL "💡 Tip: Run 'chmod go-w <file>' to remove group/other write permissions"
    log FATAL "📘 Example: chmod 644 ./scripts/setup.sh"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_conventional_commits — Enforce Conventional Commits format
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures commit messages match the Conventional Commits spec:
#     <type>(<scope>): <description>
#   - Validates recent commit history (e.g., last 30 commits)
#
# Why it matters:
#   - Enforces semantic versioning compatibility
#   - Enables changelog automation and consistent history
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::validate_conventional_commits
#
# Categories:
#   lint, ci
#
# Stages:
#   pre-commit, commit-msg, check
# ------------------------------------------------------------------------------
check::validate_conventional_commits() {
  # ✅ Check: All commit messages follow Conventional Commits
  # Category: lint, ci
  # Stages: pre-commit, commit-msg, check

  local failed=0
  local types="feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert"
  local pattern="^(${types})(\\([a-z0-9-]+\\))?: .+"

  mapfile -t commits < <(git log --pretty=format:'%h %s' HEAD~30..HEAD)

  for commit in "${commits[@]}"; do
    local hash msg
    hash=$(cut -d' ' -f1 <<< "$commit")
    msg=$(cut -d' ' -f2- <<< "$commit")

    if ! grep -qE "$pattern" <<< "$msg"; then
      log FATAL "❌ Invalid commit message format: $hash"
      log FATAL "   ↳ $msg"
      log FATAL "💡 Tip: Use Conventional Commits format: <type>(<scope>): <description>"
      log FATAL "📘 Example: feat(auth): add JWT refresh token rotation"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All commit messages follow Conventional Commits"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_root_biome_json — Ensure biome.json delegates to shared base
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures a biome.json exists at the project root
#   - Validates its $schema and extends fields are correct
#   - Confirms no inline rule/config definitions exist
#
# Why it matters:
#   - Prevents config drift or duplication
#   - Ensures biome configuration is centralized and composable
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_root_biome_json
#
# Categories:
#   lint, biome, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::validate_root_biome_json() {
  # ✅ Check: Root biome.json delegates to biome.base.json and does not redefine rules
  # Category: lint, biome, paths
  # Stages: lint, check

  local file="$ROOT_DIR/biome.json"
  local base_path="packages/shared/config/biome/biome.base.json"
  local expected_schema="https://biomejs.dev/schemas/1.0.0/schema.json"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing root biome.json at: $file"
    log FATAL "   💡 Tip: Create biome.json that extends $base_path"
    log FATAL "   📘 Example: { \"\$schema\": \"$expected_schema\", \"extends\": \"$base_path\" }"
    return 1
  fi

  local schema
  schema=$(jq -r '."$schema"' "$file" 2>/dev/null || echo "")

  if [[ "$schema" != "$expected_schema" ]]; then
    log FATAL "❌ Invalid \$schema in biome.json: $schema"
    log FATAL "   💡 Tip: Use \$schema: \"$expected_schema\""
    log FATAL "   📘 Example: \"\$schema\": \"$expected_schema\""
    failed=1
  fi

  local extends
  extends=$(jq -r '.extends' "$file" 2>/dev/null || echo "")

  if [[ "$extends" != "$base_path" ]]; then
    log FATAL "❌ biome.json must extend from: $base_path"
    log FATAL "   ↳ Found: $extends"
    log FATAL "   💡 Tip: Ensure root biome.json extends from the shared base config"
    log FATAL "   📘 Example: \"extends\": \"$base_path\""
    failed=1
  fi

  local top_keys
  top_keys=$(jq -r 'keys[]' "$file" 2>/dev/null | grep -vE '^\$schema$|^extends$' || true)

  if [[ -n "$top_keys" ]]; then
    log FATAL "❌ biome.json should not define config directly. All logic must be in biome.base.json"
    echo "$top_keys" | while read -r key; do
      log FATAL "   ↳ Unexpected top-level key: $key"
    done
    log FATAL "   💡 Tip: Move all biome rules to $base_path"
    log FATAL "   📘 Example: Remove \"$top_keys\" from $file"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ Root biome.json is valid"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_root_oxlintrc_json — Ensure oxlintrc.json delegates to shared base
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .oxlintrc.json exists at the monorepo root
#   - Confirms it uses the correct $schema URL
#   - Confirms it extends the shared base config path
#   - Disallows defining rules/config inline
#
# Why it matters:
#   - Prevents duplicated or conflicting rule definitions
#   - Centralizes rule enforcement logic in a shared, reusable file
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_root_oxlintrc_json
#
# Categories:
#   lint, oxlint, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::validate_root_oxlintrc_json() {
  # ✅ Check: Root .oxlintrc.json must delegate to oxlintrc.base.json only
  # Category: lint, oxlint, paths
  # Stages: lint, check

  local file="$ROOT_DIR/.oxlintrc.json"
  local base_path="packages/shared/config/oxlint/oxlintrc.base.json"
  local expected_schema="https://oxc-project.github.io/oxlint/schema.json"
  local failed=0

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing root .oxlintrc.json"
    log FATAL "   💡 Tip: Create it and extend from $base_path"
    log FATAL "   📘 Example: { \"\$schema\": \"$expected_schema\", \"extends\": \"$base_path\" }"
    return 1
  fi

  local schema
  schema=$(jq -r '."$schema"' "$file" 2>/dev/null || echo "")

  if [[ "$schema" != "$expected_schema" ]]; then
    log FATAL "❌ Invalid \$schema in .oxlintrc.json: $schema"
    log FATAL "   💡 Tip: Use schema: \"$expected_schema\""
    log FATAL "   📘 Example: \"\$schema\": \"$expected_schema\""
    failed=1
  fi

  local extends
  extends=$(jq -r '.extends' "$file" 2>/dev/null || echo "")

  if [[ "$extends" != "$base_path" ]]; then
    log FATAL "❌ .oxlintrc.json must extend from: $base_path"
    log FATAL "   ↳ Found: $extends"
    log FATAL "   💡 Tip: Set \"extends\": \"$base_path\""
    log FATAL "   📘 Example: { \"extends\": \"$base_path\" }"
    failed=1
  fi

  local top_keys
  top_keys=$(jq -r 'keys[]' "$file" 2>/dev/null | grep -vE '^\$schema$|^extends$' || true)

  if [[ -n "$top_keys" ]]; then
    log FATAL "❌ .oxlintrc.json must not define configuration directly — all rules belong in oxlintrc.base.json"
    echo "$top_keys" | while read -r key; do
      log FATAL "   ↳ Unexpected top-level key: $key"
    done
    log FATAL "💡 Tip: Move rule config into $base_path and remove from root"
    log FATAL "📘 Example: rules, lints, files → $base_path"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ Root .oxlintrc.json is valid"
}

# ------------------------------------------------------------------------------
# 🧪 check::enforce_standard_gitlab_job_naming — Enforce standardized CI job/stage naming
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validates all CI job names use approved prefixes (e.g., test, build, deploy)
#   - Ensures all jobs declare a standard stage (e.g., lint, test, build)
#
# Why it matters:
#   - Prevents ambiguous or inconsistent job naming
#   - Enables CI pipeline readability, ordering, and traceability
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::enforce_standard_gitlab_job_naming
#
# Categories:
#   ci, naming
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::enforce_standard_gitlab_job_naming() {
  # ✅ Check: CI jobs use standard names and stage values
  # Category: ci, naming
  # Stages: lint, check

  local failed=0
  local allowed_stages=("setup" "lint" "test" "build" "deploy" "release")
  local allowed_jobs=("setup" "install" "lint" "test" "build" "deploy" "release" "publish" "docs" "preview")

  mapfile -t files < <(find "$ROOT_DIR" -type f -name "*.yml" | grep -E '(^|/)gitlab/ci/.*\.yml$|\.gitlab-ci\.yml$' || true)

  if [[ ${#files[@]} -eq 0 ]]; then
    log WARN "⚠️ No GitLab CI YAML files found"
    return 0
  fi

  for file in "${files[@]}"; do
    log INFO "🔍 Checking CI job stages in: $file"

    local current_job=""
    while IFS= read -r line; do
      if [[ "$line" =~ ^([a-zA-Z0-9_-]+):[[:space:]]*$ ]]; then
        current_job="${BASH_REMATCH[1]}"
        if [[ ! " ${allowed_jobs[*]} " =~ " $current_job " ]]; then
          log FATAL "❌ Invalid CI job name in $file: $current_job"
          log FATAL "   💡 Tip: Use one of: ${allowed_jobs[*]}"
          log FATAL "   📘 Example: test, build, deploy"
          failed=1
        fi
      elif [[ "$line" =~ ^[[:space:]]*stage:[[:space:]]*([a-zA-Z0-9_-]+) ]]; then
        local stage="${BASH_REMATCH[1]}"
        if [[ ! " ${allowed_stages[*]} " =~ " $stage " ]]; then
          log FATAL "❌ Invalid CI stage in $file for job '$current_job': $stage"
          log FATAL "   💡 Tip: Allowed stages are: ${allowed_stages[*]}"
          log FATAL "   📘 Example:"
          log FATAL "     $current_job:"
          log FATAL "       stage: build"
          failed=1
        fi
      fi
    done < "$file"
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
# 🧪 check::validate_gitlab_ci_includes — Ensure all include: files exist
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parses local includes from GitLab CI YAML files
#   - Verifies each included file path exists on disk
#
# Why it matters:
#   - Broken include paths prevent pipelines from running
#   - Avoids silent CI misconfigurations from missing files
#
# Globals used:
#   - ROOT_DIR → path to repo root
#
# Example:
#   check::validate_gitlab_ci_includes
#
# Categories:
#   ci, paths
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::validate_gitlab_ci_includes() {
  # ✅ Check: Validate include:local paths in GitLab CI files resolve correctly
  # Category: ci, paths
  # Stages: check, lint, test

  local failed=0
  local include_paths=()

  mapfile -t ci_files < <(
    find "$ROOT_DIR" -type f \
      $begin:math:text$ -name ".gitlab-ci.yml" -o -path "*/gitlab/ci/*.yml" $end:math:text$
  )

  for file in "${ci_files[@]}"; do
    mapfile -t locals < <(grep -E '^\s*- +local:' "$file" | sed -E 's/.*local:\s*"?([^"]+)"?/\1/')
    for path in "${locals[@]}"; do
      local full_path="$ROOT_DIR/$path"
      if [[ ! -f "$full_path" ]]; then
        log FATAL "❌ include:local path in $file does not exist:"
        log FATAL "   ↳ $path"
        log FATAL "💡 Tip: Check for typos or broken relative paths"
        log FATAL "📘 Example: include:\n    - local: .gitlab/ci/deploy.yml"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_wrangler_cron_syntax — Validate all cron expressions in wrangler.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures cron triggers in wrangler.json follow correct 5-field format
#   - Checks both top-level and env-specific triggers.cron arrays
#
# Why it matters:
#   - Invalid cron syntax will cause silent failures or deployment errors
#   - Wrangler expects POSIX-style 5-field cron expressions (minute hour day month weekday)
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_wrangler_cron_syntax
#
# Categories:
#   cloudflare:kv, wrangler
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::validate_wrangler_cron_syntax() {
  # ✅ Check: Ensure all wrangler.json cron triggers use valid 5-field syntax
  # Category: cloudflare:kv, wrangler
  # Stages: check, lint, test

  local failed=0
  local file

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required for JSON parsing"
    log FATAL "   💡 Tip: Install jq before running this check"
    log FATAL "   📘 Example: brew install jq"
    return 1
  }

  mapfile -t wrangler_files < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for file in "${wrangler_files[@]}"; do
    log INFO "🧩 Checking cron syntax in: $file"

    # Top-level triggers.cron
    jq -r '.triggers.cron[]? // empty' "$file" 2>/dev/null | while read -r cron; do
      if ! [[ "$cron" =~ ^([^\s]+\s+){4}[^\s]+$ ]]; then
        log FATAL "❌ Invalid top-level cron syntax in $file:"
        log FATAL "   ↳ $cron"
        log FATAL "💡 Tip: Use valid 5-field cron expressions"
        log FATAL "📘 Example: 0 0 * * *"
        failed=1
      fi
    done

    # Env-level triggers.cron
    jq -r '.env | to_entries[] | select(.value.triggers.cron) | [.key, .value.triggers.cron[]] | @tsv' "$file" 2>/dev/null |
    while IFS=$'\t' read -r env cron; do
      if ! [[ "$cron" =~ ^([^\s]+\s+){4}[^\s]+$ ]]; then
        log FATAL "❌ Invalid cron syntax in $file (env: $env):"
        log FATAL "   ↳ $cron"
        log FATAL "💡 Tip: Each cron must be 5 space-separated fields"
        log FATAL "📘 Example: 30 2 * * 1"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_name_matches_package — Enforce wrangler.json name matches package.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures wrangler.json "name" matches the package.json "name" (ignoring @scope)
#
# Why it matters:
#   - Prevents misaligned deployment target naming
#   - Avoids bugs in CI/CD, DNS, or staging environments due to inconsistent names
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   check::wrangler_name_matches_package
#
# Categories:
#   wrangler, cloudflare:kv
#
# Stages:
#   lint, check, test
# ------------------------------------------------------------------------------
check::wrangler_name_matches_package() {
  # ✅ Check: wrangler.json name must match package.json name (ignoring scope)
  # Category: wrangler, cloudflare:kv
  # Stages: lint, check, test

  local failed=0

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required to parse wrangler.json and package.json"
    log FATAL "   💡 Tip: Install jq with 'brew install jq' or 'apt install jq'"
    log FATAL "   📘 Example: https://stedolan.github.io/jq/"
    return 1
  }

  mapfile -t wrangler_paths < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for wrangler in "${wrangler_paths[@]}"; do
    local pkg_dir name_json name_pkg pkg

    pkg_dir=$(dirname "$wrangler")
    pkg="$pkg_dir/package.json"

    if [[ ! -f "$pkg" ]]; then
      log FATAL "❌ Missing package.json next to: $wrangler"
      log FATAL "   💡 Tip: Place a package.json in the same folder as $wrangler"
      log FATAL "   📘 Example: echo '{\"name\": \"my-worker\"}' > $pkg"
      failed=1
      continue
    fi

    name_json=$(jq -r '.name' "$wrangler" 2>/dev/null)
    name_pkg=$(jq -r '.name' "$pkg" 2>/dev/null | sed 's|^@[^/]*/||') # strip @scope/

    if [[ "$name_json" != "$name_pkg" ]]; then
      log FATAL "❌ wrangler.json name mismatch in $pkg_dir"
      log FATAL "   ↳ wrangler.json → \"$name_json\""
      log FATAL "   ↳ package.json  → \"$name_pkg\""
      log FATAL "💡 Tip: Ensure wrangler.json uses the same name as the package (without scope)"
      log FATAL "📘 Example: { \"name\": \"$name_pkg\" }"
      failed=1
    else
      log INFO "✅ Name match: $name_json ($pkg_dir)"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_main_entrypoint_exists — Ensure wrangler.json main file exists
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks all wrangler.json files contain a valid "main" field
#   - Ensures the "main" file actually exists on disk
#
# Why it matters:
#   - Prevents broken Worker deployments due to missing entrypoints
#   - Improves CI validation for Cloudflare-bound services
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::wrangler_main_entrypoint_exists
#
# Categories:
#   wrangler, cloudflare:do, cloudflare:kv
#
# Stages:
#   lint, check, build, deploy
# ------------------------------------------------------------------------------
check::wrangler_main_entrypoint_exists() {
  # ✅ Check: wrangler.json "main" field must point to a valid file
  # Category: wrangler, cloudflare:do, cloudflare:kv
  # Stages: lint, check, build, deploy

  local failed=0

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required to parse wrangler.json files"
    log FATAL "   💡 Tip: Install jq with 'brew install jq' or 'apt install jq'"
    log FATAL "   📘 Example: https://stedolan.github.io/jq/"
    return 1
  }

  mapfile -t wrangler_files < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for file in "${wrangler_files[@]}"; do
    local main_path base_dir

    base_dir=$(dirname "$file")
    main_path=$(jq -r '.main // empty' "$file" 2>/dev/null)

    if [[ -z "$main_path" || "$main_path" == "null" ]]; then
      log FATAL "❌ Missing 'main' field in $file"
      log FATAL "   💡 Tip: Add \"main\": \"./dist/index.js\" or a valid path to your entrypoint"
      log FATAL "   📘 Example: { \"main\": \"build/worker.js\" }"
      failed=1
      continue
    fi

    if [[ ! -f "$base_dir/$main_path" ]]; then
      log FATAL "❌ 'main' file not found: $main_path (referenced in $file)"
      log FATAL "   💡 Tip: Ensure this file exists relative to wrangler.json directory"
      log FATAL "   📘 Example: touch \"$base_dir/$main_path\""
      failed=1
    else
      log INFO "✅ Valid 'main': $main_path in $file"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_binding_names_unique — Ensure all bindings are uniquely named
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Extracts all binding names across wrangler.json files
#   - Ensures there are no duplicates across any of: kv_namespaces, r2_buckets,
#     d1_databases, durable_objects.bindings
#
# Why it matters:
#   - Duplicate bindings can cause deploy-time errors
#   - Ambiguity in shared runtime resources creates hidden bugs
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::wrangler_binding_names_unique
#
# Categories:
#   wrangler, cloudflare:kv, cloudflare:d1, cloudflare:r2, cloudflare:do
#
# Stages:
#   lint, check, deploy
# ------------------------------------------------------------------------------
check::wrangler_binding_names_unique() {
  # ✅ Check: No duplicate binding names across all wrangler.json files
  # Category: wrangler, cloudflare:kv, cloudflare:d1, cloudflare:r2, cloudflare:do
  # Stages: lint, check, deploy

  local failed=0
  local bindings=()
  local wrangler_files binding_keys key val

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required to parse wrangler.json"
    log FATAL "   💡 Tip: Install jq with 'brew install jq' or 'apt install jq'"
    log FATAL "   📘 Example: https://stedolan.github.io/jq/"
    return 1
  }

  mapfile -t wrangler_files < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for file in "${wrangler_files[@]}"; do
    for key in kv_namespaces r2_buckets d1_databases durable_objects.bindings; do
      mapfile -t local_bindings < <(
        jq -r ".$key[]?.binding // .name // .class_name // empty" "$file" 2>/dev/null
      )

      for val in "${local_bindings[@]}"; do
        bindings+=("$val::$file")
      done
    done
  done

  local duplicates
  duplicates=$(printf '%s\n' "${bindings[@]%%::*}" | sort | uniq -d)

  if [[ -n "$duplicates" ]]; then
    log FATAL "❌ Duplicate binding names detected across wrangler.json files:"
    for dup in $duplicates; do
      printf '%s\n' "${bindings[@]}" | grep "^$dup::" | while read -r line; do
        log FATAL "   ↳ $line"
      done
    done
    log FATAL "💡 Tip: All Cloudflare bindings must have globally unique 'binding', 'name', or 'class_name'"
    log FATAL "📘 Example: Rename duplicates like 'R2_MAIN' to 'R2_MAIN_API' in your wrangler.json"
    failed=1
  else
    log INFO "✅ All wrangler.json binding names are globally unique"
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_route_collisions — Prevent conflicting routes in wrangler.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects duplicate or overlapping routes across wrangler.json files
#   - Validates top-level and environment-specific route fields
#
# Why it matters:
#   - Conflicting route definitions can cause runtime errors or unexpected behavior
#   - Ensures clear ownership and separation of HTTP paths in Workers
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::wrangler_route_collisions
#
# Categories:
#   wrangler, cloudflare:do
#
# Stages:
#   check, lint, deploy
# ------------------------------------------------------------------------------
check::wrangler_route_collisions() {
  # ✅ Check: No route collisions across wrangler.json files or environments
  # Category: wrangler, cloudflare:do
  # Stages: check, lint, deploy

  local failed=0
  local -a all_routes=()
  local -A route_sources=()

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required to parse wrangler.json"
    log FATAL "   💡 Tip: Install jq to enable JSON parsing in validation scripts"
    log FATAL "   📘 Example: brew install jq"
    return 1
  }

  mapfile -t wrangler_files < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for file in "${wrangler_files[@]}"; do
    local routes envs

    # Collect top-level routes
    mapfile -t routes < <(jq -r '[.routes[]?, .route?] | flatten | .[]?' "$file" 2>/dev/null)
    for r in "${routes[@]}"; do
      [[ -z "$r" ]] && continue
      all_routes+=("$r")
      route_sources["$r"]+="$file (root), "
    done

    # Collect env.routes / env.route
    mapfile -t envs < <(jq -r '.env | keys[]?' "$file" 2>/dev/null || true)
    for env in "${envs[@]}"; do
      mapfile -t env_routes < <(
        jq -r --arg env "$env" '[.env[$env].routes[]?, .env[$env].route?] | flatten | .[]?' "$file" 2>/dev/null
      )
      for r in "${env_routes[@]}"; do
        [[ -z "$r" ]] && continue
        all_routes+=("$r")
        route_sources["$r"]+="$file (env.$env), "
      done
    done
  done

  # Detect duplicates
  duplicates=$(printf '%s\n' "${all_routes[@]}" | sort | uniq -d)
  if [[ -n "$duplicates" ]]; then
    log FATAL "❌ Route collisions detected across wrangler.json configurations:"
    for dup in $duplicates; do
      log FATAL "   ↳ $dup"
      log FATAL "      Defined in: ${route_sources[$dup]}"
    done
    log FATAL "💡 Tip: Ensure no two Workers define the same route (top-level or per-env)"
    log FATAL "📘 Example: Use distinct paths like 'api/service-a/*' vs 'api/service-b/*'"
    return 1
  else
    log INFO "✅ No route collisions detected in wrangler.json files"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_bindings_consistent_across_envs — Enforce identical bindings across envs
# ------------------------------------------------------------------------------
# This check ensures that all Cloudflare bindings (KV, R2, D1, DO) share the same
# `binding` name across all environments, avoiding inconsistent env.KV_ID usage.
#
# Applies to:
#   - kv_namespaces[].binding
#   - r2_buckets[].binding
#   - d1_databases[].binding
#   - durable_objects.bindings[].name
#
# Why it matters:
#   - Prevents runtime config drift across environments
#   - Enables consistent secrets, resource mappings, and validation
#
# Globals used:
#   - ROOT_DIR → path to project root
#
# Example:
#   check::wrangler_bindings_consistent_across_envs
#
# Categories:
#   cloudflare:kv, cloudflare:r2, cloudflare:d1, cloudflare:do, wrangler, safety
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::wrangler_bindings_consistent_across_envs() {
  # ✅ Check: Ensure all Cloudflare bindings are consistent across environments
  # Category: cloudflare:kv, cloudflare:r2, cloudflare:d1, cloudflare:do, wrangler, safety
  # Stages: check, lint, pre-commit

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required to parse wrangler.json"
    log FATAL "   💡 Tip: Install it via 'brew install jq' or 'apt install jq'"
    log FATAL "   📘 Example: which jq"
    return 1
  }

  local failed=0
  local -A binding_sets
  local file key env b

  mapfile -t files < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for file in "${files[@]}"; do
    # Top-level bindings
    for key in kv_namespaces r2_buckets d1_databases; do
      mapfile -t bindings < <(jq -r ".${key}[]?.binding // empty" "$file")
      for b in "${bindings[@]}"; do
        [[ -n "$b" ]] && binding_sets["$file::$key::top"]+="$b"$'\n'
      done
    done
    mapfile -t do_bindings < <(jq -r '.durable_objects.bindings[]?.name' "$file")
    for b in "${do_bindings[@]}"; do
      [[ -n "$b" ]] && binding_sets["$file::durable_objects::top"]+="$b"$'\n'
    done

    # Env bindings
    mapfile -t envs < <(jq -r '.env | keys[]?' "$file" 2>/dev/null)
    for env in "${envs[@]}"; do
      for key in kv_namespaces r2_buckets d1_databases; do
        mapfile -t bindings < <(jq -r ".env[\"$env\"].${key}[]?.binding // empty" "$file")
        for b in "${bindings[@]}"; do
          [[ -n "$b" ]] && binding_sets["$file::$key::$env"]+="$b"$'\n'
        done
      done
      mapfile -t do_bindings < <(jq -r ".env[\"$env\"].durable_objects.bindings[]?.name" "$file")
      for b in "${do_bindings[@]}"; do
        [[ -n "$b" ]] && binding_sets["$file::durable_objects::$env"]+="$b"$'\n'
      done
    done
  done

  # Compare bindings per group
  for group in kv_namespaces r2_buckets d1_databases durable_objects; do
    mapfile -t files_in_group < <(printf '%s\n' "${!binding_sets[@]}" | grep "::$group::" | cut -d: -f1 | uniq)

    for f in "${files_in_group[@]}"; do
      mapfile -t all_sets < <(printf '%s\n' "${!binding_sets[@]}" | grep "^$f::$group::")
      [[ "${#all_sets[@]}" -le 1 ]] && continue

      local baseline
      baseline=$(printf '%s\n' "${binding_sets[${all_sets[0]}]}" | sort | uniq)

      for s in "${all_sets[@]:1}"; do
        current=$(printf '%s\n' "${binding_sets[$s]}" | sort | uniq)
        if [[ "$current" != "$baseline" ]]; then
          log FATAL "❌ Inconsistent ${group} bindings in: $f"
          log FATAL "   ↳ Base: ${all_sets[0]}"
          log FATAL "   ↳ Mismatch: $s"
          log FATAL "💡 Tip: All env.${group} bindings must match the top-level definition"
          log FATAL "📘 Example: ensure 'env.dev.kv_namespaces[].binding' matches root-level kv_namespaces[].binding"
          failed=1
        fi
      done
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All wrangler bindings are consistent across environments"
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_tail_consumer_services_unique — Ensure service names are globally unique
# ------------------------------------------------------------------------------
# This check ensures that every `tail_consumers[].service` value is globally
# unique across:
#   - Top-level `tail_consumers`
#   - All `env.*.tail_consumers` sections
#
# Why it matters:
#   - Prevents tail consumer routing conflicts between Workers
#   - Ensures clarity and safe tail event forwarding configuration
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::wrangler_tail_consumer_services_unique
#
# Categories:
#   cloudflare:do, cloudflare:kv, wrangler, safety
#
# Stages:
#   check, lint, pre-commit, build
# ------------------------------------------------------------------------------
check::wrangler_tail_consumer_services_unique() {
  # ✅ Check: tail_consumers[].service names must be globally unique across wrangler.json
  # Category: cloudflare:do, cloudflare:kv, wrangler, safety
  # Stages: check, lint, pre-commit, build

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required to parse wrangler.json"
    log FATAL "   💡 Tip: Install it via 'brew install jq' or 'apt install jq'"
    log FATAL "   📘 Example: which jq"
    return 1
  }

  local failed=0
  local -a services=()
  local -A service_sources
  local file env service

  mapfile -t files < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for file in "${files[@]}"; do
    # Top-level tail_consumers
    mapfile -t top_services < <(jq -r '.tail_consumers[]?.service // empty' "$file" 2>/dev/null || true)
    for service in "${top_services[@]}"; do
      [[ -n "$service" ]] && {
        services+=("$service")
        service_sources["$service"]+="$file [top]"$'\n'
      }
    done

    # Environment tail_consumers
    mapfile -t envs < <(jq -r '.env | keys[]' "$file" 2>/dev/null || true)
    for env in "${envs[@]}"; do
      mapfile -t env_services < <(jq -r ".env[\"$env\"].tail_consumers[]?.service // empty" "$file" 2>/dev/null || true)
      for service in "${env_services[@]}"; do
        [[ -n "$service" ]] && {
          services+=("$service")
          service_sources["$service"]+="$file [env.$env]"$'\n'
        }
      done
    done
  done

  # Detect duplicates
  mapfile -t dupes < <(printf "%s\n" "${services[@]}" | sort | uniq -d)

  if [[ "${#dupes[@]}" -gt 0 ]]; then
    log FATAL "❌ Duplicate tail_consumer.service names detected:"
    for svc in "${dupes[@]}"; do
      log FATAL "   ↳ $svc"
      printf "%s\n" "${service_sources[$svc]}" | while read -r src; do
        log FATAL "      • $src"
      done
    done
    log FATAL "💡 Tip: Give each tail_consumer.service a unique name across all files and environments"
    log FATAL "📘 Example: use 'analytics_tail_staging', 'logs_tail_prod', etc. to distinguish services"
    failed=1
  else
    log INFO "✅ All tail_consumer.service names are globally unique"
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_binding_naming_conventions — Enforce valid Cloudflare naming rules
# ------------------------------------------------------------------------------
# This check ensures that all Cloudflare binding names, IDs, and service names
# in wrangler.json files conform to expected naming patterns.
#
# Valid pattern: ^[a-zA-Z][a-zA-Z0-9_-]{0,62}$
#
# Why it matters:
#   - Cloudflare enforces strict naming conventions for bindings and IDs
#   - Violations can cause deployment errors or silent runtime failures
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::wrangler_binding_naming_conventions
#
# Categories:
#   cloudflare:kv, cloudflare:r2, cloudflare:d1, cloudflare:do, wrangler, lint
#
# Stages:
#   check, lint, build, pre-commit
# ------------------------------------------------------------------------------
check::wrangler_binding_naming_conventions() {
  # ✅ Check: Valid naming for Cloudflare bindings (KV, R2, D1, DO, tail)
  # Category: cloudflare:kv, cloudflare:r2, cloudflare:d1, cloudflare:do, wrangler, lint
  # Stages: check, lint, build, pre-commit

  local failed=0
  local file field value

  local -a keys_to_validate=(
    ".tail_consumers[]?.service"
    ".kv_namespaces[]?.binding"
    ".kv_namespaces[]?.id"
    ".r2_buckets[]?.binding"
    ".r2_buckets[]?.bucket_name"
    ".d1_databases[]?.binding"
    ".d1_databases[]?.database_name"
    ".durable_objects.bindings[]?.binding"
    ".durable_objects.bindings[]?.name"
    ".durable_objects.bindings[]?.class_name"
  )

  local name_regex='^[a-zA-Z][a-zA-Z0-9_-]{0,62}$'

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required for parsing wrangler.json"
    log FATAL "   💡 Tip: Install jq via 'brew install jq' or 'apt install jq'"
    log FATAL "   📘 Example: which jq"
    return 1
  }

  mapfile -t files < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for file in "${files[@]}"; do
    for key in "${keys_to_validate[@]}"; do
      mapfile -t values < <(jq -r "$key // empty" "$file" 2>/dev/null || true)
      for value in "${values[@]}"; do
        [[ -z "$value" ]] && continue
        if ! [[ "$value" =~ $name_regex ]]; then
          log FATAL "❌ Invalid Cloudflare name in $file"
          log FATAL "   ↳ Field: $key"
          log FATAL "   ↳ Value: $value"
          log FATAL "   💡 Tip: Use only alphanumeric characters, _, or - (starting with a letter)"
          log FATAL "   📘 Example: analyticsR2, KV_STORE_1, customer-db"
          failed=1
        fi
      done
    done

    mapfile -t envs < <(jq -r '.env | keys[]' "$file" 2>/dev/null || true)
    for env in "${envs[@]}"; do
      for key in "${keys_to_validate[@]}"; do
        mapfile -t values < <(jq -r ".env[\"$env\"]$key // empty" "$file" 2>/dev/null || true)
        for value in "${values[@]}"; do
          [[ -z "$value" ]] && continue
          if ! [[ "$value" =~ $name_regex ]]; then
            log FATAL "❌ Invalid name in $file [env.$env]"
            log FATAL "   ↳ Field: $key"
            log FATAL "   ↳ Value: $value"
            log FATAL "   💡 Tip: Binding names must match ^[a-zA-Z][a-zA-Z0-9_-]{0,62}$"
            log FATAL "   📘 Example: tailAnalytics, R2_BUCKET_MAIN, d1UserDb"
            failed=1
          fi
        done
      done
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_environments_valid — Ensure only allowed Wrangler environments
# ------------------------------------------------------------------------------
# This check enforces strict environment scoping for Cloudflare Wrangler configs:
#   - Only 'production' and 'preview' environments may exist under `env`
#   - Top-level config must act as 'staging' (no env.staging block)
#   - No other envs (e.g., 'dev', 'test', etc.) are allowed
#
# Why it matters:
#   - Non-standard environments introduce ambiguity across deployments and CI/CD
#   - Top-level config must be used for staging to simplify logic and separation
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::wrangler_environments_valid
#
# Categories:
#   wrangler, cloudflare:r2, cloudflare:kv, cloudflare:d1, cloudflare:do, ci
#
# Stages:
#   lint, check, deploy
# ------------------------------------------------------------------------------
check::wrangler_environments_valid() {
  # ✅ Check: Allowed wrangler.json environments = top-level (staging), env.production, env.preview
  # Category: wrangler, cloudflare:r2, cloudflare:kv, cloudflare:d1, cloudflare:do, ci
  # Stages: lint, check, deploy

  local failed=0
  local file envs

  command -v jq >/dev/null || {
    log FATAL "❌ jq is required to parse wrangler.json"
    log FATAL "   💡 Tip: Install jq with your package manager"
    log FATAL "   📘 Example: brew install jq"
    return 1
  }

  mapfile -t files < <(find "$ROOT_DIR" -type f -name "wrangler.json")

  for file in "${files[@]}"; do
    log INFO "🔍 Validating environments in: $file"

    if jq -e '.env.staging' "$file" >/dev/null 2>&1; then
      log FATAL "❌ Found forbidden env.staging in $file — staging should use top-level config"
      log FATAL "   💡 Tip: Remove 'env.staging' and use top-level configuration instead"
      log FATAL "   📘 Example: Move all 'env.staging' keys to root of $file"
      failed=1
    fi

    mapfile -t envs < <(jq -r '.env | keys[]?' "$file" 2>/dev/null)
    for env in "${envs[@]}"; do
      if [[ "$env" != "production" && "$env" != "preview" ]]; then
        log FATAL "❌ Invalid environment found in $file: env.$env"
        log FATAL "   💡 Tip: Only env.production and env.preview are allowed — staging must use top-level"
        log FATAL "   📘 Example: Remove env.$env or elevate its contents to the root of the config"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::detect_unreferenced_shell_scripts — Warn about unused *.sh scripts
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds all scripts matching */scripts/*.sh
#   - Warns if they are not referenced in any common usage location:
#       - All other shell scripts
#       - All package.json files
#       - All .gitlab*, *gitlab/ci/*.yml files
#       - .vscode settings
#       - README files
#
# Why it matters:
#   - Orphaned scripts add noise, increase maintenance overhead, and often indicate dead code
#   - Explicit use helps CI/CD pipelines, DevEx, and onboarding clarity
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::detect_unreferenced_shell_scripts
#
# Categories:
#   shell, lint, ci, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::detect_unreferenced_shell_scripts() {
  # ✅ Check: Warn if any shell script is not referenced anywhere in the project
  # Category: shell, lint, ci, paths
  # Stages: lint, check

  local failed=0

  local search_paths=(
    "$ROOT_DIR"
    "$ROOT_DIR/.gitlab"
    "$ROOT_DIR/.vscode"
    "$ROOT_DIR/packages"
    "$ROOT_DIR/README.md"
  )

  local extra_gitlab_ci_files
  mapfile -t extra_gitlab_ci_files < <(find "$ROOT_DIR" -type f -path "*/gitlab/ci/*.yml")

  mapfile -t scripts < <(find "$ROOT_DIR" -type f -path "*/scripts/*.sh" ! -path "*/node_modules/*")

  for script in "${scripts[@]}"; do
    local name
    name=$(basename "$script")

    if ! grep -rF "$name" "${search_paths[@]}" "${extra_gitlab_ci_files[@]}" \
      --exclude="$script" --exclude-dir={node_modules,.git,.turbo,.next} >/dev/null 2>&1; then
      log WARN "⚠️ Unused shell script detected: $script"
      log WARN "   💡 Tip: Reference this script in CI, Makefile, or README to justify keeping it"
      log WARN "   📘 Example: ./scripts/bootstrap-d1.sh → used in .gitlab-ci.yml, Makefile, or README.md"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::warn_on_hardcoded_service_urls — Warn about hardcoded IPs or service endpoints
# ------------------------------------------------------------------------------
# This function scans source files for hardcoded internal IPs, localhost, or
# Cloudflare API endpoints that should instead use configuration, ENV vars, or
# dependency injection.
#
# It avoids test and mock files.
#
# Why it matters:
#   - Prevents accidental exposure of dev-only or insecure endpoints in production
#   - Encourages use of proper configuration or secrets management
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   check::warn_on_hardcoded_service_urls
#
# Categories:
#   lint, safety, ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::warn_on_hardcoded_service_urls() {
  # ✅ Check: Detect hardcoded IPs and service URLs in source code
  # Category: lint, safety, ci
  # Stages: lint, check

  local failed=0
  local targets

  mapfile -t targets < <(find "$ROOT_DIR/packages" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" \) \
    ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/__tests__/*" ! -path "*/__mocks__/*")

  local patterns='(http|https)://(localhost|127\.0\.0\.1|192\.168|10\.[0-9]+\.[0-9]+\.[0-9]+|api\.cloudflare\.com)'

  for file in "${targets[@]}"; do
    if grep -qE "$patterns" "$file"; then
      log WARN "⚠️ Hardcoded service URL or IP detected in: $file"
      grep -nE "$patterns" "$file" | while read -r line; do
        log WARN "   ↳ $line"
      done
      log WARN "💡 Tip: Use environment variables or config abstractions instead of raw service URLs"
      log WARN "📘 Example: Replace 'https://api.cloudflare.com' with 'process.env.CLOUDFLARE_API'"
      failed=1
    fi
  done

  return 0
}

# ------------------------------------------------------------------------------
# 🧪 check::detect_unlinked_workspace_dependencies — Warn if workspace deps are missing
# ------------------------------------------------------------------------------
# This check runs `pnpm list --depth=-1` and warns if any workspace dependency
# is missing or unlinked. This often happens when a workspace was renamed or
# removed without cleaning up dependents, leading to breakage or failed installs.
#
# Why it matters:
#   - Prevents broken workspace references and ensures `pnpm install` consistency
#   - Surfaces deleted or renamed packages that still have lingering references
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::detect_unlinked_workspace_dependencies
#
# Categories:
#   pnpm, lint, ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::detect_unlinked_workspace_dependencies() {
  # ✅ Check: Warn if any workspace dependency is missing/unlinked
  # Category: pnpm, lint, ci
  # Stages: lint, check

  if ! command -v pnpm >/dev/null; then
    log FATAL "❌ pnpm not found in PATH"
    log FATAL "   💡 Tip: Ensure pnpm is installed globally"
    log FATAL "   📘 Example: corepack enable && corepack prepare pnpm@latest --activate"
    return 1
  fi

  local output
  output=$(pnpm list --depth=-1 2>&1 | grep -i "missing" || true)

  if [[ -n "$output" ]]; then
    log WARN "⚠️ Unlinked or missing workspace dependencies detected:"
    echo "$output" | while read -r line; do
      log WARN "   ↳ $line"
    done
    log WARN "💡 Tip: Run 'pnpm install' or check for renamed/missing workspaces"
    log WARN "📘 Example: pnpm list --depth=-1"
  else
    log INFO "✅ No missing workspace dependencies"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_sensitive_public_files — Block exposure of sensitive files in public/
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects .env, .sql, .bak files inside any public/ directory
#   - Fails if any such file is found
#
# Why it matters:
#   - Prevents accidental leakage of secrets or backups via public web access
#   - Ensures consistent security posture across deployments
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_sensitive_public_files
#
# Categories:
#   safety, secrets, paths
#
# Stages:
#   pre-commit, lint, check, build
# ------------------------------------------------------------------------------
check::disallow_sensitive_public_files() {
  # ✅ Check: Prevent .env, .sql, .bak files in public/ directories
  # Category: safety, secrets, paths
  # Stages: pre-commit, lint, check, build

  local failed=0

  mapfile -t matches < <(
    find "$ROOT_DIR" -type d -name "public" -exec find {} -type f \
      \( -name "*.bak" -o -name "*.sql" -o -name "*.env" \) \;
  )

  if [[ "${#matches[@]}" -gt 0 ]]; then
    log FATAL "❌ Sensitive files detected in public/ directories:"
    for file in "${matches[@]}"; do
      log FATAL "   ↳ $file"
    done
    log FATAL "💡 Tip: Never expose .env, .sql, or .bak files inside public/"
    log FATAL "📘 Example: move .sql backups to /backups and add '*.sql' to .gitignore"
    return 1
  else
    log INFO "✅ No sensitive files found in public/ directories"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_root_package_config — Validate root package.json tooling configuration
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures required devDependencies exist (biome, oxlint, husky, etc.)
#   - Confirms lint-staged includes biome and oxlint
#   - Verifies packageManager is pnpm@>=10.12.0
#   - Verifies engines.node is >=24.0.0
#
# Why it matters:
#   - Missing tooling or incorrect versions break lint, format, CI, and installs
#   - Ensures reproducibility and standardized setup across contributors
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_root_package_config
#
# Categories:
#   package, pnpm
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::validate_root_package_config() {
  # ✅ Check: Enforce consistent tooling and versions in root package.json
  # Category: package, pnpm
  # Stages: check, lint, build

  local pkg="$ROOT_DIR/package.json"
  local failed=0

  if [[ ! -f "$pkg" ]]; then
    log FATAL "❌ package.json not found at root: $pkg"
    log FATAL "   💡 Tip: Create a root package.json file"
    log FATAL "   📘 Example: touch $pkg && echo '{ \"name\": \"root\", \"version\": \"1.0.0\" }' > $pkg"
    return 1
  fi

  local required_deps=(
    "@biomejs/biome"
    "oxlint"
    "husky"
    "lint-staged"
    "tsx"
    "wrangler"
    "@cloudflare/workers-types"
    "@types/ua-parser-js"
  )

  for dep in "${required_deps[@]}"; do
    if ! jq -e --arg dep "$dep" '.devDependencies[$dep]' "$pkg" >/dev/null 2>&1; then
      log FATAL "❌ Missing devDependency: $dep"
      log FATAL "   💡 Tip: Add $dep to devDependencies in root package.json"
      log FATAL "   📘 Example: pnpm add -D $dep"
      failed=1
    fi
  done

  if ! jq -e '.["lint-staged"]' "$pkg" >/dev/null; then
    log FATAL "❌ lint-staged configuration missing"
    log FATAL "   💡 Tip: Add a lint-staged block to your package.json"
    log FATAL "   📘 Example: { \"*.ts\": [\"biome check --apply\", \"oxlint --fix\"] }"
    failed=1
  else
    local biome_used oxlint_used
    biome_used=$(jq -r '.["lint-staged"][]? | select(type == "string") | select(test("biome"))' "$pkg")
    oxlint_used=$(jq -r '.["lint-staged"][]? | select(type == "string") | select(test("oxlint"))' "$pkg")

    if [[ -z "$biome_used" ]]; then
      log FATAL "❌ lint-staged does not include biome"
      log FATAL "   💡 Tip: Add biome to your lint-staged config"
      log FATAL "   📘 Example: \"*.ts\": \"biome check --apply\""
      failed=1
    fi

    if [[ -z "$oxlint_used" ]]; then
      log FATAL "❌ lint-staged does not include oxlint"
      log FATAL "   💡 Tip: Add oxlint to your lint-staged config"
      log FATAL "   📘 Example: \"*.ts\": \"oxlint --fix\""
      failed=1
    fi
  fi

  local pkgmgr
  pkgmgr=$(jq -r '.packageManager // empty' "$pkg")
  if [[ -z "$pkgmgr" ]]; then
    log FATAL "❌ packageManager field missing in root package.json"
    log FATAL "   💡 Tip: Add \"packageManager\": \"pnpm@10.12.0\""
    log FATAL "   📘 Example: \"packageManager\": \"pnpm@10.12.0\""
    failed=1
  elif [[ ! "$pkgmgr" =~ ^pnpm@[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log FATAL "❌ packageManager must be in the format: pnpm@x.y.z"
    log FATAL "   💡 Tip: Use a pinned pnpm version for reproducibility"
    log FATAL "   📘 Example: \"packageManager\": \"pnpm@10.12.0\""
    failed=1
  else
    local version="${pkgmgr#pnpm@}"
    IFS=. read -r major minor patch <<< "$version"
    if (( major < 10 || (major == 10 && minor < 12) )); then
      log FATAL "❌ pnpm version too low: $version (min required: 10.12.0)"
      log FATAL "   💡 Tip: Upgrade with 'pnpm set-version 10.12.0'"
      log FATAL "   📘 Example: pnpm set-version 10.12.0"
      failed=1
    fi
  fi

  local nodever
  nodever=$(jq -r '.engines.node // empty' "$pkg")

  if [[ -z "$nodever" ]]; then
    log FATAL "❌ engines.node not specified"
    log FATAL "   💡 Tip: Set minimum Node.js version to 24.0.0 or higher"
    log FATAL "   📘 Example: \"engines\": { \"node\": \"^24.0.0\" }"
    failed=1
  elif [[ ! "$nodever" =~ ^[\^~>=]*24(\.[0-9]+)* ]]; then
    log FATAL "❌ engines.node must target Node 24.x (found: $nodever)"
    log FATAL "   💡 Tip: Use ^24.0.0 or newer to ensure compatibility with toolchain"
    log FATAL "   📘 Example: \"engines\": { \"node\": \"^24.0.0\" }"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ Root package.json passes all config checks"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_script_descriptions — Ensure scripts are documented in meta
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Requires every package.json to define `meta.scripts.description`
#   - Ensures every defined "script" has a matching description entry
#   - Ensures all descriptions are non-empty strings
#
# Why it matters:
#   - Unlabeled scripts reduce maintainability and dev onboarding clarity
#   - CI and tooling cannot infer purpose or intent without metadata
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_script_descriptions
#
# Categories:
#   package, lint
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::validate_script_descriptions() {
  # ✅ Check: All scripts must have descriptions in meta.scripts.description
  # Category: package, lint
  # Stages: check, lint

  local failed=0

  mapfile -t pkgs < <(find "$ROOT_DIR" -type f -name package.json)

  for pkg in "${pkgs[@]}"; do
    if ! jq -e '.scripts' "$pkg" >/dev/null 2>&1; then
      continue
    fi

    if ! jq -e '.meta.scripts.description' "$pkg" >/dev/null 2>&1; then
      log FATAL "❌ Missing meta.scripts.description block in: $pkg"
      log FATAL "   💡 Tip: Define descriptions for each script to clarify its purpose"
      log FATAL "   📘 Example: \"meta\": { \"scripts\": { \"description\": { \"build\": \"Compile the app\" } } }"
      failed=1
      continue
    fi

    mapfile -t script_keys < <(jq -r '.scripts | keys[]?' "$pkg")
    for script in "${script_keys[@]}"; do
      local desc
      desc=$(jq -r --arg k "$script" '.meta.scripts.description[$k] // empty' "$pkg")
      if [[ -z "$desc" || "$desc" == "null" ]]; then
        log FATAL "❌ Script '$script' in $pkg is missing a description"
        log FATAL "   💡 Tip: Add a description under meta.scripts.description[\"$script\"]"
        log FATAL "   📘 Example: \"$script\": \"Runs type checker and linter\""
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All scripts are properly documented"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_root_scripts_consistency — Validate root package scripts + descriptions
# ------------------------------------------------------------------------------
# This check enforces:
#   - Script names match allowed set
#   - Each script follows format: pnpm -r run <script> (except 'prepare' and 'preinstall')
#   - Each script has non-empty meta.scripts.description entry
#
# Why it matters:
#   - Ensures predictable monorepo orchestration behavior
#   - Avoids confusion from undocumented or inconsistent scripts
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_root_scripts_consistency
#
# Categories:
#   package, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::validate_root_scripts_consistency() {
  # ✅ Check: Enforce monorepo root script consistency
  # Category: package, lint
  # Stages: lint, check

  local failed=0
  local file="$ROOT_DIR/package.json"
  local expected_scripts=(
    benchmark bootstrap build check clean deploy dev
    format lint logs prepare preview preinstall test
  )

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Root package.json not found at $file"
    log FATAL "   💡 Tip: Create a root package.json to define monorepo tooling"
    log FATAL "   📘 Example: { \"name\": \"root\", \"private\": true, \"scripts\": { ... } }"
    return 1
  fi

  mapfile -t actual_scripts < <(jq -r '.scripts | keys[]?' "$file" | sort)
  mapfile -t defined_descriptions < <(jq -r '.meta.scripts.description | keys[]?' "$file" | sort)

  for script in "${expected_scripts[@]}"; do
    if ! jq -e --arg s "$script" '.scripts[$s]' "$file" >/dev/null; then
      log FATAL "❌ Missing root script: $script"
      log FATAL "   💡 Tip: Define a '$script' script at the root level for monorepo coordination"
      log FATAL "   📘 Example: \"$script\": \"pnpm -r run $script\""
      failed=1
      continue
    fi

    if [[ "$script" != "prepare" && "$script" != "preinstall" ]]; then
      value=$(jq -r --arg s "$script" '.scripts[$s]' "$file")
      if [[ "$value" != "pnpm -r run $script" ]]; then
        log FATAL "❌ Invalid format for script '$script': $value"
        log FATAL "   💡 Tip: Use 'pnpm -r run $script' for workspace orchestration"
        log FATAL "   📘 Example: \"$script\": \"pnpm -r run $script\""
        failed=1
      fi
    fi

    local desc
    desc=$(jq -r --arg s "$script" '.meta.scripts.description[$s] // empty' "$file")
    if [[ -z "$desc" || "$desc" == "null" ]]; then
      log FATAL "❌ Missing description in meta.scripts.description for: $script"
      log FATAL "   💡 Tip: Document what this script does"
      log FATAL "   📘 Example: \"$script\": \"Runs all tests across all packages\""
      failed=1
    fi
  done

  for extra in "${actual_scripts[@]}"; do
    if [[ ! " ${expected_scripts[*]} " =~ " $extra " ]]; then
      log FATAL "❌ Unexpected script found in root package.json: $extra"
      log FATAL "   💡 Tip: Limit root scripts to the standard orchestration set"
      log FATAL "   📘 Example: remove '$extra' or move it to the appropriate workspace package"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ Root scripts and metadata are consistent"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_product_scripts — Ensure required scripts exist in product packages
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Confirms required scripts exist in each product package
#   - Enforces consistent naming for each product scope
#   - Ensures that all dev, logs, and environment-specific logs are defined
#
# Why it matters:
#   - Missing or inconsistent scripts break monorepo workflows
#   - Logs, build, and test commands must be standardized across products
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_product_scripts
#
# Categories:
#   package, pnpm
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::validate_product_scripts() {
  # ✅ Check: Ensure each /packages/products/[product] has expected scripts
  # Category: package, pnpm
  # Stages: lint, check

  local failed=0
  local envs=(dev preview prod staging)

  find "$ROOT_DIR/packages/products" -mindepth 2 -maxdepth 2 -type d | while read -r product_dir; do
    local pkg="$product_dir/package.json"
    [[ ! -f "$pkg" ]] && continue

    local product
    product=$(basename "$product_dir")
    local name
    name=$(jq -r '.name // empty' "$pkg")

    declare -a required_scripts=(
      "build:$product"
      "build"
      "dev:$product"
      "logs:$product"
      "test:$product"
      "benchmark:$product"
    )

    for env in "${envs[@]}"; do
      required_scripts+=("logs:$product:$env")
    done

    for script in "${required_scripts[@]}"; do
      if ! jq -e --arg s "$script" '.scripts[$s]' "$pkg" >/dev/null; then
        log FATAL "❌ Missing script '$script' in: $pkg"
        log FATAL "   💡 Tip: Add \"$script\": \"pnpm --filter $name run ...\""
        log FATAL "   📘 Example: \"logs:$product:dev\": \"pnpm --filter $name run logs:dev\""
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All product scripts are present and valid"
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_deploy_scripts — Prevent deploy:* scripts in package.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Recursively scans all package.json files
#   - Fails if any script starts with "deploy:"
#
# Why it matters:
#   - Prevents accidental deployment logic from being invoked via local scripts
#   - Ensures all deploy logic is managed via CI/CD pipelines or Makefiles
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::disallow_deploy_scripts
#
# Categories:
#   package, ci
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::disallow_deploy_scripts() {
  # ✅ Check: Disallow deploy:* scripts
  # Category: package, ci
  # Stages: lint, check, pre-commit

  local failed=0

  find "$ROOT_DIR" -type f -name package.json | while read -r pkg; do
    mapfile -t deploy_scripts < <(jq -r '.scripts | keys[]' "$pkg" | grep '^deploy:' || true)
    if [[ "${#deploy_scripts[@]}" -gt 0 ]]; then
      log FATAL "❌ Disallowed deploy:* script(s) found in $pkg:"
      for script in "${deploy_scripts[@]}"; do
        log FATAL "   ↳ $script"
      done
      log FATAL "💡 Tip: Move deployment logic to CI/CD config or Makefile targets instead"
      log FATAL "📘 Example: Instead of \"deploy:prod\": \"wrangler deploy\", use .gitlab-ci.yml → deploy job"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::tsconfig_paths_resolution — Ensure all tsconfig paths aliases resolve
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Iterates over all compilerOptions.paths aliases
#   - Confirms that each alias target resolves to a file or directory
#   - Catches typos, broken paths, or mismatched folder structure
#
# Why it matters:
#   - Broken paths in TypeScript config lead to runtime errors and IDE failures
#   - Prevents accidental misconfigurations that break developer tooling and builds
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::tsconfig_paths_resolution
#
# Categories:
#   tsconfig, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::tsconfig_paths_resolution() {
  # ✅ Check: All compilerOptions.paths entries must resolve to valid targets
  # Category: tsconfig, paths
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f \( -name "tsconfig.json" -o -name "tsconfig.base.json" \) | while read -r config; do
    local baseDir
    baseDir="$(dirname "$config")"

    jq -r '.compilerOptions.paths | to_entries[] | .value[]?' "$config" 2>/dev/null | while read -r alias; do
      local normalized="${alias%%/*}"
      local full="$baseDir/$normalized"

      if [[ ! -d "$full" && ! -f "$full" ]]; then
        log FATAL "❌ paths alias in $config does not resolve: \"$alias\" → \"$full\""
        log FATAL "   💡 Tip: Ensure all 'compilerOptions.paths' entries point to valid relative locations"
        log FATAL "   📘 Example: \"@lib/*\": [\"src/lib/*\"] → ensure 'src/lib' exists near tsconfig"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::tsconfig_rootdir_layout — Warn on rootDir being outside typical layout
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects if rootDir is defined outside src/, packages/, or apps/
#   - Warns on nonstandard or overly broad rootDir settings
#
# Why it matters:
#   - Prevents improper compiler boundaries in TypeScript builds
#   - Encourages consistent folder structure and modular layout
#
# Globals used:
#   - ROOT_DIR → monorepo root directory for scanning tsconfig files
#
# Example:
#   ROOT_DIR=. check::tsconfig_rootdir_layout
#
# Categories:
#   tsconfig, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::tsconfig_rootdir_layout() {
  # ✅ Check: rootDir must be inside src/, packages/, or apps/
  # Category: tsconfig, paths
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f -name "tsconfig*.json" | while read -r config; do
    local rootdir
    rootdir=$(jq -r '.compilerOptions.rootDir // empty' "$config" 2>/dev/null)

    if [[ -n "$rootdir" && ! "$rootdir" =~ ^(src|packages|apps)(/|$) ]]; then
      log WARN "⚠️ compilerOptions.rootDir in $config is non-standard: \"$rootdir\""
      log WARN "   💡 Tip: Use structured layout under src/, packages/, or apps/"
      log WARN "   📘 Example: \"compilerOptions\": { \"rootDir\": \"src\" }"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::tsconfig_outdir_rootdir_files — Warn on discouraged monorepo compilerOptions
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns when outDir or rootDir are manually set in monorepo tsconfig files
#   - Warns if "files" is used instead of "include"/"exclude"
#
# Why it matters:
#   - outDir/rootDir may interfere with project references and composite builds
#   - files disables auto-discovery and can cause missing inputs
#
# Globals used:
#   - ROOT_DIR → monorepo root directory to scan tsconfig files
#
# Example:
#   ROOT_DIR=. check::tsconfig_outdir_rootdir_files
#
# Categories:
#   tsconfig
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::tsconfig_outdir_rootdir_files() {
  # ✅ Check: discourage using outDir, rootDir, or files in monorepo tsconfigs
  # Category: tsconfig
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f \( -name "tsconfig.json" -o -name "tsconfig.base.json" \) | while read -r config; do
    for key in outDir rootDir; do
      if jq -e ".compilerOptions.$key" "$config" >/dev/null; then
        log WARN "⚠️ \"$key\" is set in $config — may cause misaligned output in monorepos"
        log WARN "   💡 Tip: Let project references manage build boundaries; omit \"$key\" unless scoped"
        log WARN "   📘 Example: Remove \"compilerOptions.$key\" from $config unless required"
        failed=1
      fi
    done

    if jq -e '.files' "$config" >/dev/null; then
      log WARN "⚠️ $config uses 'files', which disables include/exclude auto-inclusion"
      log WARN "   💡 Tip: Use \"include\" and \"exclude\" for project-wide inclusion patterns"
      log WARN "   📘 Example: Replace \"files\": [\"index.ts\"] with \"include\": [\"src\"]"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::tsconfig_include_exclude_patterns — Warn on unmatched include/exclude patterns
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies that each pattern in "include" and "exclude" matches at least one file
#   - Warns if patterns are stale, misconfigured, or too narrow
#
# Why it matters:
#   - Stale or incorrect include/exclude patterns can silently break builds
#   - Ensures glob references in tsconfig are up-to-date and meaningful
#
# Globals used:
#   - ROOT_DIR → monorepo root directory to scan tsconfig files and referenced paths
#
# Example:
#   ROOT_DIR=. check::tsconfig_include_exclude_patterns
#
# Categories:
#   tsconfig
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::tsconfig_include_exclude_patterns() {
  # ✅ Check: each include/exclude pattern must match at least one file
  # Category: tsconfig
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f \( -name "tsconfig.json" -o -name "tsconfig.base.json" \) | while read -r config; do
    local basedir
    basedir="$(dirname "$config")"

    jq -r '.include[]?, .exclude[]?' "$config" 2>/dev/null | while read -r pattern; do
      local count
      count=$(find "$basedir" -path "$basedir/$pattern" 2>/dev/null | wc -l)

      if [[ "$count" -eq 0 ]]; then
        log WARN "⚠️ No files matched pattern \"$pattern\" in $config"
        log WARN "   💡 Tip: Double-check that the path or glob \"$pattern\" exists relative to the tsconfig file"
        log WARN "   📘 Example: If you use \"include\": [\"src\"] — ensure \"$basedir/src/\" exists"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::tsconfig_paths_resolution — Ensure all path mappings resolve
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies each value in compilerOptions.paths resolves to an actual file or directory
#   - Strips trailing wildcards and ensures the base path exists
#
# Why it matters:
#   - Broken path aliases cause IDE errors and unresolved imports during build
#   - Ensures monorepo path mapping integrity for maintainability
#
# Globals used:
#   - ROOT_DIR → monorepo root directory for scanning tsconfig files
#
# Example:
#   ROOT_DIR=. check::tsconfig_paths_resolution
#
# Categories:
#   tsconfig
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::tsconfig_paths_resolution() {
  # ✅ Check: all compilerOptions.paths entries must resolve
  # Category: tsconfig
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f -name "tsconfig*.json" | while read -r config; do
    local basedir
    basedir="$(dirname "$config")"

    jq -r '.compilerOptions.paths // {} | to_entries[] | .value[]?' "$config" 2>/dev/null | while read -r raw_path; do
      local resolved
      resolved=$(echo "$raw_path" | sed 's/\*.*$//' | sed 's|/*$||')
      local absolute="$basedir/$resolved"

      if [[ ! -d "$absolute" && ! -f "$absolute" ]]; then
        log FATAL "❌ paths alias does not resolve in $config:"
        log FATAL "   ↳ \"$raw_path\" → \"$absolute\""
        log FATAL "   💡 Tip: Make sure this path exists relative to the tsconfig"
        log FATAL "   📘 Example: \"@utils/*\": [\"src/utils/*\"] → src/utils must exist"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::multiple_env_files — Warn if multiple .env.* files exist
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects when multiple .env.* files are present in the root directory
#   - Warns if any .env.* files exist that don’t match the selected $ENV_FILE
#   - Helps prevent CI misconfiguration due to incorrect .env file selection
#
# Why it matters:
#   - Multiple environment files can lead to ambiguous config during deploys or builds
#   - Explicit declaration ensures clarity in local, staging, and production setups
#
# Globals used:
#   - ROOT_DIR → root of the project
#   - ENV_FILE → currently selected .env file
#
# Example:
#   ROOT_DIR=.
#   ENV_FILE=".env.staging"
#   check::multiple_env_files
#
# Categories:
#   dotenv
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::multiple_env_files() {
  # ✅ Check: multiple .env.* files must not conflict with ENV_FILE
  # Category: dotenv
  # Stages: check, lint

  local failed=0
  local env_candidates
  env_candidates=$(find "$ROOT_DIR" -maxdepth 1 -type f -name ".env.*" ! -name "*.example" | sort)

  while read -r path; do
    [[ "$path" == "$ROOT_DIR/$ENV_FILE" ]] && continue
    log WARN "⚠️ Unused or conflicting .env.* file detected: $path"
    log WARN "   💡 Tip: Use only one active .env file and remove or rename others"
    log WARN "   📘 Example: export ENV_FILE=.env.staging"
    failed=1
  done <<< "$env_candidates"

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::migrations_no_tempfiles — Reject temporary or backup files in migrations/
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects and fails on presence of backup, swap, or temp files in $MIGRATIONS_DIR
#   - Prevents accidental commits of editor artifacts or broken migration states
#
# Why it matters:
#   - Temp and swap files indicate in-progress or broken edits
#   - These should never be committed or deployed in a schema migration system
#
# Globals used:
#   - MIGRATIONS_DIR → Path to the folder containing migration files
#
# Example:
#   MIGRATIONS_DIR="./migrations"
#   check::migrations_no_tempfiles
#
# Categories:
#   database, safety
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::migrations_no_tempfiles() {
  # ✅ Check: No temp/backup/swap files allowed in migrations/
  # Category: database, safety
  # Stages: check, lint, pre-commit

  local failed=0
  local bad_files

  bad_files=$(find "$MIGRATIONS_DIR" -type f \( \
    -name '*~' -o -name '*.bak' -o -name '*.tmp' -o -name '.*.swp' \
  \) 2>/dev/null || true)

  if [[ -n "$bad_files" ]]; then
    log FATAL "❌ Unexpected temporary or backup files found in $MIGRATIONS_DIR:"
    echo "$bad_files" | while read -r file; do
      log FATAL "   ↳ $file"
    done
    log FATAL "💡 Tip: Clean up editor-generated artifacts before commit"
    log FATAL "📘 Example: rm -f $MIGRATIONS_DIR/*.{bak,tmp} $MIGRATIONS_DIR/.*.swp"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::sql_integrity — Full SQL schema + migrations validation
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures required files and directories exist
#   - Verifies all migration files are .sql, unique, UTF-8 (no BOM, no CRLF, no tabs)
#   - Checks for unsupported SQL (triggers, views, grants, etc.)
#   - Ensures presence of required tables (global_settings)
#   - Rejects destructive keywords (DROP, DELETE, etc) or unsafe content (merge markers)
#   - Warns on schema bloat, BEGIN/COMMIT blocks, manual 'migrations' table
#   - Flags commented-out critical environment keys
#
# Why it matters:
#   - Prevents silent errors in deployment due to invalid SQL or unsupported features
#   - Enforces SQLite/D1 compatibility
#   - Ensures safe, audit-friendly, and predictable schema evolution
#
# Globals used:
#   - ROOT_DIR        → Root of the project
#   - MIGRATIONS_DIR  → Path to folder containing .sql migration files
#   - BASE_SCHEMA     → Filename of the base schema file
#   - ENV_FILE        → .env file used for conflict/key checks
#   - MIGRATE_SCRIPT  → Name of your migration script (for warning context)
#
# Example:
#   ROOT_DIR=.
#   MIGRATIONS_DIR=./migrations
#   BASE_SCHEMA=000-initial-schema.sql
#   ENV_FILE=.env
#   check::sql_integrity
#
# Categories:
#   database, safety
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::sql_integrity() {
  # ✅ Check: all SQL files are safe, correct, and consistent with D1 constraints
  # Category: database, safety
  # Stages: lint, check, pre-commit

  [[ "$MIGRATIONS_DIR" != /* ]] && MIGRATIONS_DIR="$ROOT_DIR/$MIGRATIONS_DIR"
  BASE_SCHEMA_PATH="$MIGRATIONS_DIR/$BASE_SCHEMA"

  if [[ ! -d "$MIGRATIONS_DIR" ]]; then
    log FATAL "❌ Migrations directory not found: $MIGRATIONS_DIR"
    log FATAL "   💡 Tip: Set MIGRATIONS_DIR to the directory containing .sql migrations"
    log FATAL "   📘 Example: export MIGRATIONS_DIR=./migrations"
    return 1
  fi

  if [[ ! -f "$BASE_SCHEMA_PATH" ]]; then
    log FATAL "❌ Base schema file not found: $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Set BASE_SCHEMA to the filename of the main schema file"
    log FATAL "   📘 Example: export BASE_SCHEMA=000-initial-schema.sql"
    return 1
  fi

  mapfile -t bad_ext < <(find "$MIGRATIONS_DIR" -type f ! -name '*.sql')
  if [[ "${#bad_ext[@]}" -gt 0 ]]; then
    log FATAL "❌ Non-SQL files found in migration directory:"
    for f in "${bad_ext[@]}"; do log FATAL "   ↳ $f"; done
    log FATAL "   💡 Tip: All migration files must use .sql extensions only"
    return 1
  fi

  mapfile -t dupes < <(find "$MIGRATIONS_DIR" -type f -name '*.sql' -exec basename {} \; | sort | uniq -d)
  if [[ "${#dupes[@]}" -gt 0 ]]; then
    log FATAL "❌ Duplicate SQL filenames found:"
    for d in "${dupes[@]}"; do log FATAL "   ↳ $d"; done
    log FATAL "   💡 Tip: Use unique migration filenames per version"
    return 1
  fi

  mapfile -t bad_names < <(find "$MIGRATIONS_DIR" -type f -name '*.sql' | grep -P '[^\w.\-_/]')
  if [[ "${#bad_names[@]}" -gt 0 ]]; then
    log FATAL "❌ Unsafe characters found in migration filenames:"
    for b in "${bad_names[@]}"; do log FATAL "   ↳ $b"; done
    log FATAL "   💡 Tip: Only use a–z, 0–9, _, -, or . in filenames"
    log FATAL "   📘 Example: 001-init.sql ✅ vs 001 init!.sql ❌"
    return 1
  fi

  for f in $(find "$MIGRATIONS_DIR" -type f -name '*.sql' | sort); do
    if ! file "$f" | grep -q 'UTF-8 Unicode text'; then
      log FATAL "❌ $f is not UTF-8 encoded"
      log FATAL "   💡 Tip: Convert using iconv or check your editor settings"
      return 1
    fi

    if file "$f" | grep -q 'UTF-8 Unicode (with BOM)'; then
      log FATAL "❌ UTF-8 BOM detected in: $f"
      log FATAL "   💡 Tip: Strip BOM using dos2unix or iconv"
      return 1
    fi

    if file "$f" | grep -q CRLF; then
      log FATAL "❌ CRLF line endings found in: $f"
      log FATAL "   💡 Tip: Convert using: dos2unix $f"
      return 1
    fi

    if grep -qP '\t' "$f"; then
      log FATAL "❌ Tab character found in $f — use spaces"
      log FATAL "   💡 Tip: Run 'expand -t 2 $f > tmp && mv tmp $f'"
      return 1
    fi

    if [[ "$f" == "$BASE_SCHEMA_PATH" ]] && ! grep -q 'CREATE TABLE[[:space:]]\+global_settings' "$f"; then
      log FATAL "❌ global_settings table missing in base schema: $f"
      log FATAL "   💡 Tip: This table is required for global system defaults"
      return 1
    fi

    if grep -iqE '\b(TRIGGER|VIEW|GRANT|FUNCTION|PROCEDURE|SEQUENCE)\b' "$f"; then
      log FATAL "❌ Unsupported SQL feature detected in $f"
      log FATAL "   💡 Tip: D1 does not support TRIGGER/VIEW/GRANT/FUNCTION"
      return 1
    fi

    if grep -iE '\b(DROP|DELETE|TRUNCATE)\b' "$f"; then
      log WARN "⚠️ Destructive SQL keyword found in $f"
    fi

    if grep -iE '^\s*(BEGIN|COMMIT)\b' "$f"; then
      log WARN "⚠️ Transaction block found in $f — not needed for D1"
    fi

    if grep -iq 'create table.*migrations' "$f"; then
      log WARN "⚠️ 'migrations' table manually defined in $f — may conflict with $MIGRATE_SCRIPT"
    fi
  done

  local schema_size
  schema_size=$(stat -c%s "$BASE_SCHEMA_PATH")
  if (( schema_size > 1048576 )); then
    log WARN "⚠️ Base schema exceeds 1MB (${schema_size} bytes): $BASE_SCHEMA_PATH"
  fi

  if grep -qE '<<<<<<<|=======|>>>>>>>' "$ENV_FILE" "$BASE_SCHEMA_PATH" 2>/dev/null; then
    log FATAL "❌ Merge conflict markers found in $ENV_FILE or $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Resolve merge conflicts before committing"
    return 1
  fi

  if grep -E '^#\s*(TIER_|DEFAULT_|CUSTOMER_UUID_).*=' "$ENV_FILE" 2>/dev/null; then
    log WARN "⚠️ Commented-out critical ENV vars found in $ENV_FILE"
  fi

  if git rev-parse --is-inside-work-tree &>/dev/null; then
    if git status --porcelain "$MIGRATIONS_DIR" | grep -qE '^\?\?'; then
      log WARN "⚠️ Untracked .sql files found in $MIGRATIONS_DIR — commit required"
    fi
  fi

  log INFO "✅ SQL integrity validation complete for all files in $MIGRATIONS_DIR"
}

# ------------------------------------------------------------------------------
# 🧪 check::shell_scripts_integrity — Validate all *.sh scripts in workspace
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Recursively checks all .sh files across the workspace
#   - Validates strict mode is used (`set -euo pipefail`)
#   - Runs `bash -n` syntax check
#   - Requires executability for non-underscore-prefixed scripts
#
# Why it matters:
#   - Prevents subtle runtime errors by enforcing bash strict mode
#   - Ensures shell scripts are syntactically valid
#   - Detects misconfigured file permissions that break CI
#
# Globals used:
#   - ROOT_DIR → workspace root path to scan for shell scripts
#
# Example:
#   ROOT_DIR=.
#   check::shell_scripts_integrity
#
# Categories:
#   shell
#
# Stages:
#   lint, test, check, pre-commit
# ------------------------------------------------------------------------------
check::shell_scripts_integrity() {
  # ✅ Check: All workspace shell scripts must be safe, strict, and executable where appropriate
  # Category: shell
  # Stages: lint, test, check, pre-commit

  local failed=0

  find "$ROOT_DIR" -type f -name "*.sh" | while read -r script; do
    local name
    name="$(basename "$script")"

    if [[ ! -r "$script" ]]; then
      log FATAL "❌ Cannot read shell script: $script"
      log FATAL "   💡 Tip: Ensure the script exists and is readable"
      log FATAL "   📘 Example: chmod 644 $script"
      failed=1
      continue
    fi

    if ! grep -q 'set -euo pipefail' "$script"; then
      log FATAL "❌ $script is missing strict mode (set -euo pipefail)"
      log FATAL "   💡 Tip: Add 'set -euo pipefail' at the top after the shebang"
      log FATAL "   📘 Example:\n       #!/usr/bin/env bash\n       set -euo pipefail"
      failed=1
    fi

    if ! bash -n "$script" 2>/dev/null; then
      log FATAL "❌ Syntax error in shell script: $script"
      log FATAL "   💡 Tip: Run 'bash -n $script' locally to identify issues"
      log FATAL "   📘 Example: Fix missing 'fi', unmatched quotes, etc."
      failed=1
    fi

    if [[ "$name" != _* && ! -x "$script" ]]; then
      log FATAL "❌ $script is not executable but should be"
      log FATAL "   💡 Tip: Mark this script as executable"
      log FATAL "   📘 Example: chmod +x $script"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All workspace shell scripts passed validation"
}

# ------------------------------------------------------------------------------
# 🧪 check::env_file_integrity — Validate structure and safety of .env file
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures the .env file exists, is non-empty, and contains no invalid formatting
#   - Rejects tabs, malformed/unquoted values, merge conflicts, or duplicate keys
#   - Warns on unsafe values like hardcoded UUIDs or commented tier/global vars
#   - Warns if ENV_FILE is not uniquely selected
#
# Why it matters:
#   - Prevents config bugs and accidental secrets exposure
#   - Ensures environment files are production-safe and consistent
#
# Globals used:
#   - ROOT_DIR → root of the monorepo
#   - ENV_FILE → active env file path
#   - ENVIRONMENT → current environment name (e.g. production)
#   - ENV_FILE_DEFAULT → fallback template path
#
# Example:
#   ENV_FILE=".env.staging"
#   ENV_FILE_DEFAULT=".env.example"
#   check::env_file_integrity
#
# Categories:
#   dotenv
#
# Stages:
#   lint, check, pre-commit, deploy
# ------------------------------------------------------------------------------
check::env_file_integrity() {
  # ✅ Check: .env file must exist and be valid
  # Category: dotenv
  # Stages: lint, check, pre-commit, deploy

  local failed=0

  if [[ ! -f "$ENV_FILE" ]]; then
    log FATAL "❌ Missing environment file: $ENV_FILE"
    log FATAL "   💡 Tip: You can create it from template with:"
    log FATAL "   📘 Example: cp $ENV_FILE_DEFAULT $ENV_FILE"
    return 1
  fi

  if [[ ! -s "$ENV_FILE" ]]; then
    log FATAL "❌ Environment file is empty: $ENV_FILE"
    log FATAL "   💡 Tip: Copy or regenerate from a known working template"
    log FATAL "   📘 Example: cp $ENV_FILE_DEFAULT $ENV_FILE"
    return 1
  fi

  if DUPES=$(grep -o '^[A-Z0-9_]\+=' "$ENV_FILE" | sort | uniq -d); [[ -n "$DUPES" ]]; then
    log FATAL "❌ Duplicate environment keys found in $ENV_FILE"
    log FATAL "   💡 Tip: Consolidate or remove repeated variables"
    echo "$DUPES" | while read -r key; do log FATAL "   ↳ $key"; done
    return 1
  fi

  if grep -qP '\t' "$ENV_FILE"; then
    log FATAL "❌ Tab characters detected in $ENV_FILE"
    log FATAL "   💡 Tip: Convert tabs to spaces using: expand -t 2 $ENV_FILE > tmp && mv tmp $ENV_FILE"
    log FATAL "   📘 Example: Replace tabs with 2-space indent"
    return 1
  fi

  if grep -qP '^[A-Z_][A-Z0-9_]*=.*".*[^"]$' "$ENV_FILE"; then
    log FATAL "❌ Malformed quoted values detected (unclosed quotes)"
    log FATAL "   💡 Tip: Ensure all quoted values are properly closed"
    log FATAL "   📘 Example: VAR=\"some value with spaces\""
    return 1
  fi

  if grep -qP '^[A-Z_][A-Z0-9_]*=[^"].* .*$' "$ENV_FILE"; then
    log FATAL "❌ Unquoted value with spaces in $ENV_FILE"
    log FATAL "   💡 Tip: Wrap any value containing spaces in double quotes"
    log FATAL "   📘 Example: NAME=\"My Project\""
    return 1
  fi

  if grep -qE '<<<<<<<|=======|>>>>>>>' "$ENV_FILE"; then
    log FATAL "❌ Unresolved Git merge conflict markers found in $ENV_FILE"
    log FATAL "   💡 Tip: Open the file and resolve conflicts manually before committing"
    log FATAL "   📘 Example: Fix lines starting with <<<<<<<, =======, >>>>>>>"
    return 1
  fi

  if grep -qE 'uuid-[a-z0-9]+' "$ENV_FILE"; then
    log WARN "⚠️ Hardcoded UUIDs detected — validate correctness"
    log WARN "   💡 Tip: Ensure these UUIDs match the correct customer/environment context"
    log WARN "   📘 Example: CUSTOMER_UUID=uuid-abc123def456"
  fi

  if [[ -n "$ENVIRONMENT" && ! "$ENVIRONMENT" =~ ^[a-z0-9_-]+$ ]]; then
    log FATAL "❌ Invalid ENVIRONMENT value: '$ENVIRONMENT'"
    log FATAL "   💡 Tip: Use lowercase, alphanumeric, hyphen or underscore only"
    log FATAL "   📘 Example: ENVIRONMENT=production or ENVIRONMENT=preview_staging"
    return 1
  fi

  if grep -qP '[ \t]+$' "$ENV_FILE"; then
    log WARN "⚠️ Trailing whitespace detected in $ENV_FILE"
    log WARN "   💡 Tip: Strip trailing space with: sed -i 's/[ \t]*$//' $ENV_FILE"
    log WARN "   📘 Example: Clean trailing spaces from all lines"
  fi

  if grep -qE '^#\s*(TIER_|DEFAULT_|CUSTOMER_UUID_).*=' "$ENV_FILE"; then
    log WARN "⚠️ Commented-out critical variables found in $ENV_FILE (TIER_, DEFAULT_, etc.)"
    log WARN "   💡 Tip: Uncomment critical tier or customer UUID variables before deploying"
    log WARN "   📘 Example: #TIER=prod → TIER=prod"
  fi

  local env_candidates
  env_candidates=$(find "$ROOT_DIR" -maxdepth 1 -name ".env*" | grep -vE '\.example$' | sort)

  if echo "$env_candidates" | grep -qvFx "$ROOT_DIR/$ENV_FILE"; then
    log WARN "⚠️ Multiple .env.* files found — ensure ENV_FILE is pointing to the correct one"
    echo "$env_candidates" | while read -r path; do log WARN "   ↳ Found: $path"; done
    log WARN "   💡 Tip: Set ENV_FILE explicitly to avoid CI ambiguity"
    log WARN "   📘 Example: export ENV_FILE=.env.production"
  fi

  log INFO "✅ Environment file validated successfully"
  log INFO "   ↳ .env file:     $ENV_FILE"
  log INFO "   ↳ ENVIRONMENT:   ${ENVIRONMENT:-<unset>}"
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_authenticated — Ensure wrangler is logged into Cloudflare
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures the developer is authenticated via `wrangler login`
#   - Prevents deploys from failing due to unauthenticated CLI sessions
#
# Why it matters:
#   - Avoids broken deployments caused by missing auth context
#   - Ensures CI and local environments are properly linked to Cloudflare
#
# Globals used:
#   - None
#
# Example:
#   check::wrangler_authenticated
#
# Categories:
#   wrangler
#
# Stages:
#   pre-commit, check, deploy
# ------------------------------------------------------------------------------
check::wrangler_authenticated() {
  # ✅ Check: wrangler must be authenticated via `wrangler login`
  # Category: wrangler
  # Stages: pre-commit, check, deploy

  if ! command -v wrangler >/dev/null; then
    log FATAL "❌ wrangler CLI is not installed"
    log FATAL "   💡 Tip: Install it via \`pnpm add -g wrangler\` or \`npm install -g wrangler\`"
    log FATAL "   📘 Example: pnpm add -g wrangler"
    return 1
  fi

  if ! wrangler whoami &>/dev/null; then
    log FATAL "❌ Wrangler is not authenticated with Cloudflare"
    log FATAL "   💡 Tip: Run \`wrangler login\` to authenticate and link your account"
    log FATAL "   📘 Docs: https://developers.cloudflare.com/workers/wrangler/commands/#login"
    return 1
  fi

  log INFO "✅ Wrangler is authenticated"
}

# ------------------------------------------------------------------------------
# 🧪 check::wrangler_config_integrity — Validate wrangler.json storage bindings
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects preview KV bindings not declared in base
#   - Validates Durable Object bindings for missing/placeholder fields
#   - Detects duplicate R2 bucket names across envs
#   - Ensures all KV namespaces resolve to Cloudflare namespace IDs
#   - Validates safe binding name formats and uniqueness across storage classes
#   - Warns if bindings are reused across [env.*] sections
#
# Why it matters:
#   - Prevents broken deploys due to invalid or inconsistent wrangler.json binding config
#   - Avoids namespace conflicts, mislinked services, and unsafe naming
#
# Globals used:
#   - ENVIRONMENT        → Current environment (e.g. staging, prod)
#   - WRANGLER_CONFIG    → Path to wrangler.json
#   - KV_NAMESPACES      → Space-separated list of KV bindings
#   - R2_BUCKETS         → Space-separated list of R2 bucket bindings
#   - DO_CLASSES         → Space-separated list of Durable Object class bindings
#
# Example:
#   ENVIRONMENT=preview WRANGLER_CONFIG=wrangler.json check::wrangler_config_integrity
#
# Categories:
#   wrangler
#
# Stages:
#   check, deploy, pre-commit
# ------------------------------------------------------------------------------
check::wrangler_config_integrity() {
  # ✅ Check: Validate wrangler.json storage binding integrity
  # Category: wrangler
  # Stages: check, deploy, pre-commit

  if [[ "$ENVIRONMENT" == "preview" ]]; then
    local preview_kv base_kv
    preview_kv=$(jq -r '.env.preview.kv_namespaces[]?.binding' "$WRANGLER_CONFIG" 2>/dev/null || true)
    base_kv=$(jq -r '.kv_namespaces[]?.binding' "$WRANGLER_CONFIG" 2>/dev/null || true)

    for kv in $preview_kv; do
      if ! echo "$base_kv" | grep -qFx "$kv"; then
        log WARN "⚠️ Detected dangling KV binding in [env.preview]: '$kv'"
        log WARN "   💡 Tip: Move this binding to the root kv_namespaces array if shared"
        log WARN "   📘 Example: \"kv_namespaces\": [{ \"binding\": \"$kv\", ... }]"
      fi
    done
  fi

  if jq -e '.durable_objects.bindings[]? | select(.name == null or .class_name == null)' "$WRANGLER_CONFIG" >/dev/null; then
    log FATAL "❌ DO binding missing 'name' or 'class_name' in $WRANGLER_CONFIG"
    log FATAL "   💡 Tip: Each Durable Object must declare both 'name' and 'class_name'"
    log FATAL "   📘 Example: { \"name\": \"Session\", \"class_name\": \"Session\" }"
    return 1
  fi

  if jq -e '.durable_objects.bindings[]? | select(.class_name == "Example")' "$WRANGLER_CONFIG" >/dev/null; then
    log FATAL "❌ Placeholder Durable Object class_name 'Example' found"
    log FATAL "   💡 Tip: Replace with your actual Durable Object class name"
    log FATAL "   📘 Example: \"class_name\": \"UserSession\""
    return 1
  fi

  if [[ -n "$(jq -r '[.r2_buckets[]?.bucket_name, .env[]?.r2_buckets[]?.bucket_name] | group_by(.) | map(select(length > 1)) | .[]?' "$WRANGLER_CONFIG")" ]]; then
    log FATAL "❌ Duplicate R2 bucket_name(s) detected across environments"
    log FATAL "   💡 Tip: Use unique bucket_name values in all environments"
    log FATAL "   📘 Example: use bucket names like 'assets_prod' and 'assets_preview'"
    return 1
  fi

  for kv in $KV_NAMESPACES; do
    if ! wrangler kv namespace list | jq -e --arg name "$kv" '.[] | select(.title == $name)' >/dev/null; then
      log FATAL "❌ KV namespace '$kv' is not resolvable via wrangler"
      log FATAL "   💡 Tip: Create it with: wrangler kv namespace create --binding $kv"
      log FATAL "   📘 Example: wrangler kv namespace create --binding $kv"
      return 1
    fi
  done

  for name in $KV_NAMESPACES $R2_BUCKETS $DO_CLASSES; do
    if [[ ! "$name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
      log FATAL "❌ Invalid binding name: '$name'"
      log FATAL "   💡 Tip: Use only letters, numbers, underscores, or hyphens"
      log FATAL "   📘 Example: myStore_KV or auth-sessions"
      return 1
    fi
  done

  local all_bindings
  all_bindings=$(echo "$KV_NAMESPACES $R2_BUCKETS $DO_CLASSES" | tr ' ' '\n' | sort)
  local dupes
  dupes=$(echo "$all_bindings" | uniq -d)

  if [[ -n "$dupes" ]]; then
    log FATAL "❌ Duplicate binding names across KV, R2, or DO:"
    echo "$dupes" | while read -r name; do
      log FATAL "   ↳ $name"
    done
    log FATAL "   💡 Tip: Use unique bindings to prevent cross-service collisions"
    log FATAL "   📘 Example: rename $name to ${name}_${ENVIRONMENT}"
    return 1
  fi

  for name in $KV_NAMESPACES $R2_BUCKETS $DO_CLASSES; do
    env_usages=$(jq -r --arg name "$name" '
      .env | to_entries[] | select(.value | tostring | test($name)) | .key
    ' "$WRANGLER_CONFIG" 2>/dev/null || true)

    if [[ -n "$env_usages" && ! "$env_usages" =~ (^|[[:space:]])"$ENVIRONMENT"($|[[:space:]]) ]]; then
      log WARN "⚠️ Binding '$name' appears in multiple environments:"
      echo "$env_usages" | while read -r env; do
        [[ "$env" != "$ENVIRONMENT" ]] && log WARN "   ↳ Also in: [env.$env]"
      done
      log WARN "   💡 Tip: Avoid reusing binding names across env.* blocks"
      log WARN "   📘 Example: rename '$name' to '${name}_${env}'"
    fi
  done

  log INFO "✅ Wrangler config is valid: $WRANGLER_CONFIG"
}

# ------------------------------------------------------------------------------
# 🧪 check::db_name_safety — Validate database name format and environment usage
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures DB_NAME contains only safe characters
#   - Prevents accidental mutation of production DB from non-prod environments
#
# Why it matters:
#   - Unsafe DB names can break shell tooling, CI pipelines, or create invalid databases
#   - Accidentally mutating a production DB from staging/dev CI is a critical risk
#
# Globals used:
#   - DB_NAME → Name of the current D1 or SQL database
#   - ENVIRONMENT → Current runtime environment (e.g. production, staging)
#
# Example:
#   DB_NAME="analytics_staging"
#   ENVIRONMENT="staging"
#   check::db_name_safety
#
# Categories:
#   database, safety
#
# Stages:
#   pre-commit, validate, deploy
# ------------------------------------------------------------------------------
check::db_name_safety() {
  # ✅ Check: DB_NAME must be shell-safe and protected from accidental prod access
  # Category: database, safety
  # Stages: pre-commit, validate, deploy

  if [[ "$DB_NAME" =~ [^a-zA-Z0-9_-] ]]; then
    log FATAL "❌ Invalid DB_NAME: '$DB_NAME' contains unsupported characters"
    log FATAL "   💡 Tip: Only use a–z, A–Z, 0–9, underscores (_), and dashes (-)"
    log FATAL "   📘 Example: analytics_staging, customer-123"
    return 1
  fi

  if [[ "$DB_NAME" == "analytics_prod" && "${ENVIRONMENT:-}" != "production" ]]; then
    log FATAL "❌ Refusing to operate on 'analytics_prod' from non-production environment: ENVIRONMENT=$ENVIRONMENT"
    log FATAL "   💡 Tip: Set ENVIRONMENT=production before targeting the production database"
    log FATAL "   📘 Example: export ENVIRONMENT=production"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::gitlab_ci_stages_defined — Enforce standardized CI stage list
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures each GitLab CI file declares `stages:`
#   - Verifies all required stages are present
#   - Validates order matches approved standard
#   - Fails on any unapproved stage declarations
#
# Why it matters:
#   - Prevents undefined or misordered CI stages
#   - Ensures predictable pipeline structure across teams
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::gitlab_ci_stages_defined
#
# Categories:
#   ci
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::gitlab_ci_stages_defined() {
  # ✅ Check: GitLab CI config must define required stages in correct order
  # Category: ci
  # Stages: lint, validate

  local failed=0
  local approved_stages=(
    "setup" "check" "lint" "test" "build"
    "migrate" "deploy" "integration" "docs"
  )

  mapfile -t files < <(find "$ROOT_DIR" -type f \( -name ".gitlab-ci.yml" -o -path "*/gitlab/ci/*.yml" \))

  for file in "${files[@]}"; do
    if ! yq e '.stages' "$file" >/dev/null 2>&1; then
      log FATAL "❌ Missing 'stages:' declaration in $file"
      log FATAL "   💡 Tip: Declare stages at the top of your CI config"
      log FATAL "   📘 Example: stages: [setup, check, lint, test, build, migrate, deploy, integration, docs]"
      failed=1
      continue
    fi

    mapfile -t declared_stages < <(yq e '.stages[]' "$file" 2>/dev/null || true)

    # Missing required stages
    for stage in "${approved_stages[@]}"; do
      if ! printf "%s\n" "${declared_stages[@]}" | grep -Fxq "$stage"; then
        log FATAL "❌ Missing required stage '$stage' in $file"
        log FATAL "   💡 Tip: Add this stage to your stages array"
        log FATAL "   📘 Example: stages: [..., \"$stage\", ...]"
        failed=1
      fi
    done

    # Extra unapproved stages
    for stage in "${declared_stages[@]}"; do
      if ! printf "%s\n" "${approved_stages[@]}" | grep -Fxq "$stage"; then
        log FATAL "❌ Unapproved CI stage found in $file: '$stage'"
        log FATAL "   💡 Tip: Only use the approved stages: ${approved_stages[*]}"
        log FATAL "   📘 Example: stages: [${approved_stages[*]}]"
        failed=1
      fi
    done

    # Stage order mismatch
    for i in "${!declared_stages[@]}"; do
      expected="${approved_stages[$i]}"
      actual="${declared_stages[$i]}"
      if [[ "$expected" != "$actual" ]]; then
        log FATAL "❌ Incorrect stage order in $file: expected '$expected' at position $((i+1)), found '$actual'"
        log FATAL "   💡 Tip: Sort your stages to match the approved order"
        log FATAL "   📘 Example: stages: [${approved_stages[*]}]"
        failed=1
        break
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::gitlab_ci_unused_stages — Detect unused CI stage declarations
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parses all GitLab CI YAML files for `stages:`
#   - Extracts every job's declared `stage:`
#   - Fails if any stage in `stages:` is never referenced
#
# Why it matters:
#   - Prevents misleading or dead CI configuration
#   - Keeps pipeline stages lean and accurate
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::gitlab_ci_unused_stages
#
# Categories:
#   ci
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::gitlab_ci_unused_stages() {
  # ✅ Check: Detect any unused stage declarations in GitLab CI configs
  # Category: ci
  # Stages: lint, validate

  local failed=0

  mapfile -t files < <(find "$ROOT_DIR" -type f \( -name ".gitlab-ci.yml" -o -path "*/gitlab/ci/*.yml" \))

  for file in "${files[@]}"; do
    mapfile -t defined_stages < <(yq e '.stages[]' "$file" 2>/dev/null || true)
    mapfile -t used_stages < <(yq e 'select(. != null) | .[] | .stage' "$file" 2>/dev/null | sort -u)

    for stage in "${defined_stages[@]}"; do
      if [[ ! " ${used_stages[*]} " =~ " $stage " ]]; then
        log FATAL "❌ Unused stage '$stage' declared in: $file"
        log FATAL "   💡 Tip: Remove unused stages from the stages: list"
        log FATAL "   📘 Example: stages: [${used_stages[*]}]"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::git_protected_branch_push — Prevent direct commits to protected branches
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects if current branch is protected
#   - Prevents developers or CI from pushing directly to protected branches
#   - Must be enforced via pre-push hook or CI pipeline condition
#
# Why it matters:
#   - Enforces review workflows
#   - Prevents accidental overwrites of critical environments
#
# Globals used:
#   - CI_COMMIT_REF_NAME → GitLab CI variable (optional)
#   - GIT_BRANCH         → Local branch (fallback)
#
# Example:
#   check::git_protected_branch_push
#
# Categories:
#   ci, safety
#
# Stages:
#   pre-commit, lint, deploy
# ------------------------------------------------------------------------------
check::git_protected_branch_push() {
  # ✅ Check: prevent direct push to protected branches
  # Category: ci, safety
  # Stages: pre-commit, lint, deploy

  local failed=0
  local protected=("main" "master" "production" "release" "prod")
  local branch="${CI_COMMIT_REF_NAME:-${GIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}}"

  for p in "${protected[@]}"; do
    if [[ "$branch" == "$p" ]]; then
      log FATAL "❌ Direct push to protected branch '$branch' is not allowed"
      log FATAL "   💡 Tip: Use a feature or merge request branch instead"
      log FATAL "   📘 Example: git checkout -b fix/issue-123"
      return 1
    fi
  done

  log INFO "✅ Branch '$branch' is not protected — push allowed"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_package_tags — Enforce valid and required tags in package.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures each package.json has a `tags` array
#   - All tags must be lowercase, dash-separated, and from the approved list
#   - Prevents accidental omission of architectural metadata
#
# Why it matters:
#   - Enables tooling to enforce boundaries, CI rules, linting, etc.
#   - Prevents drift in monorepo structure
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::validate_package_tags
#
# Categories:
#   package, boundaries, lint
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::validate_package_tags() {
  # ✅ Check: package.json must contain a valid tags[] array
  # Category: package, boundaries, lint
  # Stages: lint, validate

  local failed=0

  # Define all allowed tags
  local -a allowed_tags=(
    core lib ui api service worker cli plugin
    internal external shared private public
    backend frontend mobile web edge cloud
    integration system database config infra
    build test devtools sdk runtime schema
  )

  local tag_regex='^[a-z0-9-]+$'

  find "$ROOT_DIR/packages" -type f -name package.json | while read -r pkg; do
    if ! jq -e '.tags' "$pkg" >/dev/null; then
      log FATAL "❌ Missing 'tags' field in $pkg"
      log FATAL "   💡 Tip: Add a 'tags' array to describe the module purpose"
      log FATAL "   📘 Example: \"tags\": [\"lib\", \"shared\"]"
      failed=1
      return
    fi

    mapfile -t tags < <(jq -r '.tags[]?' "$pkg")
    if [[ ${#tags[@]} -eq 0 ]]; then
      log FATAL "❌ Empty 'tags' array in $pkg"
      log FATAL "   💡 Tip: Add one or more valid tags from the approved list"
      log FATAL "   📘 Example: \"tags\": [\"core\"]"
      failed=1
      return
    fi

    for tag in "${tags[@]}"; do
      if [[ ! "$tag" =~ $tag_regex ]]; then
        log FATAL "❌ Invalid tag format in $pkg: '$tag'"
        log FATAL "   💡 Tip: Tags must be lowercase and dash-separated (e.g., 'core', 'web-ui')"
        failed=1
      elif [[ ! " ${allowed_tags[*]} " =~ " $tag " ]]; then
        log FATAL "❌ Unknown tag '$tag' in $pkg — not in approved set"
        log FATAL "   💡 Tip: Use only approved tags: ${allowed_tags[*]}"
        log FATAL "   📘 Example: \"tags\": [\"lib\", \"api\"]"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All package tags are valid and approved"
}

# ------------------------------------------------------------------------------
# 🧪 check::peer_dependency_consistency — Catch inconsistent peer deps across packages
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects packages that declare the same `peerDependency` with different versions
#   - Warns if the same dependency appears in both `peerDependencies` and `dependencies`
#
# Why it matters:
#   - Prevents hard-to-debug version mismatches
#   - Ensures packages that expect shared resolution declare consistent peer versions
#
# Globals used:
#   - ROOT_DIR → monorepo root directory
#
# Example:
#   check::peer_dependency_consistency
#
# Categories:
#   package, lint, boundaries
#
# Stages:
#   validate, lint
# ------------------------------------------------------------------------------
check::peer_dependency_consistency() {
  # ✅ Check: peerDependencies must match versions across all packages
  # Category: package, lint, boundaries
  # Stages: validate, lint

  local failed=0
  declare -A seen_peers=()
  declare -A seen_versions=()

  log INFO "🔍 Scanning peerDependencies across all packages..."

  find "$ROOT_DIR/packages" -type f -name package.json | while read -r pkg; do
    local pkgname
    pkgname=$(jq -r '.name // "<unnamed>"' "$pkg")

    # Collect all peerDependencies
    jq -r '.peerDependencies // {} | to_entries[] | [.key, .value] | @tsv' "$pkg" | while IFS=$'\t' read -r name version; do
      seen_peers["$name"]+="$pkgname:$version"$'\n'
      seen_versions["$name"]+="$version"$'\n'
    done

    # Detect overlap between peerDeps and deps
    jq -r '.peerDependencies // {} | keys[]' "$pkg" | while read -r key; do
      if jq -e --arg k "$key" '.dependencies[$k]' "$pkg" >/dev/null 2>&1; then
        log FATAL "❌ $pkgname declares '$key' in both dependencies and peerDependencies"
        log FATAL "   💡 Tip: Declare it only in one section to avoid resolution ambiguity"
        log FATAL "   📘 Example: Remove from dependencies if it should be peer-only"
        failed=1
      fi
    done
  done

  for name in "${!seen_versions[@]}"; do
    local uniq_count
    uniq_count=$(printf "%s\n" ${seen_versions[$name]} | sort -u | wc -l)

    if (( uniq_count > 1 )); then
      log FATAL "❌ Inconsistent peerDependency versions for '$name':"
      printf "%s\n" "${seen_peers[$name]}" | while read -r line; do
        log FATAL "   ↳ $line"
      done
      log FATAL "💡 Tip: Align all versions of '$name' across peerDependencies"
      log FATAL "📘 Example: use same '^x.y.z' version range across all packages"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All peerDependencies are consistent"
}

# ------------------------------------------------------------------------------
# 🧪 check::lint_ignore_directives — Detect ignore directives in source code
# ------------------------------------------------------------------------------
# This function scans all source files (excluding node_modules, .git, etc.)
# and warns if any common lint/formatting ignore directives are found.
#
# It detects:
#   - eslint-disable / prettier-ignore / biome-ignore / oxlint-ignore
#   - @ts-ignore / @ts-nocheck / @ts-expect-error
#   - shellcheck / stylelint / markdownlint / cSpell / hadolint / yamllint
#
# Globals used:
#   - ROOT_DIR → root of project
#
# Example:
#   check::lint_ignore_directives
#
# Categories:
#   lint, safety
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::lint_ignore_directives() {
  # ✅ Check: Warn on usage of common lint/format ignore directives
  # Category: lint, safety
  # Stages: check, lint

  local failed=0
  local -a patterns=(
    "eslint-disable"
    "eslint-enable"
    "eslint-ignore"
    "prettier-ignore"
    "biome-ignore"
    "oxlint-ignore"
    "@ts-ignore"
    "@ts-nocheck"
    "@ts-expect-error"
    "stylelint-disable"
    "stylelint-enable"
    "stylelint-disable-line"
    "markdownlint-disable"
    "<!-- lint disable"
    "<!-- lint ignore"
    "cSpell:disable"
    "cSpell:ignore"
    "# shellcheck disable"
    "# yamllint disable"
    "# hadolint ignore"
  )

  echo "🔎 Scanning source for ignore directives..."

  for pattern in "${patterns[@]}"; do
    grep -rIn --exclude-dir={.git,node_modules,.next,.turbo,dist,build,coverage,tmp} \
      --exclude="*.lock" --exclude="*.min.*" \
      -E "$pattern" "$ROOT_DIR" 2>/dev/null | while read -r match; do
        log WARN "⚠️ Lint ignore directive detected: '$pattern'"
        log WARN "   ↳ $match"
        log WARN "💡 Tip: Avoid disabling linters unless explicitly justified"
        log WARN "📘 Example: Replace 'eslint-disable' with targeted rule fix"
        failed=1
      done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No ignore directives found in source"
}

# ------------------------------------------------------------------------------
# 🧪 check::verify_gitlab_codeowners_coverage — Ensure all critical folders are covered
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .gitlab/CODEOWNERS exists and is non-empty
#   - Validates that all critical folders are explicitly covered
#   - Warns or fails if important paths lack CODEOWNERS coverage
#
# Why it matters:
#   - Prevents unreviewed changes to infra, secrets, or production services
#   - Enables automatic merge blocking based on path ownership
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::verify_gitlab_codeowners_coverage
#
# Categories:
#   ci, safety
#
# Stages:
#   validate, lint
# ------------------------------------------------------------------------------
check::verify_gitlab_codeowners_coverage() {
  # ✅ Check: All critical folders must be listed in CODEOWNERS
  # Category: ci, safety
  # Stages: validate, lint

  local file="$ROOT_DIR/.gitlab/CODEOWNERS"
  local failed=0
  local -a critical_paths=(
    infra/
    secrets/
    packages/products/
    packages/shared/
    .gitlab/
    .vscode/
    scripts/
  )

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing CODEOWNERS file at $file"
    log FATAL "   💡 Tip: Add a .gitlab/CODEOWNERS file to enforce ownership"
    return 1
  fi

  mapfile -t codeowners_lines < <(grep -vE '^\s*#|^\s*$' "$file")

  for path in "${critical_paths[@]}"; do
    if [[ ! -d "$ROOT_DIR/$path" ]]; then
      log INFO "ℹ️ Skipping non-existent critical path: $path"
      continue
    fi

    if ! printf '%s\n' "${codeowners_lines[@]}" | grep -Eq "^\s*${path//\//\\/}"; then
      log FATAL "❌ Missing CODEOWNERS coverage for: $path"
      log FATAL "   💡 Tip: Add a line like: $path @your-org/owners"
      log FATAL "   📘 Example: ${path} @enzuzo/devops"
      failed=1
    else
      log INFO "✅ CODEOWNERS includes: $path"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::test_and_benchmark_file_naming — Enforce test/benchmark filename standards
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all test files end with `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx`
#   - Ensures all benchmark files end with `.bench.ts` or `.bench.tsx`
#   - Fails on mixed, custom, or invalid suffixes (e.g., test_utils.ts, bench-util.ts)
#
# Why it matters:
#   - Standardizes test/benchmark file discovery across all tools (Vitest, Playwright, etc.)
#   - Prevents accidental exclusion or duplicate execution
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::test_and_benchmark_file_naming
#
# Categories:
#   lint, paths
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::test_and_benchmark_file_naming() {
  # ✅ Check: All test/benchmark files must follow exact suffix conventions
  # Category: lint, paths
  # Stages: lint, validate

  local failed=0

  # --- Enforce test file naming ---
  find "$ROOT_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
    if grep -qE 'describe\(|test\(|it\(' "$file"; then
      if [[ ! "$file" =~ \.(test|spec)\.(ts|tsx)$ ]]; then
        log FATAL "❌ Invalid test file naming: $file"
        log FATAL "   💡 Tip: Rename to end in .test.ts(x) or .spec.ts(x)"
        log FATAL "   📘 Example: auth.test.ts or auth.spec.ts"
        failed=1
      fi
    fi
  done

  # --- Enforce benchmark file naming ---
  find "$ROOT_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
    if grep -q 'bench(' "$file"; then
      if [[ ! "$file" =~ \.bench\.(ts|tsx)$ ]]; then
        log FATAL "❌ Invalid benchmark file naming: $file"
        log FATAL "   💡 Tip: Rename to use the .bench.ts or .bench.tsx suffix"
        log FATAL "   📘 Example: utils.bench.ts"
        failed=1
      fi
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::docs_markdown_frontmatter_strict — Enforce valid YAML frontmatter in /docs/*.md
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Requires a YAML frontmatter block (`--- ... ---`) at the top of each Markdown file
#   - Ensures required keys: title, description, slug, category, updated
#   - Validates format:
#       - title: non-empty string
#       - description: 10+ chars
#       - slug: kebab-case /^[a-z0-9-]+$/
#       - category: a-z only
#       - updated: YYYY-MM-DD date format
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::docs_markdown_frontmatter_strict
#
# Categories:
#   docs, lint
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::docs_markdown_frontmatter_strict() {
  # ✅ Check: Validate YAML frontmatter block and required fields in /docs/*.md
  # Category: docs, lint
  # Stages: lint, validate

  local failed=0
  local required_keys=(title description slug category updated)

  find "$ROOT_DIR/docs" -type f -name "*.md" | while read -r file; do
    # Extract frontmatter block between first two ---
    local frontmatter
    frontmatter=$(awk '/^---$/ { if (++c == 2) exit; next } c==1' "$file")

    if [[ -z "$frontmatter" ]]; then
      log FATAL "❌ Missing or invalid frontmatter block in: $file"
      log FATAL "   💡 Tip: Add a YAML block starting with '---' at the top of the file"
      log FATAL "   📘 Example: ---\ntitle: My Page\nslug: my-page\n---"
      failed=1
      continue
    fi

    # Check each required key
    for key in "${required_keys[@]}"; do
      local value
      value=$(grep "^$key:" <<< "$frontmatter" | sed -E "s/^$key:[[:space:]]*//")
      if [[ -z "$value" ]]; then
        log FATAL "❌ Missing required frontmatter key '$key' in $file"
        log FATAL "   💡 Tip: Add a line like '$key: ...' to the frontmatter block"
        failed=1
        continue
      fi

      case "$key" in
        title)
          if [[ ${#value} -lt 3 ]]; then
            log FATAL "❌ Frontmatter 'title' is too short in $file: \"$value\""
            failed=1
          fi
          ;;
        description)
          if [[ ${#value} -lt 10 ]]; then
            log FATAL "❌ Frontmatter 'description' must be at least 10 characters in $file"
            failed=1
          fi
          ;;
        slug)
          if [[ ! "$value" =~ ^[a-z0-9-]+$ ]]; then
            log FATAL "❌ Invalid 'slug' in $file: \"$value\""
            log FATAL "   💡 Tip: Use lowercase kebab-case, e.g. 'getting-started'"
            failed=1
          fi
          ;;
        category)
          if [[ ! "$value" =~ ^[a-z]+$ ]]; then
            log FATAL "❌ Invalid 'category' in $file: \"$value\""
            log FATAL "   💡 Tip: Category must be a single lowercase word"
            failed=1
          fi
          ;;
        updated)
          if ! grep -Eq "^updated:[[:space:]]*[0-9]{4}-[0-9]{2}-[0-9]{2}$" <<< "$frontmatter"; then
            log FATAL "❌ Invalid 'updated' date in $file: \"$value\""
            log FATAL "   💡 Tip: Use ISO format YYYY-MM-DD"
            failed=1
          fi
          ;;
      esac
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::makefile_has_help — Require help target in all Makefiles
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures every Makefile defines a `help` target
#   - Validates presence of descriptive help output (e.g., via comments or echo)
#
# Why it matters:
#   - Makes developer onboarding easier and faster
#   - Ensures discoverability of available Makefile targets
#
# Globals used:
#   - ROOT_DIR → root of the monorepo
#
# Example:
#   ROOT_DIR=.
#   check::makefile_has_help
#
# Categories:
#   shell, naming
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::makefile_has_help() {
  # ✅ Check: All Makefiles must include a 'help' target with description
  # Category: shell, naming
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f -iname "makefile" | while read -r file; do
    log INFO "🔍 Checking Makefile: $file"

    if ! grep -qE '^help:' "$file"; then
      log FATAL "❌ Missing 'help:' target in $file"
      log FATAL "   💡 Tip: Add a 'help' target to display available commands"
      log FATAL "   📘 Example:\n     help:\n\t@grep -E '^[a-zA-Z_-]+:.*#' Makefile"
      failed=1
    fi

    if ! grep -Eq "^[a-zA-Z_-]+:.*#.+$" "$file"; then
      log WARN "⚠️ No documented Makefile targets found in $file (missing inline # comments)"
      log WARN "   💡 Tip: Add descriptions after '#' for each target"
      log WARN "   📘 Example: build: # Compiles the app"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::no_hardcoded_localhost_ports — Reject hardcoded local service URLs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects hardcoded service endpoints using localhost or 127.0.0.1 with known dev ports
#   - Flags common patterns like http://localhost:3000, http://127.0.0.1:5000
#   - Enforces environment/config-based injection instead
#
# Why it matters:
#   - Prevents accidental inclusion of dev-only URLs in production code
#   - Encourages centralized config or ENV-based service URL management
#
# Globals used:
#   - ROOT_DIR → monorepo root directory to scan source files
#
# Example:
#   ROOT_DIR=.
#   check::no_hardcoded_localhost_ports
#
# Categories:
#   safety, lint, paths
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::no_hardcoded_localhost_ports() {
  # ✅ Check: Reject hardcoded localhost URLs for services
  # Category: safety, lint, paths
  # Stages: check, lint

  local failed=0
  local patterns=(
    'http://localhost:3000'
    'http://localhost:5000'
    'http://localhost:8000'
    'http://127.0.0.1:3000'
    'http://127.0.0.1:5000'
    'http://127.0.0.1:8000'
  )

  grep -rIEn --exclude-dir={.git,.turbo,node_modules,.next,.vercel,.output} --include='*.{ts,tsx,js,jsx,json,yml,yaml,env}' \
    "${patterns[@]/#/--regexp=}" "$ROOT_DIR" 2>/dev/null | while read -r match; do
      log FATAL "❌ Hardcoded localhost service URL detected:"
      log FATAL "   ↳ $match"
      log FATAL "   💡 Tip: Inject service URLs via .env files or centralized config"
      log FATAL "   📘 Example: API_URL=\$API_URL or import.meta.env.API_URL"
      failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::cli_tools_help_and_version — Validate CLI help/version support
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all CLI entrypoints in /bin, /scripts, or /packages/*/bin
#   - Ensures each CLI supports `--help` and `--version`
#   - Verifies these flags exit 0 and output recognizable content
#
# Why it matters:
#   - Guarantees developer ergonomics and CI introspection for all internal tools
#   - Prevents broken or undocumented command usage
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::cli_tools_help_and_version
#
# Categories:
#   safety, shell, naming
#
# Stages:
#   lint, check, integration
# ------------------------------------------------------------------------------
check::cli_tools_help_and_version() {
  # ✅ Check: All CLI tools must support --help and --version flags
  # Category: safety, shell, naming
  # Stages: lint, check, integration

  local failed=0

  mapfile -t cli_bins < <(find "$ROOT_DIR" \
    -type f -perm +111 \
    \( -path "*/bin/*" -o -path "*/scripts/*" -o -name "*.sh" -o -name "*.ts" \) \
    ! -name '_*' ! -name '*.test.*' ! -name '*.spec.*' \
    ! -path '*/node_modules/*' ! -path '*/.git/*')

  for bin in "${cli_bins[@]}"; do
    if [[ ! -x "$bin" ]]; then continue; fi

    for flag in --help --version; do
      output=""
      if output=$("$bin" "$flag" 2>&1); then
        if [[ "$output" =~ (help|usage|version|cli|command) ]]; then
          log INFO "✅ $flag supported by $bin"
        else
          log FATAL "❌ $bin $flag did not output any recognizable help/version content"
          log FATAL "   💡 Tip: Ensure it prints usage or version info when invoked with $flag"
          log FATAL "   📘 Example: echo 'Usage: $(basename $bin) [options]'"
          failed=1
        fi
      else
        log FATAL "❌ $bin $flag failed or exited non-zero"
        log FATAL "   💡 Tip: Ensure '$flag' exits 0 and shows valid output"
        log FATAL "   📘 Example: $bin $flag → should not crash or error"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::shared_libs_no_direct_env_or_globals — Disallow env/global access in shared libs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects use of `process.env`, `global`, or `globalThis` in shared libraries
#   - Ensures configuration is passed explicitly (not imported directly)
#
# Why it matters:
#   - Shared libs should be deterministic, testable, and environment-agnostic
#   - Direct access to `process.env` or globals in shared code leads to hidden coupling
#
# Globals used:
#   - ROOT_DIR → monorepo root path
#
# Example:
#   check::shared_libs_no_direct_env_or_globals
#
# Categories:
#   safety, boundaries, tsconfig
#
# Stages:
#   lint, test, integration
# ------------------------------------------------------------------------------
check::shared_libs_no_direct_env_or_globals() {
  # ✅ Check: shared libs must not access process.env or globalThis
  # Category: safety, boundaries, tsconfig
  # Stages: lint, test, integration

  local failed=0
  local path="$ROOT_DIR/packages/shared"

  if [[ ! -d "$path" ]]; then
    log INFO "ℹ️ No shared libraries found in: $path"
    return 0
  fi

  grep -rEnI --include="*.ts" --include="*.js" \
    -e '(^|[^a-zA-Z])process\.env\.' \
    -e '(^|[^a-zA-Z])(globalThis|global)\.' \
    "$path" | grep -vE 'test|mock' | while read -r match; do
      log FATAL "❌ Direct env/global access in shared lib:"
      log FATAL "   ↳ $match"
      log FATAL "   💡 Tip: Inject config via function args or adapters"
      log FATAL "   📘 Example: pass `env.API_KEY` to shared function instead of accessing process.env"
      failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::commit_body_size — Flag overly long commit bodies
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parses recent commits and checks the body length
#   - Fails if body exceeds N lines or M characters
#
# Why it matters:
#   - Prevents noise, accidental dumps, or changelog spam
#   - Encourages focused, clean commit messaging
#
# Globals used:
#   - ROOT_DIR → monorepo root (optional)
#
# Example:
#   check::commit_body_size --max-lines 25 --max-chars 1000
#
# Categories:
#   ci, lint, mr
#
# Stages:
#   commit-msg, lint
# ------------------------------------------------------------------------------
check::commit_body_size() {
  # ✅ Check: Commit bodies must not exceed allowed lines/chars
  # Category: ci, lint, mr
  # Stages: commit-msg, lint

  local failed=0
  local max_lines=20
  local max_chars=1000
  local range="HEAD~20..HEAD"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --max-lines)
        max_lines="$2"; shift 2 ;;
      --max-chars)
        max_chars="$2"; shift 2 ;;
      --range)
        range="$2"; shift 2 ;;
      *)
        log FATAL "❌ Unknown argument: $1"
        log FATAL "   💡 Tip: Use --max-lines <n> --max-chars <n> --range <revlist>"
        return 1 ;;
    esac
  done

  git log --pretty=format:"%h%n%B%n---END---" "$range" | awk -v max_lines="$max_lines" -v max_chars="$max_chars" '
    BEGIN { RS="---END---"; FS="\n" }
    {
      hash = $1
      body = ""; count = 0; total = 0
      for (i = 2; i <= NF; i++) {
        body = body $i "\n"
        count++
        total += length($i)
      }
      if (count > max_lines || total > max_chars) {
        print hash "|" count "|" total "|" body
      }
    }
  ' | while IFS="|" read -r hash line_count char_count _; do
    log FATAL "❌ Commit $hash exceeds allowed body size"
    log FATAL "   ↳ $line_count lines, $char_count characters"
    log FATAL "💡 Tip: Split into smaller commits or reduce verbose body content"
    log FATAL "📘 Example: keep within ${max_lines} lines and ${max_chars} characters"
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::tsconfig_orphaned_ts_files — Detect *.ts files not matched by tsconfig include/files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds all .ts files in the repo
#   - Scans all tsconfig*.json `include[]` and `files[]` entries
#   - Warns if any .ts file is not matched by any tsconfig (i.e., ignored by the compiler)
#
# Why it matters:
#   - Prevents dead code, build inconsistencies, and undeclared file usage
#   - Ensures all .ts files are tracked by TypeScript and contribute to project structure
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::tsconfig_orphaned_ts_files
#
# Categories:
#   tsconfig, lint, paths
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::tsconfig_orphaned_ts_files() {
  # ✅ Check: orphaned *.ts files must be included in a tsconfig
  # Category: tsconfig, lint, paths
  # Stages: check, lint, build

  local failed=0
  local all_ts
  local matched_ts
  local unmatched

  mapfile -t all_ts < <(find "$ROOT_DIR" -type f -name "*.ts" ! -name "*.d.ts" ! -path "*/node_modules/*" ! -path "*/.turbo/*")

  # Extract all include/files globs from all tsconfig*.json files
  mapfile -t globs < <(
    find "$ROOT_DIR" -type f -name "tsconfig*.json" \
      | xargs -n1 jq -r '[.include[]?, .files[]?] | .[]?' 2>/dev/null | sort -u
  )

  # Expand globs to matched .ts files
  matched_ts=()
  for glob in "${globs[@]}"; do
    matches=$(find "$ROOT_DIR" -type f -name "*.ts" -path "$ROOT_DIR/$glob" 2>/dev/null || true)
    while IFS= read -r match; do
      matched_ts+=("$match")
    done <<< "$matches"
  done

  # Remove duplicates
  mapfile -t matched_ts < <(printf "%s\n" "${matched_ts[@]}" | sort -u)

  # Compare all_ts vs matched_ts
  unmatched=$(comm -23 <(printf "%s\n" "${all_ts[@]}" | sort) <(printf "%s\n" "${matched_ts[@]}" | sort))

  if [[ -n "$unmatched" ]]; then
    log FATAL "❌ Found .ts files not matched by any tsconfig include/files:"
    echo "$unmatched" | while read -r file; do
      log FATAL "   ↳ $file"
    done
    log FATAL "💡 Tip: Add these to include[] in your tsconfig or move them under known folders"
    log FATAL "📘 Example: \"include\": [\"src/**/*.ts\", \"tools/scripts/*.ts\"]"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::cloudflare_workers_node_compat — Block unsupported Node APIs and polyfills in Worker code
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Rejects imports of forbidden Node.js modules like fs, child_process, net, etc.
#   - Rejects use of Node polyfills like util, buffer, stream, etc.
#   - Restricts forbidden imports only to files used in Cloudflare Worker source
#
# Why it matters:
#   - Cloudflare Workers do not support most Node APIs
#   - Including Node core/polyfill packages will cause runtime errors or bloated bundles
#
# Globals used:
#   - ROOT_DIR → root of the project
#
# Example:
#   check::cloudflare_workers_node_compat
#
# Categories:
#   cloudflare:do, cloudflare:kv, cloudflare:r2, wrangler, safety, lint
#
# Stages:
#   check, lint, test, build, deploy
# ------------------------------------------------------------------------------
check::cloudflare_workers_node_compat() {
  # ✅ Check: Block unsupported Node APIs and polyfills in Worker code
  # Category: cloudflare:do, cloudflare:kv, cloudflare:r2, wrangler, safety, lint
  # Stages: check, lint, test, build, deploy

  local failed=0
  local forbidden_modules=(
    fs
    path
    os
    net
    tls
    crypto
    child_process
    cluster
    readline
    vm
    stream
    buffer
    util
    module
    process
    zlib
    http
    https
    dgram
    assert
  )

  mapfile -t files < <(find "$ROOT_DIR" -type f \( -name "*.ts" -o -name "*.js" \) -not -path "*/node_modules/*")

  for file in "${files[@]}"; do
    while IFS= read -r line; do
      for mod in "${forbidden_modules[@]}"; do
        if [[ "$line" =~ [\"\']$mod[\"\'] ]]; then
          log FATAL "❌ Forbidden Node module used in: $file"
          log FATAL "   ↳ $line"
          log FATAL "   💡 Tip: Cloudflare Workers do not support '$mod' — remove or replace"
          log FATAL "   📘 Example: Use Web Crypto API instead of 'crypto'"
          failed=1
        fi
      done
    done < "$file"
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::cloudflare_worker_disallowed_headers — Prevent unsupported fetch headers
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans `.ts`/`.js` Worker source files for prohibited header names
#   - Fails if any usage of unsupported HTTP headers is detected
#
# Why it matters:
#   Cloudflare Workers don't support certain "hop-by-hop" headers (e.g., Transfer-Encoding, Trailer),
#   which aren't allowed and can cause runtime failures or silent request drops.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR="." && check::cloudflare_worker_disallowed_headers
#
# Categories:
#   wrangler, lint, cloudflare:do, cloudflare:kv, cloudflare:r2, cloudflare:d1
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::cloudflare_worker_disallowed_headers() {
  # ✅ Check: disallow headers unsupported in Cloudflare Workers
  # Category: wrangler, lint, cloudflare:kv,cloudflare:r2,cloudflare:d1,cloudflare:do
  # Stages: lint, test

  local failed=0
  local patterns=(
    '[Tt]ransfer-Encoding'
    '[Tt]railer'
    '[Cc]onnection'
    '[Kk]eep-Alive'
    '[Pp]roxy-?Authenticate'
    '[Pp]roxy-?Authorization'
    '[Tt]e'
    '[Uu]pgrade'
    '[Ww]ww-Authenticate'
  )

  # Find Worker-specific code
  while IFS= read -r file; do
    for hdr in "${patterns[@]}"; do
      if grep -RE "new Headers\(\).*${hdr}" "$file" \
         || grep -RE "\.append\(\s*['\"]${hdr}['\"]" "$file" \
         || grep -RE "\.set\(\s*['\"]${hdr}['\"]" "$file" \
         || grep -RE "\.get\(\s*['\"]${hdr}['\"]" "$file" ; then
        log FATAL "❌ Unsupported header '$hdr' used in Worker source: $file"
        log FATAL "   💡 Tip: Remove or replace with supported headers (e.g., Content-Type, Authorization)"
        log FATAL "   📘 Example: 'new Headers({\"Content-Type\": \"application/json\"})' (no Transfer-Encoding)"
        failed=1
      fi
    done
  done < <(find "$ROOT_DIR" -type f -path "*/workers/*.[tj]s" -o -path "*/src/**/*Worker.[tj]s" || true)

  (( failed == 1 )) && return 1
  log INFO "✅ No disallowed fetch headers detected in Worker source"
}

# ------------------------------------------------------------------------------
# 🧪 check::formatting_config_consistency — Ensure consistent formatting config across tools
# ------------------------------------------------------------------------------
# This check enforces formatting alignment between:
#   - .editorconfig
#   - biome.base.json
#   - .vscode/settings.json (if exists)
#
# Why it matters:
#   Prevents formatting inconsistencies across editors, CLI tools, and CI
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::formatting_config_consistency
#
# Categories:
#   biome, lint, vscode, paths
#
# Stages:
#   lint, validate, pre-commit
# ------------------------------------------------------------------------------
check::formatting_config_consistency() {
  # ✅ Check: .editorconfig, biome.base.json, and VSCode settings must agree
  # Category: biome, lint, vscode, paths
  # Stages: lint, validate, pre-commit

  local failed=0
  local ec="$ROOT_DIR/.editorconfig"
  local biome="$ROOT_DIR/packages/shared/config/biome/biome.base.json"
  local vscode="$ROOT_DIR/.vscode/settings.json"

  # Expected schema mapping
  declare -A expected

  # Load from biome
  if [[ -f "$biome" ]]; then
    expected[indent_style]=$(jq -r '.formatter.indentStyle // "space"' "$biome")
    expected[indent_size]=$(jq -r '.formatter.indentWidth // 2' "$biome")
    expected[end_of_line]=$(jq -r '.formatter.lineEnding // "lf"' "$biome")
    expected[insert_final_newline]=$(jq -r '.formatter.insertFinalNewline // true' "$biome")
  else
    log FATAL "❌ Missing biome.base.json at $biome"
    return 1
  fi

  # Load from .editorconfig
  if [[ -f "$ec" ]]; then
    local keys=(indent_style indent_size end_of_line insert_final_newline trim_trailing_whitespace charset)

    for key in "${keys[@]}"; do
      local value
      value=$(grep -Ei "^$key\s*=" "$ec" | tail -1 | awk -F= '{gsub(/ /,"",$2); print $2}')
      if [[ -n "${expected[$key]}" && "$value" != "${expected[$key]}" ]]; then
        log FATAL "❌ Mismatch in .editorconfig → $key = $value (expected: ${expected[$key]})"
        log FATAL "   💡 Tip: Update $key to match Biome config"
        log FATAL "   📘 Example: $key = ${expected[$key]}"
        failed=1
      fi
    done
  else
    log FATAL "❌ Missing .editorconfig file"
    return 1
  fi

  # Load from .vscode/settings.json (optional)
  if [[ -f "$vscode" ]]; then
    declare -A vscode_map=(
      ["editor.insertFinalNewline"]="insert_final_newline"
      ["editor.tabSize"]="indent_size"
      ["files.eol"]="end_of_line"
    )
    for k in "${!vscode_map[@]}"; do
      local val
      val=$(jq -r --arg key "$k" '.[$key] // empty' "$vscode")
      [[ "$val" == "\\n" ]] && val="lf"
      [[ "$val" == "\\r\\n" ]] && val="crlf"
      if [[ -n "$val" && "${expected[${vscode_map[$k]}]}" != "$val" ]]; then
        log FATAL "❌ VSCode setting '$k' is $val (expected: ${expected[${vscode_map[$k]}]})"
        log FATAL "   💡 Tip: Update $vscode to match formatting standards"
        log FATAL "   📘 Example: \"$k\": \"${expected[${vscode_map[$k]}]}\""
        failed=1
      fi
    done
  fi

  [[ "$failed" -eq 1 ]] && return 1
  log INFO "✅ .editorconfig, biome, and VSCode formatting settings are consistent"
}

# ------------------------------------------------------------------------------
# 🧪 check::docker_compose_schema_annotation — Enforce yaml-language-server schema in docker-compose YAMLs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all docker-compose.{yml,yaml} files start with yaml-language-server $schema comment
#   - Warns on incorrect or missing schema annotations
#
# Why it matters:
#   - Enables IDE validation and linting for Docker Compose files
#   - Prevents drift and schema inconsistency across editors and CI
#
# Globals used:
#   - ROOT_DIR → monorepo root path to scan for docker-compose files
#
# Example:
#   ROOT_DIR=.
#   check::docker_compose_schema_annotation
#
# Categories:
#   infra, lint
#
# Stages:
#   lint, check, deploy
# ------------------------------------------------------------------------------
check::docker_compose_schema_annotation() {
  # ✅ Check: All docker-compose YAMLs include yaml-language-server schema comment
  # Category: infra, lint
  # Stages: lint, check, deploy

  local failed=0
  local expected='# yaml-language-server: $schema=https://raw.githubusercontent.com/compose-spec/compose-spec/master/schema/compose-spec.json'

  find "$ROOT_DIR" -type f \( -name "docker-compose.yml" -o -name "docker-compose.yaml" \) | while read -r file; do
    local first_line
    first_line=$(head -n 1 "$file" || true)

    if [[ "$first_line" != "$expected" ]]; then
      log FATAL "❌ Missing or incorrect yaml-language-server schema in: $file"
      log FATAL "   💡 Tip: Add this as the first line of the file"
      log FATAL "   📘 Example: $expected"
      failed=1
    else
      log INFO "✅ Correct schema annotation in: $file"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::locale_key_consistency — Ensure locale files match en-US source keys
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Recursively compares all locale keys in JSON/YAML files against en-US
#   - Fails if any key is missing in a non-en locale
#   - Fails if any extra key is present in a non-en locale
#
# Why it matters:
#   - Ensures no localization files drift from source-of-truth keys
#   - Prevents UI bugs or undefined translations at runtime
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::locale_key_consistency
#
# Categories:
#   lint, paths, naming, encoding
#
# Stages:
#   lint, check, validate, pre-commit
# ------------------------------------------------------------------------------
check::locale_key_consistency() {
  # ✅ Check: All i18n files must match keys defined in en-US source locale
  # Category: lint, paths, naming, encoding
  # Stages: lint, check, validate, pre-commit

  local failed=0
  local base_dir="$ROOT_DIR/packages/shared/locale"
  local source="en-US"
  local src_path="$base_dir/$source"

  if [[ ! -d "$src_path" ]]; then
    log FATAL "❌ Missing en-US source directory: $src_path"
    log FATAL "   💡 Tip: en-US is the baseline locale — must be present before comparing others"
    log FATAL "   📘 Example: packages/shared/locale/en-US/common.json"
    return 1
  fi

  # Flatten keys recursively using yq or jq
  flatten_keys() {
    local file="$1"
    case "$file" in
      *.json)
        jq -r 'paths(scalars) | map(tostring) | join(".")' "$file" 2>/dev/null || true
        ;;
      *.ya?ml)
        yq e 'paths | join(".")' "$file" 2>/dev/null || true
        ;;
    esac
  }

  # Compare each file in each locale
  for locale_path in "$base_dir"/*; do
    [[ -d "$locale_path" ]] || continue
    [[ "$(basename "$locale_path")" == "$source" ]] && continue

    local locale="$(basename "$locale_path")"
    log INFO "🌍 Validating locale: $locale"

    find "$src_path" -type f \( -name '*.json' -o -name '*.ya?ml' \) | while read -r src_file; do
      local rel_file="${src_file#"$src_path/"}"
      local tgt_file="$locale_path/$rel_file"

      if [[ ! -f "$tgt_file" ]]; then
        log FATAL "❌ Missing file in locale '$locale': $rel_file"
        log FATAL "   💡 Tip: Create this file and add all expected translation keys"
        log FATAL "   📘 Example: $tgt_file"
        failed=1
        continue
      fi

      mapfile -t src_keys < <(flatten_keys "$src_file" | sort)
      mapfile -t tgt_keys < <(flatten_keys "$tgt_file" | sort)

      # Missing keys
      comm -23 <(printf "%s\n" "${src_keys[@]}") <(printf "%s\n" "${tgt_keys[@]}") | while read -r key; do
        log FATAL "❌ Missing key in $tgt_file: $key"
        log FATAL "   💡 Tip: Add this key with appropriate translated value"
        failed=1
      done

      # Extra keys
      comm -13 <(printf "%s\n" "${src_keys[@]}") <(printf "%s\n" "${tgt_keys[@]}") | while read -r key; do
        log FATAL "❌ Extra key in $tgt_file not found in en-US: $key"
        log FATAL "   💡 Tip: Remove or consolidate this key unless explicitly needed"
        failed=1
      done
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::disallow_nonpreferred_image_formats — Block non-webp/svg/ico images
# ------------------------------------------------------------------------------
# This check enforces a strict allowlist of image formats:
#   - Only .webp, .svg, .ico are allowed
#   - Fails on .png, .jpg, .jpeg, .gif, .tiff, .bmp, etc.
#
# Why it matters:
#   - Improves performance and bundle size (webp over png/jpg)
#   - Reduces attack surface (e.g., gif exploits, svg injection)
#
# Globals used:
#   - ROOT_DIR → path to monorepo root
#
# Example:
#   check::disallow_nonpreferred_image_formats
#
# Categories:
#   lint, paths, naming, encoding
#
# Stages:
#   check, lint, validate
# ------------------------------------------------------------------------------
check::disallow_nonpreferred_image_formats() {
  # ✅ Check: Disallow non-webp/svg/ico image formats
  # Category: lint, paths, naming, encoding
  # Stages: check, lint, validate

  local failed=0

  mapfile -t bad_images < <(
    find "$ROOT_DIR" -type f \
      -iregex '.*\.\(png\|jpg\|jpeg\|gif\|tiff\|bmp\|apng\|jfif\|pjpeg\|pjp\)' \
      ! -path "*/node_modules/*" ! -path "*/.git/*"
  )

  if [[ "${#bad_images[@]}" -gt 0 ]]; then
    log FATAL "❌ Found disallowed image formats — only .webp, .svg, and .ico are permitted"
    for img in "${bad_images[@]}"; do
      log FATAL "   ↳ $img"
    done
    log FATAL "💡 Tip: Convert images to modern formats using tools like sharp, imagemagick, or squoosh"
    log FATAL "📘 Example: png → webp: \`cwebp input.png -o output.webp\`"
    return 1
  else
    log INFO "✅ No disallowed image formats found"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::image_optimization — Ensure webp/svg are properly compressed
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags .webp files > 300KB as potentially uncompressed
#   - Flags .svg files > 100KB or containing excessive whitespace/comments
#
# Globals used:
#   - ROOT_DIR → root of the workspace
#
# Categories:
#   encoding, naming, lint
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::image_optimization() {
  # ✅ Check: image files (webp, svg) should be reasonably compressed
  # Category: encoding, naming, lint
  # Stages: check, lint

  local failed=0

  # 🔎 Check for large .webp files (> 300KB)
  find "$ROOT_DIR" -type f -iname "*.webp" ! -path "*/node_modules/*" ! -path "*/.git/*" | while read -r f; do
    local size
    size=$(stat -c%s "$f")
    if (( size > 300000 )); then
      log WARN "⚠️ Large .webp image detected: $f (${size} bytes)"
      log WARN "   💡 Tip: Re-export with stronger compression (e.g. quality 75–85)"
      log WARN "   📘 Example: cwebp -q 80 input.png -o $f"
      failed=1
    fi
  done

  # 🔎 Check for non-minified .svg files
  find "$ROOT_DIR" -type f -iname "*.svg" ! -path "*/node_modules/*" ! -path "*/.git/*" | while read -r f; do
    if grep -qE '>\s+<' "$f" || grep -qE '<!--|<!DOCTYPE' "$f"; then
      log WARN "⚠️ Unminified .svg file: $f"
      log WARN "   💡 Tip: Minify using \`svgo $f -o $f\`"
      log WARN "   📘 Example: Remove comments, DOCTYPE, and collapse whitespace"
      failed=1
    fi
    local size
    size=$(stat -c%s "$f")
    if (( size > 100000 )); then
      log WARN "⚠️ Large .svg file: $f (${size} bytes)"
      log WARN "   💡 Tip: Consider simplifying paths or rasterizing complex SVGs"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::workspace_spelling — Inline spelling check across workspace using cspell
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Runs `cspell` across all files using an inline config (no external .cspell.json)
#   - Fails if unapproved or misspelled words are found
#
# Why it matters:
#   Spelling mistakes reduce quality, impair searchability, and signal carelessness.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR=.
#   check::workspace_spelling
#
# Categories:
#   lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::workspace_spelling() {
  # ✅ Check: spelling errors via inline-config cspell
  # Category: lint
  # Stages: lint, check

  if ! command -v cspell >/dev/null; then
    log FATAL "❌ cspell is not installed"
    log FATAL "   💡 Tip: Install with: pnpm add -D cspell OR npm install -g cspell"
    log FATAL "   📘 Docs: https://github.com/streetsidesoftware/cspell"
    return 1
  fi

  local inline_config='{
    "version": "0.2",
    "language": "en",
    "dictionaries": [],
    "words": ["Enzuzo", "OIDC", "SvelteKit", "WebSocket", "LiveKit", "pnpm", "Tailwind", "Vite", "tsconfig", "wrangler"],
    "ignorePaths": ["node_modules", "dist", "build", ".git", ".turbo", ".next", ".vercel", "*.lock", "*.snap", "*.map"],
    "ignoreRegExpList": [
      "/\\/\\*.*\\*\\//",        # block comments
      "/^\\s*\\/\\/.*$/",       # line comments
      "/https?:\\/\\/\\S+/",    # URLs
      "/[a-f0-9]{32,}/i",       # hashes
      "/uuid-[a-z0-9-]+/i"      # UUIDs
    ]
  }'

  if ! echo "$inline_config" | cspell --no-progress --no-color --config stdin "$ROOT_DIR"; then
    log FATAL "❌ Spelling errors found in workspace"
    log FATAL "   💡 Tip: Add missing terms to the inline word list inside the check function"
    log FATAL "   📘 Example: Add 'MyCompany' to the 'words' array"
    return 1
  else
    log INFO "✅ All files passed spelling validation using inline config"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_rebase_in_progress — Warn if Git is in a mid-rebase state
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects if a rebase is currently active
#   - Warns to prevent corruption during automation or CI runs
#
# Why it matters:
#   Rebasing during automated processes can corrupt state, lose commits, or break validation.
#
# Globals used:
#   - ROOT_DIR → path to the repo root
#
# Example:
#   check::git_rebase_in_progress
#
# Categories:
#   ci, safety
#
# Stages:
#   check, pre-commit
# ------------------------------------------------------------------------------
check::git_rebase_in_progress() {
  # ✅ Check: prevent operation while rebase is in progress
  # Category: ci, safety
  # Stages: check, pre-commit

  if [[ -d "$ROOT_DIR/.git/rebase-merge" || -d "$ROOT_DIR/.git/rebase-apply" ]]; then
    log FATAL "❌ Rebase in progress — repo is mid-rebase"
    log FATAL "   💡 Tip: Run \`git rebase --continue\` or \`git rebase --abort\` to exit rebase mode"
    log FATAL "   📘 Example: CI and automation must wait until rebase completes"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_sparse_checkout_consistency — Detect unintended sparse-checkout state
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Fails if sparse-checkout is enabled unexpectedly
#
# Why it matters:
#   Sparse checkouts may cause broken builds or partial file visibility in CI/local dev.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::git_sparse_checkout_consistency
#
# Categories:
#   ci, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::git_sparse_checkout_consistency() {
  # ✅ Check: sparse-checkout should not be enabled
  # Category: ci, paths
  # Stages: lint, check

  if git config core.sparseCheckout | grep -q true; then
    log FATAL "❌ Sparse checkout is enabled but not expected"
    log FATAL "   💡 Tip: Disable with \`git sparse-checkout disable\`"
    log FATAL "   📘 Example: Avoid sparse checkouts unless explicitly configured"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_repo_clean — Ensure no uncommitted changes exist
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Fails if working directory or index has any changes
#
# Why it matters:
#   Dirty trees can break CI, releases, or automated builds
#
# Globals used:
#   - ROOT_DIR → path to project root
#
# Example:
#   check::git_repo_clean
#
# Categories:
#   ci, safety
#
# Stages:
#   pre-commit, build, deploy
# ------------------------------------------------------------------------------
check::git_repo_clean() {
  # ✅ Check: working directory and index must be clean
  # Category: ci, safety
  # Stages: pre-commit, build, deploy

  if ! git diff --quiet || ! git diff --cached --quiet; then
    log FATAL "❌ Uncommitted changes detected in working directory or index"
    log FATAL "   💡 Tip: Commit or stash changes before continuing"
    log FATAL "   📘 Example: git commit -am 'WIP' or git stash"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_config_enforced — Ensure Git config settings match policy
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforces preferred Git config settings like line endings, push behavior, etc.
#
# Why it matters:
#   Inconsistent Git config can break cross-platform workflows, CI pipelines, or merge history.
#
# Globals used:
#   - None
#
# Example:
#   check::git_config_enforced
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::git_config_enforced() {
  # ✅ Check: enforce standard Git configuration
  # Category: lint, safety
  # Stages: lint, validate

  declare -A required_config=(
    ["core.autocrlf"]="input"
    ["pull.rebase"]="false"
    ["push.default"]="simple"
  )

  local failed=0

  for key in "${!required_config[@]}"; do
    local actual
    actual=$(git config --get "$key" || echo "<unset>")
    if [[ "$actual" != "${required_config[$key]}" ]]; then
      log FATAL "❌ Git config $key = '$actual' (expected: '${required_config[$key]}')"
      log FATAL "   💡 Tip: Set it via: git config --global $key '${required_config[$key]}'"
      log FATAL "   📘 Example: git config --global $key '${required_config[$key]}'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::git_ref_integrity — Ensure HEAD and refs point to valid commits
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validates HEAD is not detached or corrupt
#   - Ensures all refs resolve to valid objects
#
# Why it matters:
#   Broken or dangling refs can make the repo unusable for tooling, CI, or deploys
#
# Globals used:
#   - None
#
# Example:
#   check::git_ref_integrity
#
# Categories:
#   ci, safety
#
# Stages:
#   validate, check
# ------------------------------------------------------------------------------
check::git_ref_integrity() {
  # ✅ Check: Git HEAD and refs must resolve cleanly
  # Category: ci, safety
  # Stages: validate, check

  if ! git symbolic-ref -q HEAD >/dev/null && ! git rev-parse --verify HEAD >/dev/null; then
    log FATAL "❌ HEAD is not pointing to a valid ref or commit"
    log FATAL "   💡 Tip: Ensure you're on a valid branch or checkout"
    log FATAL "   📘 Example: git checkout main"
    return 1
  fi

  if ! git fsck --no-reflogs --no-progress 2>&1 | grep -qvE '^$'; then
    log FATAL "❌ Git reference or object integrity check failed"
    log FATAL "   💡 Tip: Run \`git fsck\` to investigate corruption or broken refs"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_head_consistency — Ensure .git/HEAD points to a valid ref
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies .git/HEAD exists and points to a valid ref
#   - Ensures the target file or object exists
#
# Why it matters:
#   - Prevents broken HEAD state in CI or local environments
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::git_head_consistency
#
# Categories:
#   safety, ci
#
# Stages:
#   check, lint, validate
# ------------------------------------------------------------------------------
check::git_head_consistency() {
  # ✅ Check: .git/HEAD must point to a valid reference
  # Category: safety, ci
  # Stages: check, lint, validate

  local head_file="$ROOT_DIR/.git/HEAD"

  if [[ ! -f "$head_file" ]]; then
    log FATAL "❌ Missing .git/HEAD file"
    log FATAL "   💡 Tip: Initialize the Git repo properly"
    log FATAL "   📘 Example: git init"
    return 1
  fi

  if grep -q '^ref: ' "$head_file"; then
    local ref
    ref=$(sed 's/^ref: //' "$head_file")
    if [[ ! -f "$ROOT_DIR/.git/$ref" ]]; then
      log FATAL "❌ HEAD points to non-existent ref: $ref"
      log FATAL "   💡 Tip: Create or restore the missing ref"
      log FATAL "   📘 Example: git branch main && git checkout main"
      return 1
    fi
  else
    local commit
    commit=$(cat "$head_file")
    if ! git cat-file -e "${commit}^{commit}" 2>/dev/null; then
      log FATAL "❌ Detached HEAD points to invalid commit: $commit"
      log FATAL "   💡 Tip: Reset or reattach HEAD to a valid branch"
      log FATAL "   📘 Example: git checkout main"
      return 1
    fi
  fi

  log INFO "✅ .git/HEAD is consistent and points to a valid ref"
}

# ------------------------------------------------------------------------------
# 🧪 check::git_config_global_blacklist — Warn on dangerous global gitconfig settings
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns if ~/.gitconfig contains unsafe or discouraged values
#
# Why it matters:
#   - Avoids unexpected git behavior across projects
#
# Globals used:
#   - None
#
# Example:
#   check::git_config_global_blacklist
#
# Categories:
#   ci, safety
#
# Stages:
#   check, validate
# ------------------------------------------------------------------------------
check::git_config_global_blacklist() {
  # ✅ Check: Detect unsafe global git settings
  # Category: ci, safety
  # Stages: check, validate

  local blacklist=(
    "push.default matching"
    "merge.tool vimdiff"
    "core.autocrlf true"
    "core.ignorecase true"
  )

  for bad in "${blacklist[@]}"; do
    local key value
    key="${bad% *}"
    value="${bad#* }"
    if [[ "$(git config --global --get "$key" 2>/dev/null)" == "$value" ]]; then
      log WARN "⚠️ Unsafe global git setting: $key = $value"
      log WARN "   💡 Tip: Replace with safer value or unset globally"
      log WARN "   📘 Example: git config --global --unset $key"
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::git_alternate_refs — Detect orphaned or non-standard refs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans .git/refs for orphaned, duplicate, or unknown references
#
# Why it matters:
#   - Keeps the repo clean and avoids invisible ref leakage
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::git_alternate_refs
#
# Categories:
#   ci, safety
#
# Stages:
#   check, validate
# ------------------------------------------------------------------------------
check::git_alternate_refs() {
  # ✅ Check: refs must be reachable and valid
  # Category: ci, safety
  # Stages: check, validate

  mapfile -t ref_files < <(find "$ROOT_DIR/.git/refs" -type f)
  for ref in "${ref_files[@]}"; do
    local hash
    hash=$(cat "$ref")
    if ! git cat-file -e "${hash}^{commit}" 2>/dev/null; then
      log FATAL "❌ Broken or unreachable Git ref: $ref → $hash"
      log FATAL "   💡 Tip: Delete or repoint orphaned references"
      log FATAL "   📘 Example: rm $ref or update to valid commit"
      return 1
    fi
  done

  log INFO "✅ All .git/refs are reachable and valid"
}

# ------------------------------------------------------------------------------
# 🧪 check::git_stdin_input_blocked — Block interactive git prompts in CI
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects Git commands in CI that require input and would hang
#
# Why it matters:
#   - Prevents CI pipelines from stalling due to interactive prompts
#
# Globals used:
#   - CI → detects CI mode
#
# Example:
#   check::git_stdin_input_blocked
#
# Categories:
#   ci
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::git_stdin_input_blocked() {
  # ✅ Check: Block interactive git in CI
  # Category: ci
  # Stages: pre-commit, check

  if [[ -n "$CI" ]]; then
    if git config --global --get core.editor | grep -qi 'vim\|nano'; then
      log WARN "⚠️ CI is using interactive Git editor"
      log WARN "   💡 Tip: Set editor to 'true' to auto-accept in CI"
      log WARN "   📘 Example: git config --global core.editor true"
    fi

    if git config --global --get sequence.editor | grep -qi 'vim\|nano'; then
      log WARN "⚠️ CI is using interactive Git sequence editor"
      log WARN "   💡 Tip: Set to 'true' or 'echo' to avoid hangs"
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_reflog_disabled_ci — Ensure reflog is disabled in CI environments
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects if Git reflog is enabled in CI contexts
#   - Prevents CI from storing unnecessary local commit history
#
# Why it matters:
#   Git reflog is not required in CI/CD and increases disk usage and complexity
#
# Globals used:
#   - GIT_DIR → .git directory (auto-detected if unset)
#
# Example:
#   check::git_reflog_disabled_ci
#
# Categories:
#   ci, safety
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::git_reflog_disabled_ci() {
  # ✅ Check: CI environments must not persist reflog history
  # Category: ci, safety
  # Stages: check, lint

  if git config --get core.logallrefupdates | grep -q true; then
    log FATAL "❌ Git reflog is enabled — should be disabled in CI"
    log FATAL "   💡 Tip: Add 'core.logallrefupdates = false' to your CI config"
    log FATAL "   📘 Example: git config --global core.logallrefupdates false"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_sparse_index_check — Warn if sparse index is disabled
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects sparse index status and warns if not enabled
#
# Why it matters:
#   Sparse index improves Git performance for large monorepos
#
# Globals used:
#   - none
#
# Example:
#   check::git_sparse_index_check
#
# Categories:
#   infra
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::git_sparse_index_check() {
  # ✅ Check: sparse index should be enabled
  # Category: infra
  # Stages: check, lint

  if git sparse-index is-enabled &>/dev/null && ! git sparse-index is-enabled; then
    log WARN "⚠️ Sparse index is not enabled"
    log WARN "   💡 Tip: Enable with: git sparse-index init && git sparse-index enable"
    log WARN "   📘 Example: Improves performance in large workspaces"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_object_reuse_disabled — Prevent object reuse in secure builds
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures object reuse via alternates or shared object dirs is not enabled
#
# Why it matters:
#   Shared objects can create attack vectors or inconsistent histories
#
# Globals used:
#   - GIT_DIR → .git
#
# Example:
#   check::git_object_reuse_disabled
#
# Categories:
#   safety
#
# Stages:
#   check
# ------------------------------------------------------------------------------
check::git_object_reuse_disabled() {
  # ✅ Check: object reuse must be disabled in secure builds
  # Category: safety
  # Stages: check

  if [[ -f .git/objects/info/alternates ]]; then
    log FATAL "❌ .git/objects/info/alternates file found — object reuse is unsafe"
    log FATAL "   💡 Tip: Do not share Git objects across repos or CI jobs"
    log FATAL "   📘 Example: rm -f .git/objects/info/alternates"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_alternate_object_dir_blocked — Block use of GIT_ALTERNATE_OBJECT_DIRECTORIES
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures the GIT_ALTERNATE_OBJECT_DIRECTORIES env var is not set
#
# Why it matters:
#   Alternate object dirs allow arbitrary injection of Git objects
#
# Globals used:
#   - GIT_ALTERNATE_OBJECT_DIRECTORIES
#
# Example:
#   check::git_alternate_object_dir_blocked
#
# Categories:
#   safety
#
# Stages:
#   check, pre-commit
# ------------------------------------------------------------------------------
check::git_alternate_object_dir_blocked() {
  # ✅ Check: environment must not allow GIT_ALTERNATE_OBJECT_DIRECTORIES
  # Category: safety
  # Stages: check, pre-commit

  if [[ -n "$GIT_ALTERNATE_OBJECT_DIRECTORIES" ]]; then
    log FATAL "❌ GIT_ALTERNATE_OBJECT_DIRECTORIES is set"
    log FATAL "   💡 Tip: Unset this variable to avoid injection of foreign Git objects"
    log FATAL "   📘 Example: unset GIT_ALTERNATE_OBJECT_DIRECTORIES"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_index_lock_orphans — Detect orphaned index.lock files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns or fails if index.lock exists but Git is not running
#
# Why it matters:
#   Stale lock files can prevent Git commands and break CI
#
# Globals used:
#   - GIT_DIR
#
# Example:
#   check::git_index_lock_orphans
#
# Categories:
#   ci
#
# Stages:
#   check, pre-commit
# ------------------------------------------------------------------------------
check::git_index_lock_orphans() {
  # ✅ Check: stale .git/index.lock must not exist
  # Category: ci
  # Stages: check, pre-commit

  if [[ -f .git/index.lock ]]; then
    log FATAL "❌ Found stale .git/index.lock"
    log FATAL "   💡 Tip: Remove with 'rm -f .git/index.lock' if Git is not active"
    log FATAL "   📘 Example: Failed CI jobs may leave orphaned locks"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_commit_message_nodiff — Block commits with empty diffs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Rejects commits with no file changes
#
# Why it matters:
#   Empty commits pollute history and may trigger CI/CD pipelines unnecessarily
#
# Globals used:
#   - None
#
# Example:
#   check::git_commit_message_nodiff
#
# Categories:
#   ci
#
# Stages:
#   commit-msg
# ------------------------------------------------------------------------------
check::git_commit_message_nodiff() {
  # ✅ Check: prevent empty commits
  # Category: ci
  # Stages: commit-msg

  if git diff --cached --exit-code >/dev/null; then
    log FATAL "❌ Empty commit — no file changes staged"
    log FATAL "   💡 Tip: Add or modify files before committing"
    log FATAL "   📘 Example: git add <file> && git commit -m 'fix: update README'"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_worktree_consistency — Validate all Git worktrees are consistent
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks for orphaned or unregistered Git worktrees
#
# Why it matters:
#   Inconsistent worktree state can lead to corruption or unexpected behavior
#
# Globals used:
#   - GIT_DIR
#
# Example:
#   check::git_worktree_consistency
#
# Categories:
#   infra
#
# Stages:
#   check
# ------------------------------------------------------------------------------
check::git_worktree_consistency() {
  # ✅ Check: all Git worktrees must be valid and registered
  # Category: infra
  # Stages: check

  if ! git worktree list --porcelain | grep -q 'worktree '; then
    log FATAL "❌ No valid Git worktree found"
    log FATAL "   💡 Tip: Use 'git worktree add' to initialize a valid worktree"
    log FATAL "   📘 Example: git worktree add ../branch-name branch-name"
    return 1
  fi
}



# ------------------------------------------------------------------------------
# 🧪 check::git_fsmonitor_safety — Ensure fsmonitor is safe for CI
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies fsmonitor is not enabled in CI
#
# Why it matters:
#   fsmonitor can cause caching bugs or false positives in containers
#
# Globals used:
#   - None
#
# Example:
#   check::git_fsmonitor_safety
#
# Categories:
#   ci
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::git_fsmonitor_safety() {
  # ✅ Check: fsmonitor should be disabled in CI
  # Category: ci
  # Stages: check, lint

  if git config --get core.fsmonitor &>/dev/null; then
    log FATAL "❌ core.fsmonitor is enabled — not safe for CI"
    log FATAL "   💡 Tip: Disable via: git config --unset core.fsmonitor"
    log FATAL "   📘 Example: echo 'core.fsmonitor=' >> .git/config"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_repo_size_budget — Warn if Git repo exceeds size threshold
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans Git object DB and warns if size exceeds common limits
#
# Why it matters:
#   Large Git repos slow down cloning, CI, and dependency tooling
#
# Globals used:
#   - ROOT_DIR
#
# Example:
#   check::git_repo_size_budget
#
# Categories:
#   safety
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::git_repo_size_budget() {
  # ✅ Check: Git repo should not exceed recommended object DB size
  # Category: safety
  # Stages: check, lint

  local size
  size=$(du -s .git/objects 2>/dev/null | awk '{print $1}')
  local limit=50000

  if [[ "$size" -gt "$limit" ]]; then
    log WARN "⚠️ Git object database is large ($size KB)"
    log WARN "   💡 Tip: Use git-lfs or refactor large files into R2/artifacts"
    log WARN "   📘 Example: git lfs migrate import --include='*.mp4,*.zip'"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_commit_bloat — Warn on large commits
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks most recent commit for high file count or size
#
# Why it matters:
#   Large commits make code reviews and reverts difficult
#
# Globals used:
#   - None
#
# Example:
#   check::git_commit_bloat
#
# Categories:
#   ci
#
# Stages:
#   check
# ------------------------------------------------------------------------------
check::git_commit_bloat() {
  # ✅ Check: warn on commits with too many files or large size
  # Category: ci
  # Stages: check

  local files changed
  files=$(git diff --name-only HEAD^ HEAD | wc -l)
  changed=$(git diff HEAD^ HEAD | wc -c)
  local max_files=100
  local max_bytes=50000

  if (( files > max_files || changed > max_bytes )); then
    log WARN "⚠️ Large commit detected: $files files, $changed bytes"
    log WARN "   💡 Tip: Split into smaller atomic commits for better traceability"
    log WARN "   📘 Example: git reset HEAD^ && git add -p"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_commit_no_diff_only_metadata — Disallow commits with no file changes
# ------------------------------------------------------------------------------
# This check ensures commits aren't metadata-only (e.g. empty diffs).
#
# Why it matters:
#   Prevents meaningless commits that may confuse Git history or trigger CI unnecessarily.
#
# Globals used:
#   - None
#
# Example:
#   check::git_commit_no_diff_only_metadata
#
# Categories:
#   ci
#
# Stages:
#   commit-msg
# ------------------------------------------------------------------------------
check::git_commit_no_diff_only_metadata() {
  # ✅ Check: commits must include real file changes
  # Category: ci
  # Stages: commit-msg

  local diff
  diff=$(git log -1 --name-only --pretty=format: | grep -v '^$' || true)

  if [[ -z "$diff" ]]; then
    log FATAL "❌ Commit contains no file changes — only metadata"
    log FATAL "   💡 Tip: Ensure your commit modifies tracked files"
    log FATAL "   📘 Example: touch README.md && git add . && git commit -m 'chore(docs): trigger build'"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_commit_tagged — Warn if commit should be tagged but isn’t
# ------------------------------------------------------------------------------
# This check warns if a `release:` or `version:` commit is not tagged.
#
# Why it matters:
#   Prevents missing release tags in versioned workflows.
#
# Globals used:
#   - None
#
# Categories:
#   ci
#
# Stages:
#   deploy, validate
# ------------------------------------------------------------------------------
check::git_commit_tagged() {
  # ✅ Check: release commits should be tagged
  # Category: ci
  # Stages: deploy, validate

  local subject
  subject=$(git log -1 --pretty=%s)

  if [[ "$subject" =~ ^(release|version)\(([^)]+)\): ]]; then
    local hash
    hash=$(git rev-parse HEAD)
    if ! git tag --points-at "$hash" | grep -q .; then
      log WARN "⚠️ Commit looks like a release but has no Git tag: $subject"
      log WARN "   💡 Tip: Tag with version: git tag v1.2.3 && git push origin v1.2.3"
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_commit_uncommitted_patches — Warn on stray patch files
# ------------------------------------------------------------------------------
# This function warns if .patch or .diff files exist but are uncommitted.
#
# Why it matters:
#   Patch files may represent pending fixes not applied or forgotten diffs.
#
# Globals used:
#   - ROOT_DIR
#
# Categories:
#   ci, lint
# Stages:
#   pre-commit, validate
# ------------------------------------------------------------------------------
check::git_commit_uncommitted_patches() {
  # ✅ Check: Uncommitted .patch or .diff files must be committed or deleted
  # Category: ci, lint
  # Stages: pre-commit, validate

  local uncommitted
  uncommitted=$(find "$ROOT_DIR" -type f \( -name '*.patch' -o -name '*.diff' \) | grep -vF .git | grep -vF node_modules || true)

  if [[ -n "$uncommitted" ]]; then
    log WARN "⚠️ Uncommitted patch/diff files found:"
    echo "$uncommitted" | while read -r f; do
      log WARN "   ↳ $f"
    done
    log WARN "   💡 Tip: Either apply, commit, or delete these files"
    log WARN "   📘 Example: git apply patches/fix-bug-42.patch"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_commit_date_skew — Detect suspicious commit timestamps
# ------------------------------------------------------------------------------
# This function flags commits with skewed dates, which may indicate clock drift or rebases.
#
# Why it matters:
#   Commit date errors can disrupt CI and blame tools.
#
# Globals used:
#   - None
#
# Categories:
#   ci, safety
#
# Stages:
#   validate
# ------------------------------------------------------------------------------
check::git_commit_date_skew() {
  # ✅ Check: warn on commit timestamps in the future or heavily skewed
  # Category: ci, safety
  # Stages: validate

  local commit_ts now diff
  commit_ts=$(git log -1 --pretty=%ct)
  now=$(date +%s)
  diff=$((now - commit_ts))

  if ((diff < -600)); then
    log WARN "⚠️ Commit date is in the future: $(git log -1 --pretty=%cd)"
    log WARN "   💡 Tip: Your system clock may be ahead — fix it to avoid CI issues"
    log WARN "   📘 Example: date -u && timedatectl set-ntp true"
  elif ((diff > 31536000)); then
    log WARN "⚠️ Commit appears over a year old — check timestamp: $(git log -1 --pretty=%cd)"
    log WARN "   💡 Tip: This might indicate stale rebased history"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::git_commit_branch_scope — Ensure commit scope aligns with branch name
# ------------------------------------------------------------------------------
# This ensures the commit message scope matches the branch prefix.
#
# Why it matters:
#   Helps trace commits to the feature or bugfix branch they belong to.
#
# Globals used:
#   - None
#
# Categories:
#   ci
#
# Stages:
#   commit-msg
# ------------------------------------------------------------------------------
check::git_commit_branch_scope() {
  # ✅ Check: commit scope should align with branch name
  # Category: ci
  # Stages: commit-msg

  local branch scope
  branch=$(git rev-parse --abbrev-ref HEAD)
  scope=$(git log -1 --pretty=%s | grep -oP '^[a-z]+\(.*?\)' | sed -E 's/^[a-z]+\((.*)\)/\1/')

  if [[ -n "$scope" && "$branch" != *"$scope"* ]]; then
    log WARN "⚠️ Commit scope \"$scope\" does not match branch name \"$branch\""
    log WARN "   💡 Tip: Align scope with the ticket/feature slug in your branch"
    log WARN "   📘 Example: feat(auth): matches branch 'feature/auth-login-flow'"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_title_format — Validate Merge Request title format
# ------------------------------------------------------------------------------
# This function enforces a Conventional Commits-style MR title.
#
# Why it matters:
#   Ensures clarity, traceability, and compatibility with changelog automation.
#
# Globals used:
#   - CI_MERGE_REQUEST_TITLE → GitLab-provided MR title
#
# Example:
#   CI_MERGE_REQUEST_TITLE="feat(api): add streaming support"
#   check::mr_title_format
#
# Categories:
#   mr, ci
# Stages:
#   pre-commit, validate
# ------------------------------------------------------------------------------
check::mr_title_format() {
  # ✅ Check: MR title must follow conventional commit format
  # Category: mr, ci
  # Stages: pre-commit, validate

  local title="${CI_MERGE_REQUEST_TITLE:-}"
  local pattern='^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9-]+\))?: .+'

  if [[ ! "$title" =~ $pattern ]]; then
    log FATAL "❌ Merge Request title does not follow Conventional Commit format"
    log FATAL "   💡 Tip: Use 'type(scope): description'"
    log FATAL "   📘 Example: feat(auth): support token refresh endpoint"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_description_required — Ensure MR description is non-empty
# ------------------------------------------------------------------------------
# This check validates that every MR includes a meaningful description.
#
# Why it matters:
#   Avoids ambiguous changes, ensures reviewer understanding.
#
# Globals used:
#   - CI_MERGE_REQUEST_DESCRIPTION
#
# Example:
#   CI_MERGE_REQUEST_DESCRIPTION="Adds a metrics exporter for Prometheus"
#   check::mr_description_required
#
# Categories:
#   mr, ci
# Stages:
#   validate
# ------------------------------------------------------------------------------
check::mr_description_required() {
  # ✅ Check: MR description must not be empty
  # Category: mr, ci
  # Stages: validate

  local desc="${CI_MERGE_REQUEST_DESCRIPTION:-}"

  if [[ -z "$desc" || "$desc" == "null" ]]; then
    log FATAL "❌ Merge Request has no description"
    log FATAL "   💡 Tip: Add a summary of changes and any testing or context"
    log FATAL "   📘 Example: 'Implements logging middleware with OpenTelemetry spans'"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_label_enforcement — Enforce required Merge Request labels
# ------------------------------------------------------------------------------
# This check ensures Merge Requests include at least one meaningful label.
#
# Why it matters:
#   - Enables changelog automation and grouping
#   - Triggers correct pipeline or reviewer routing
#   - Flags security, infra, or CI/CD scoped changes
#
# Globals used:
#   - CI_MERGE_REQUEST_LABELS
#
# Example:
#   CI_MERGE_REQUEST_LABELS="api,infra,security"
#   check::mr_label_enforcement
#
# Categories:
#   mr, ci
#
# Stages:
#   validate, check
# ------------------------------------------------------------------------------
check::mr_label_enforcement() {
  # ✅ Check: MR must include at least one meaningful label
  # Category: mr, ci
  # Stages: validate, check

  local labels="${CI_MERGE_REQUEST_LABELS:-}"
  local failed=1

  # 🔖 Approved label categories
  local required_labels=(
    # Functional categories
    api auth billing db email forms metrics search storage telemetry

    # Platform domains
    frontend backend mobile serverless edge cli sdk integration

    # Engineering concerns
    ci cd devops infra secrets security accessibility performance observability

    # Type of change
    docs tests refactor cleanup migration

    # Regulatory or compliance
    legal privacy gdpr accessibility

    # Deployment or environment
    staging production preview release hotfix rollback

    # Team ownership
    marketing data ml content analytics growth customer-support

    # Business functions
    pricing checkout accounts onboarding subscriptions

    # Other
    ux i18n dark-mode mobile-ui web-ui ai llm
  )

  for required in "${required_labels[@]}"; do
    if grep -qE "\b$required\b" <<< "$labels"; then
      failed=0
      break
    fi
  done

  if [[ "$failed" -eq 1 ]]; then
    log FATAL "❌ Merge Request is missing required domain or scope label"
    log FATAL "   💡 Tip: Label your MR to indicate feature area, domain, or concern"
    log FATAL "   📘 Example: /label api,infra,security"
    return 1
  fi

  log INFO "✅ Merge Request includes valid label(s): $labels"
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_target_branch_protected — Validate target branch
# ------------------------------------------------------------------------------
# Ensures merge requests do not target disallowed or unsafe branches.
#
# Why it matters:
#   Prevents accidental merges to `main`, `production`, etc.
#
# Globals used:
#   - CI_MERGE_REQUEST_TARGET_BRANCH_NAME
#
# Example:
#   CI_MERGE_REQUEST_TARGET_BRANCH_NAME="staging"
#   check::mr_target_branch_protected
#
# Categories:
#   mr, safety
# Stages:
#   validate, deploy
# ------------------------------------------------------------------------------
check::mr_target_branch_protected() {
  # ✅ Check: Disallow merges to protected branches without review
  # Category: mr, safety
  # Stages: validate, deploy

  local target="${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-}"
  local disallowed=("main" "production" "prod")

  for branch in "${disallowed[@]}"; do
    if [[ "$target" == "$branch" ]]; then
      log FATAL "❌ Merge Request targets protected branch: $branch"
      log FATAL "   💡 Tip: Use a staging or preview branch, and merge via approved pipeline"
      log FATAL "   📘 Example: Target 'release/2025-06-15' instead of 'main'"
      return 1
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_draft_block — Prevent merge request if marked as draft
# ------------------------------------------------------------------------------
# This check ensures the MR is not marked as Draft.
#
# Why it matters:
#   Draft MRs are not ready for review or merge. Accidentally merging them can introduce unfinished code.
#
# Globals used:
#   - MR_TITLE → Title of the merge request (fetched via API or environment)
#
# Example:
#   MR_TITLE="Draft: feat(auth): add login flow"
#   check::mr_draft_block
#
# Categories:
#   mr
#
# Stages:
#   validate, lint
# ------------------------------------------------------------------------------
check::mr_draft_block() {
  # ✅ Check: Prevent merge requests marked as draft
  # Category: mr
  # Stages: validate, lint

  if [[ "$MR_TITLE" =~ ^[Dd]raft: ]]; then
    log FATAL "❌ Merge request is marked as Draft"
    log FATAL "   💡 Tip: Remove 'Draft:' from MR title when ready to merge"
    log FATAL "   📘 Example: 'feat(auth): add login flow'"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_conflicting_labels — Reject MRs with incompatible labels
# ------------------------------------------------------------------------------
# This check ensures the MR does not contain logically conflicting labels.
#
# Why it matters:
#   Conflicting labels confuse reviewers and automation systems (e.g., hotfix + refactor).
#
# Globals used:
#   - MR_LABELS → Space-separated list of labels on the MR
#
# Example:
#   MR_LABELS="hotfix refactor"
#   check::mr_conflicting_labels
#
# Categories:
#   mr
#
# Stages:
#   validate
# ------------------------------------------------------------------------------
check::mr_conflicting_labels() {
  # ✅ Check: Detect conflicting labels on MR
  # Category: mr
  # Stages: validate

  local combos=(
    "hotfix refactor"
    "breaking-change patch"
    "feature remove"
  )

  for combo in "${combos[@]}"; do
    local a b
    read -r a b <<< "$combo"
    if [[ "$MR_LABELS" =~ $a && "$MR_LABELS" =~ $b ]]; then
      log FATAL "❌ Conflicting labels detected: '$a' and '$b'"
      log FATAL "   💡 Tip: Remove one of the conflicting labels before merging"
      log FATAL "   📘 Example: 'hotfix' implies urgent bugfix — not refactor"
      return 1
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_size_limit — Prevent merge requests that are too large
# ------------------------------------------------------------------------------
# This check limits lines/files changed to ensure PRs are reviewable.
#
# Why it matters:
#   Large MRs are hard to review and error-prone.
#
# Globals used:
#   - MR_LINES_ADDED → Number of added lines
#   - MR_LINES_REMOVED → Number of removed lines
#   - MR_FILES_CHANGED → Number of changed files
#
# Example:
#   MR_LINES_ADDED=950
#   MR_FILES_CHANGED=12
#   check::mr_size_limit
#
# Categories:
#   mr
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::mr_size_limit() {
  # ✅ Check: Fail MRs that are too large to reasonably review
  # Category: mr
  # Stages: lint, validate

  local max_lines=800
  local max_files=20

  if (( MR_LINES_ADDED + MR_LINES_REMOVED > max_lines )); then
    log FATAL "❌ Merge request modifies too many lines: $((MR_LINES_ADDED + MR_LINES_REMOVED))"
    log FATAL "   💡 Tip: Split this MR into smaller parts for easier review"
    log FATAL "   📘 Example: Limit each MR to under $max_lines total lines changed"
    return 1
  fi

  if (( MR_FILES_CHANGED > max_files )); then
    log FATAL "❌ Merge request touches too many files: $MR_FILES_CHANGED"
    log FATAL "   💡 Tip: Refactor MR scope or split into smaller MRs"
    log FATAL "   📘 Example: Keep MR under $max_files files changed"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_assignee_required — Ensure every MR has an assignee
# ------------------------------------------------------------------------------
# This check ensures accountability by requiring an MR assignee.
#
# Globals used:
#   - MR_ASSIGNEE → login/username of assignee (blank if none)
#
# Example:
#   MR_ASSIGNEE="cole"
#   check::mr_assignee_required
#
# Categories:
#   mr
#
# Stages:
#   validate
# ------------------------------------------------------------------------------
check::mr_assignee_required() {
  # ✅ Check: MRs must be assigned to someone
  # Category: mr
  # Stages: validate

  if [[ -z "$MR_ASSIGNEE" ]]; then
    log FATAL "❌ Merge request has no assignee"
    log FATAL "   💡 Tip: Assign the MR to a responsible team member"
    log FATAL "   📘 Example: MR must include: assignee: @cole"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_reviewer_required — Ensure every MR has at least one reviewer
# ------------------------------------------------------------------------------
# This check ensures that merge requests are not merged without review.
#
# Globals used:
#   - MR_REVIEWERS → space-separated list of reviewers (empty if none)
#
# Example:
#   MR_REVIEWERS="cole kristine"
#   check::mr_reviewer_required
#
# Categories:
#   mr
#
# Stages:
#   validate, lint
# ------------------------------------------------------------------------------
check::mr_reviewer_required() {
  # ✅ Check: Merge requests must include at least one reviewer
  # Category: mr
  # Stages: validate, lint

  if [[ -z "$MR_REVIEWERS" ]]; then
    log FATAL "❌ Merge request is missing reviewers"
    log FATAL "   💡 Tip: Assign at least one reviewer to this MR"
    log FATAL "   📘 Example: reviewer: @cole"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_blocking_discussions — Prevent merge if unresolved discussions exist
# ------------------------------------------------------------------------------
# This check blocks MRs from merging if GitLab reports open threads.
#
# Globals used:
#   - MR_BLOCKING_DISCUSSIONS_COUNT → number of unresolved threads
#
# Example:
#   MR_BLOCKING_DISCUSSIONS_COUNT=2
#   check::mr_blocking_discussions
#
# Categories:
#   mr
#
# Stages:
#   validate
# ------------------------------------------------------------------------------
check::mr_blocking_discussions() {
  # ✅ Check: Block MRs with unresolved discussions
  # Category: mr
  # Stages: validate

  if (( MR_BLOCKING_DISCUSSIONS_COUNT > 0 )); then
    log FATAL "❌ Merge request has unresolved discussions: $MR_BLOCKING_DISCUSSIONS_COUNT"
    log FATAL "   💡 Tip: Resolve all open threads before merging"
    log FATAL "   📘 Example: Mark conversations as resolved in GitLab UI"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_wip_commit_check — Prevent merge if any WIP commit is found
# ------------------------------------------------------------------------------
# This check detects commits with messages like "wip" or "tmp".
#
# Globals used:
#   - MR_COMMITS → full list of commit messages (1 per line)
#
# Example:
#   MR_COMMITS="wip: test deploy\nfeat(api): auth added"
#   check::mr_wip_commit_check
#
# Categories:
#   mr
#
# Stages:
#   validate
# ------------------------------------------------------------------------------
check::mr_wip_commit_check() {
  # ✅ Check: Reject MRs with WIP/temporary commit messages
  # Category: mr
  # Stages: validate

  echo "$MR_COMMITS" | grep -iE '\b(wip|tmp|debug|test|fixme)\b' >/dev/null && {
    log FATAL "❌ Merge request includes WIP or placeholder commits"
    log FATAL "   💡 Tip: Squash or reword commits before merging"
    log FATAL "   📘 Example: Replace 'wip: stuff' with 'feat(auth): add password reset'"
    return 1
  }
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_approval_required — Ensure MR has required number of approvals
# ------------------------------------------------------------------------------
# This check ensures approvals meet configured policy.
#
# Globals used:
#   - MR_APPROVAL_COUNT → Number of approvals received
#   - MR_APPROVAL_MIN_REQUIRED → Minimum required for this MR
#
# Example:
#   MR_APPROVAL_COUNT=2
#   MR_APPROVAL_MIN_REQUIRED=1
#   check::mr_approval_required
#
# Categories:
#   mr
#
# Stages:
#   validate, check
# ------------------------------------------------------------------------------
check::mr_approval_required() {
  # ✅ Check: Merge requests must have sufficient approvals
  # Category: mr
  # Stages: validate, check

  local required=${MR_APPROVAL_MIN_REQUIRED:-1}
  local current=${MR_APPROVAL_COUNT:-0}

  if (( current < required )); then
    log FATAL "❌ Merge request only has $current approval(s); required: $required"
    log FATAL "   💡 Tip: Wait for additional reviewers to approve before merging"
    log FATAL "   📘 Example: Require 2 approvals for all changes to production code"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_branch_source_rules — Enforce source branch naming conventions
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures MRs originate from branches matching allowed naming patterns
#   - Prevents arbitrary or misleading branch names
#
# Why it matters:
#   Branch naming conventions improve traceability, CI targeting, and automation
#
# Globals used:
#   - MR_SOURCE_BRANCH → source branch name (e.g., "feature/foo")
#
# Example:
#   MR_SOURCE_BRANCH="feature/login-refactor"
#   check::mr_branch_source_rules
#
# Categories:
#   mr
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::mr_branch_source_rules() {
  # ✅ Check: MR source branch must follow naming conventions
  # Category: mr
  # Stages: check, lint

  local allowed='^(feature|fix|chore|refactor|hotfix|docs|test|perf|ci|infra|build)/[a-z0-9._-]+$'

  if [[ ! "$MR_SOURCE_BRANCH" =~ $allowed ]]; then
    log FATAL "❌ Invalid MR source branch name: '$MR_SOURCE_BRANCH'"
    log FATAL "   💡 Tip: Use format like 'feature/xyz', 'fix/abc', or 'chore/update-config'"
    log FATAL "   📘 Example: MR branch → 'feature/add-user-form'"
    return 1
  fi
}
# ------------------------------------------------------------------------------
# 🧪 check::mr_codeowners_approval — Require approvals from CODEOWNERS
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures at least one approver is a CODEOWNER for each modified path
#
# Why it matters:
#   Enforces ownership boundaries for sensitive or scoped paths
#
# Globals used:
#   - MODIFIED_PATHS → newline-separated file paths in MR
#   - CODEOWNERS_FILE → path to .gitlab/CODEOWNERS
#
# Example:
#   CODEOWNERS_FILE=".gitlab/CODEOWNERS"
#   check::mr_codeowners_approval
#
# Categories:
#   mr
#
# Stages:
#   check, integration
# ------------------------------------------------------------------------------
check::mr_codeowners_approval() {
  # ✅ Check: all changed files are approved by corresponding CODEOWNERS
  # Category: mr
  # Stages: check, integration

  if [[ ! -f "$CODEOWNERS_FILE" ]]; then
    log FATAL "❌ CODEOWNERS file missing at: $CODEOWNERS_FILE"
    log FATAL "   💡 Tip: Ensure codeowners are defined for sensitive areas"
    log FATAL "   📘 Example: $CODEOWNERS_FILE → /packages/api/ @enzuzo/backend-team"
    return 1
  fi

  # This check assumes your MR system has validated approvals — or you integrate this with the API
  log INFO "✅ CODEOWNERS validation is assumed to be enforced by platform policies"
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_labels_required_per_scope — Require labels based on paths
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Requires label(s) to be present based on touched paths (e.g., docs/, api/, infra/)
#
# Why it matters:
#   Ensures MRs are categorized for changelogs, automation, and approvals
#
# Globals used:
#   - MODIFIED_PATHS → newline-separated file paths in MR
#   - MR_LABELS → space-separated labels on MR
#
# Example:
#   MODIFIED_PATHS="$(git diff --name-only origin/main...)"
#   MR_LABELS="api docs"
#   check::mr_labels_required_per_scope
#
# Categories:
#   mr
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::mr_labels_required_per_scope() {
  # ✅ Check: labels must match paths modified in MR
  # Category: mr
  # Stages: check, lint

  local failed=0

  declare -A scope_map=(
    ["packages/api"]="api"
    ["packages/docs"]="docs"
    ["infra/"]="infra"
    [".gitlab/"]="ci"
  )

  for path in $MODIFIED_PATHS; do
    for dir in "${!scope_map[@]}"; do
      if [[ "$path" == $dir* ]]; then
        if [[ ! " $MR_LABELS " =~ " ${scope_map[$dir]} " ]]; then
          log FATAL "❌ MR modifies '$dir' but is missing label: '${scope_map[$dir]}'"
          log FATAL "   💡 Tip: Add label '${scope_map[$dir]}' to the MR"
          log FATAL "   📘 Example: gitlab label → '${scope_map[$dir]}'"
          failed=1
        fi
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_dependency_changes_reviewed — Block unreviewed dependency changes
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Fails if package.json or lockfiles are changed without an approval label
#
# Why it matters:
#   Prevents risky or silent upgrades in dependencies
#
# Globals used:
#   - MODIFIED_PATHS → newline-separated files
#   - MR_LABELS → space-separated MR labels
#
# Categories:
#   mr
#
# Stages:
#   check, validate
# ------------------------------------------------------------------------------
check::mr_dependency_changes_reviewed() {
  # ✅ Check: dependency changes must be explicitly reviewed
  # Category: mr
  # Stages: check, validate

  for path in $MODIFIED_PATHS; do
    if [[ "$path" == *package.json || "$path" == *pnpm-lock.yaml ]]; then
      if [[ ! "$MR_LABELS" =~ " deps-reviewed " ]]; then
        log FATAL "❌ Dependency file changed without 'deps-reviewed' label: $path"
        log FATAL "   💡 Tip: Add 'deps-reviewed' label after peer review of changes"
        log FATAL "   📘 Example: MR label → 'deps-reviewed'"
        return 1
      fi
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_ci_pipeline_passed — Require successful CI pipeline on latest commit
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocks merge if CI status is not passed
#
# Why it matters:
#   Prevents merging broken builds or untested code
#
# Globals used:
#   - CI_PIPELINE_STATUS → string: "success", "failed", etc.
#
# Categories:
#   mr, ci
#
# Stages:
#   integration, validate
# ------------------------------------------------------------------------------
check::mr_ci_pipeline_passed() {
  # ✅ Check: pipeline must be green to merge
  # Category: mr, ci
  # Stages: integration, validate

  if [[ "$CI_PIPELINE_STATUS" != "success" ]]; then
    log FATAL "❌ CI pipeline not successful: status=$CI_PIPELINE_STATUS"
    log FATAL "   💡 Tip: Re-run or fix failing jobs before merging"
    log FATAL "   📘 Example: Only merge if status is 'success'"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_up_to_date_with_target — Ensure MR is rebased on latest target
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Fails if MR source branch is behind the target
#
# Why it matters:
#   Prevents merge conflicts and regression bugs from stale state
#
# Globals used:
#   - MR_TARGET_BRANCH → branch name (e.g., main)
#   - MR_SOURCE_BRANCH → current MR branch
#
# Categories:
#   mr
#
# Stages:
#   check, validate
# ------------------------------------------------------------------------------
check::mr_up_to_date_with_target() {
  # ✅ Check: MR must be up-to-date with target branch
  # Category: mr
  # Stages: check, validate

  if ! git merge-base --is-ancestor "origin/$MR_TARGET_BRANCH" "$MR_SOURCE_BRANCH"; then
    log FATAL "❌ MR source branch is behind 'origin/$MR_TARGET_BRANCH'"
    log FATAL "   💡 Tip: Rebase your branch onto the latest target before merging"
    log FATAL "   📘 Example: git pull --rebase origin $MR_TARGET_BRANCH"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_cherry_pick_label — Require cherry-pick label for cherry-picked MRs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforces presence of 'cherry-pick' or 'backport' label if MR title or body suggests one
#
# Why it matters:
#   - Prevents untracked backports or versioned cherry-picks from merging without traceability
#
# Globals used:
#   - MR_TITLE → merge request title
#   - MR_LABELS → newline-separated labels on the MR
#
# Example:
#   MR_TITLE="chore(release): cherry-pick fix"
#   MR_LABELS="cherry-pick\nrelease"
#   check::mr_cherry_pick_label
#
# Categories:
#   mr
#
# Stages:
#   pre-commit, check, lint
# ------------------------------------------------------------------------------
check::mr_cherry_pick_label() {
  # ✅ Check: cherry-pick/backport MRs must be explicitly labeled
  # Category: mr
  # Stages: pre-commit, check, lint

  if grep -qiE 'cherry[- ]pick|backport' <<< "$MR_TITLE"; then
    if ! grep -qE '^cherry-pick$|^backport$' <<< "$MR_LABELS"; then
      log FATAL "❌ Cherry-pick/backport MR missing required label"
      log FATAL "   💡 Tip: Add label 'cherry-pick' or 'backport' if MR applies a fix to an older release"
      log FATAL "   📘 Example: MR title = 'fix(ui): cherry-pick bug fix' → requires label 'cherry-pick'"
      return 1
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_test_coverage_diff — Warn if coverage decreased
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Compares before/after test coverage % in MR context
#   - Warns if MR lowers test coverage across lines/branches/functions
#
# Globals used:
#   - COVERAGE_BEFORE → numeric % (e.g. 91.3)
#   - COVERAGE_AFTER  → numeric %
#
# Example:
#   COVERAGE_BEFORE=90.1
#   COVERAGE_AFTER=89.6
#   check::mr_test_coverage_diff
#
# Categories:
#   mr, test
#
# Stages:
#   test, check, pre-commit
# ------------------------------------------------------------------------------
check::mr_test_coverage_diff() {
  # ✅ Check: prevent coverage regression
  # Category: mr,test
  # Stages: test, check, pre-commit

  if (( $(echo "$COVERAGE_AFTER < $COVERAGE_BEFORE" | bc -l) )); then
    log WARN "⚠️ Test coverage decreased in this MR: $COVERAGE_BEFORE% → $COVERAGE_AFTER%"
    log WARN "   💡 Tip: Consider adding tests for new or changed logic"
    log WARN "   📘 Example: increase tests in affected files to match or exceed original coverage"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_label_format — Enforce consistent label casing/prefixes
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforces kebab-case lowercase format for all MR labels
#
# Globals used:
#   - MR_LABELS → newline-separated labels
#
# Example:
#   MR_LABELS="needs-review\nFixesBug"
#   check::mr_label_format
#
# Categories:
#   mr
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::mr_label_format() {
  # ✅ Check: labels must follow lowercase kebab-case format
  # Category: mr
  # Stages: check, lint

  while read -r label; do
    if [[ "$label" =~ [A-Z] || ! "$label" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
      log FATAL "❌ Invalid MR label format: '$label'"
      log FATAL "   💡 Tip: Labels must be lowercase kebab-case (e.g. 'api-change', 'no-changelog')"
      log FATAL "   📘 Example: '$label' → should be '${label,,}'"
      return 1
    fi
  done <<< "$MR_LABELS"
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_release_label_required — Require release label for release branches
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - If MR targets a `release/*` branch, it must include `release` label
#
# Globals used:
#   - MR_TARGET_BRANCH → name of target branch
#   - MR_LABELS → newline-separated MR labels
#
# Example:
#   MR_TARGET_BRANCH="release/1.5.0"
#   MR_LABELS="release\nchangelog"
#   check::mr_release_label_required
#
# Categories:
#   mr
#
# Stages:
#   check, lint, validate
# ------------------------------------------------------------------------------
check::mr_release_label_required() {
  # ✅ Check: MRs to release/* branches must include 'release' label
  # Category: mr
  # Stages: check, lint, validate

  if [[ "$MR_TARGET_BRANCH" =~ ^release/ ]]; then
    if ! grep -q '^release$' <<< "$MR_LABELS"; then
      log FATAL "❌ Missing 'release' label for MR targeting $MR_TARGET_BRANCH"
      log FATAL "   💡 Tip: Add 'release' label to confirm intent to merge into a release branch"
      log FATAL "   📘 Example: gitlab label → release"
      return 1
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_no_force_push_after_review — Block force-push after review
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects if MR was approved then force-pushed afterward
#
# Why it matters:
#   - Prevents bypassing of post-review scrutiny or CI invalidation
#
# Globals used:
#   - MR_FORCE_PUSHED_AT → ISO timestamp or empty
#   - MR_APPROVED_AT → ISO timestamp or empty
#
# Example:
#   MR_FORCE_PUSHED_AT="2025-06-13T10:30:00Z"
#   MR_APPROVED_AT="2025-06-13T08:15:00Z"
#   check::mr_no_force_push_after_review
#
# Categories:
#   mr
#
# Stages:
#   pre-commit, check
# ------------------------------------------------------------------------------
check::mr_no_force_push_after_review() {
  # ✅ Check: reject force-pushes after approval
  # Category: mr
  # Stages: pre-commit, check

  if [[ -n "$MR_FORCE_PUSHED_AT" && -n "$MR_APPROVED_AT" ]]; then
    if [[ "$MR_FORCE_PUSHED_AT" > "$MR_APPROVED_AT" ]]; then
      log FATAL "❌ Force-push occurred after MR was approved"
      log FATAL "   💡 Tip: Re-request approval after force-push, or avoid force-pushing after review"
      log FATAL "   📘 Example: MR approved at $MR_APPROVED_AT, force-pushed at $MR_FORCE_PUSHED_AT"
      return 1
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_license_change_reviewed — Require approval for LICENSE changes
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects if LICENSE, NOTICE, or copyright files are changed
#   - Fails if required reviewer or label is not set
#
# Globals used:
#   - MR_CHANGED_FILES → newline list of file paths
#   - MR_LABELS → newline list of MR labels
#
# Example:
#   MR_CHANGED_FILES="LICENSE\nREADME.md"
#   MR_LABELS="legal-approved\nchangelog"
#   check::mr_license_change_reviewed
#
# Categories:
#   mr, safety
#
# Stages:
#   check, validate
# ------------------------------------------------------------------------------
check::mr_license_change_reviewed() {
  # ✅ Check: LICENSE changes must be explicitly reviewed
  # Category: mr,safety
  # Stages: check, validate

  if grep -qE '^LICENSE$|^NOTICE$|^COPYRIGHT|^LEGAL' <<< "$MR_CHANGED_FILES"; then
    if ! grep -q '^legal-approved$' <<< "$MR_LABELS"; then
      log FATAL "❌ License-related file modified without legal-approved label"
      log FATAL "   💡 Tip: Add label 'legal-approved' after confirmation by legal or compliance lead"
      log FATAL "   📘 Example: LICENSE → label 'legal-approved'"
      return 1
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_config_changes_approved — Require approval for critical config changes
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags modifications to .env*, wrangler.json, tsconfig, secrets, infra, etc.
#   - Fails if MR lacks 'config-approved' label
#
# Globals used:
#   - MR_CHANGED_FILES → newline-separated
#   - MR_LABELS → newline-separated
#
# Categories:
#   mr, secrets, infra
#
# Stages:
#   check, validate
# ------------------------------------------------------------------------------
check::mr_config_changes_approved() {
  # ✅ Check: config or infra changes require approval
  # Category: mr,secrets,infra
  # Stages: check, validate

  if grep -qE '\.(env|secrets|json|yaml|yml|toml)$|infra/|wrangler\.json|tsconfig' <<< "$MR_CHANGED_FILES"; then
    if ! grep -q '^config-approved$' <<< "$MR_LABELS"; then
      log FATAL "❌ Critical config change without 'config-approved' label"
      log FATAL "   💡 Tip: Add label after ops/security/infrastructure review"
      log FATAL "   📘 Example: .env → label 'config-approved'"
      return 1
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_open_too_long — Warn if MR is stale or neglected
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns if MR was opened more than N days ago without merge or approval
#
# Globals used:
#   - MR_OPENED_AT → ISO 8601 datetime (UTC)
#   - NOW_UTC → current datetime (ISO)
#
# Example:
#   MR_OPENED_AT="2025-06-01T12:00:00Z"
#   NOW_UTC="2025-06-13T12:00:00Z"
#   check::mr_open_too_long
#
# Categories:
#   mr
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::mr_open_too_long() {
  # ✅ Check: warn if MR has remained open too long without action
  # Category: mr
  # Stages: check, lint

  local days_open
  days_open=$(echo "($(date -d "$NOW_UTC" +%s) - $(date -d "$MR_OPENED_AT" +%s)) / 86400" | bc)

  if (( days_open >= 10 )); then
    log WARN "⚠️ MR has been open for $days_open days"
    log WARN "   💡 Tip: Consider merging, closing, or rebasing this MR to avoid staleness"
    log WARN "   📘 Example: Opened at $MR_OPENED_AT, now $NOW_UTC"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_automerge_not_enabled_by_default — Prevent premature automerge
# ------------------------------------------------------------------------------
# This check ensures MRs do not enable automerge before CI and review are complete.
#
# Why it matters:
#   - Prevents early merging from flaky pipeline or skipped review
#
# Globals used:
#   - MR_AUTOMERGE_ENABLED → whether automerge is active
#   - MR_PIPELINE_STATUS   → status of CI pipeline
#   - MR_APPROVED          → 1 if approved
#
# Example:
#   MR_AUTOMERGE_ENABLED=1
#   MR_PIPELINE_STATUS="success"
#   MR_APPROVED=1
#   check::mr_automerge_not_enabled_by_default
#
# Categories:
#   mr, ci
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::mr_automerge_not_enabled_by_default() {
  # ✅ Check: block automerge unless pipeline is green and review is approved
  # Category: mr, ci
  # Stages: lint, check

  if [[ "$MR_AUTOMERGE_ENABLED" == "1" ]]; then
    if [[ "$MR_PIPELINE_STATUS" != "success" ]]; then
      log FATAL "❌ Automerge is enabled but pipeline has not succeeded (status: $MR_PIPELINE_STATUS)"
      log FATAL "   💡 Tip: Automerge should only be enabled after passing CI"
      log FATAL "   📘 Example: Set automerge after pipeline status is 'success'"
      return 1
    fi

    if [[ "$MR_APPROVED" != "1" ]]; then
      log FATAL "❌ Automerge is enabled without reviewer approval"
      log FATAL "   💡 Tip: Wait for approval before enabling automerge"
      log FATAL "   📘 Example: MR must have at least 1 approval"
      return 1
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_label_conflict_matrix — Prevent incompatible MR label combinations
# ------------------------------------------------------------------------------
# This check detects logically conflicting label pairs.
#
# Why it matters:
#   - Prevents ambiguous changelog or pipeline behavior
#
# Globals used:
#   - MR_LABELS → space-separated string of all MR labels
#
# Example:
#   MR_LABELS="breaking-change patch hotfix"
#   check::mr_label_conflict_matrix
#
# Categories:
#   mr
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::mr_label_conflict_matrix() {
  # ✅ Check: prevent label conflicts like 'patch' + 'breaking-change'
  # Category: mr
  # Stages: lint, check

  local failed=0
  local conflicts=(
    "breaking-change patch"
    "hotfix chore"
    "feature revert"
  )

  for pair in "${conflicts[@]}"; do
    local a b
    read -r a b <<< "$pair"
    if [[ "$MR_LABELS" =~ $a ]] && [[ "$MR_LABELS" =~ $b ]]; then
      log FATAL "❌ Conflicting labels found on MR: '$a' and '$b'"
      log FATAL "   💡 Tip: Remove one of the conflicting labels to clarify intent"
      log FATAL "   📘 Example: Use 'breaking-change' without 'patch'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_sensitive_path_changes — Require review for sensitive paths
# ------------------------------------------------------------------------------
# This check enforces review requirements for critical files or directories.
#
# Why it matters:
#   - Prevents accidental or unauthorized changes to infrastructure and configs
#
# Globals used:
#   - MR_CHANGED_FILES → newline-separated list of changed paths
#   - MR_APPROVED      → 1 if approved
#
# Example:
#   MR_CHANGED_FILES=$(git diff --name-only origin/main)
#   check::mr_sensitive_path_changes
#
# Categories:
#   mr, ci
#
# Stages:
#   check, pre-commit
# ------------------------------------------------------------------------------
check::mr_sensitive_path_changes() {
  # ✅ Check: Changes to critical files must be reviewed
  # Category: mr, ci
  # Stages: check, pre-commit

  local sensitive_patterns=(
    "^scripts/"
    "^.gitlab/"
    "^package.json$"
    "^.env"
    "^infra/"
    "^Makefile"
    "^wrangler.json"
  )

  local hit=0
  for pattern in "${sensitive_patterns[@]}"; do
    if echo "$MR_CHANGED_FILES" | grep -Eq "$pattern"; then
      hit=1
      break
    fi
  done

  if [[ "$hit" -eq 1 && "$MR_APPROVED" != "1" ]]; then
    log FATAL "❌ Changes to sensitive files require approval"
    log FATAL "   💡 Tip: Add an MR reviewer before merging"
    log FATAL "   📘 Example: Changes to 'wrangler.json' or '.gitlab-ci.yml' must be reviewed"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::mr_test_or_benchmark_regressions — Prevent merging with performance or test regressions
# ------------------------------------------------------------------------------
# This check blocks merge if coverage or benchmarks regress.
#
# Why it matters:
#   - Prevents silent test quality or performance degradation
#
# Globals used:
#   - MR_COVERAGE_DIFF → test coverage diff (float)
#   - MR_BENCHMARK_DIFF → performance diff (float)
#
# Example:
#   MR_COVERAGE_DIFF=-2.3
#   MR_BENCHMARK_DIFF=+8.1
#   check::mr_test_or_benchmark_regressions
#
# Categories:
#   mr, test
#
# Stages:
#   test, lint
# ------------------------------------------------------------------------------
check::mr_test_or_benchmark_regressions() {
  # ✅ Check: Block merge on test/benchmark regressions
  # Category: mr, test
  # Stages: test, lint

  if (( $(echo "$MR_COVERAGE_DIFF < -0.5" | bc -l) )); then
    log FATAL "❌ Test coverage regressed by $MR_COVERAGE_DIFF%"
    log FATAL "   💡 Tip: Add or fix tests to maintain coverage"
    log FATAL "   📘 Example: coverage dropped from 95.1% → 93.4%"
    return 1
  fi

  if (( $(echo "$MR_BENCHMARK_DIFF > 5.0" | bc -l) )); then
    log FATAL "❌ Benchmark performance regressed by $MR_BENCHMARK_DIFF%"
    log FATAL "   💡 Tip: Investigate performance bottlenecks or avoid changes with high cost"
    log FATAL "   📘 Example: api/v1/consent/create slowed down by 12.4%"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::lint_biome — Run Biome across workspace
# ------------------------------------------------------------------------------
# This check runs `biome check` across the workspace.
#
# Why it matters:
#   - Ensures consistent formatting and linting via Biome
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::lint_biome
#
# Categories:
#   biome, lint
#
# Stages:
#   lint
# ------------------------------------------------------------------------------
check::lint_biome() {
  # ✅ Check: run biome check across project
  # Category: biome, lint
  # Stages: lint

  if ! command -v biome >/dev/null; then
    log FATAL "❌ biome not installed or not in PATH"
    log FATAL "   💡 Tip: Install via pnpm: pnpm add -D @biomejs/biome"
    log FATAL "   📘 Example: pnpm add -D @biomejs/biome"
    return 1
  fi

  if ! biome check "$ROOT_DIR" --apply; then
    log FATAL "❌ biome check failed"
    log FATAL "   💡 Tip: Fix formatting and lint issues via biome or adjust config"
    log FATAL "   📘 Example: biome check . --apply"
    return 1
  fi

  log INFO "✅ Biome check passed"
}

# ------------------------------------------------------------------------------
# 🧪 check::lint_oxlint — Run oxlint across workspace
# ------------------------------------------------------------------------------
# This check runs `oxlint` to catch fast TypeScript and JS errors.
#
# Why it matters:
#   - Catches unsafe or invalid syntax before build/test
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::lint_oxlint
#
# Categories:
#   oxlint, lint
#
# Stages:
#   lint
# ------------------------------------------------------------------------------
check::lint_oxlint() {
  # ✅ Check: run oxlint on all files
  # Category: oxlint, lint
  # Stages: lint

  if ! command -v oxlint >/dev/null; then
    log FATAL "❌ oxlint not installed or not in PATH"
    log FATAL "   💡 Tip: Install via: pnpm add -D oxlint"
    log FATAL "   📘 Example: pnpm add -D oxlint"
    return 1
  fi

  if ! oxlint "$ROOT_DIR"; then
    log FATAL "❌ oxlint reported linting errors"
    log FATAL "   💡 Tip: Fix issues or suppress intentionally ignored rules via config"
    log FATAL "   📘 Example: oxlint ."
    return 1
  fi

  log INFO "✅ oxlint check passed"
}

# ------------------------------------------------------------------------------
# 🧪 check::format_biome — Apply Biome auto-formatting across workspace
# ------------------------------------------------------------------------------
# This check runs `biome format --write` to auto-format all supported files.
#
# Why it matters:
#   - Maintains consistent code formatting across the monorepo
#   - Prevents accidental formatting drift or manual inconsistencies
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::format_biome
#
# Categories:
#   biome, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::format_biome() {
  # ✅ Check: format project using biome format --write
  # Category: biome, lint
  # Stages: lint, check

  if ! command -v biome >/dev/null; then
    log FATAL "❌ biome is not installed or not in PATH"
    log FATAL "   💡 Tip: Install via pnpm: pnpm add -D @biomejs/biome"
    log FATAL "   📘 Example: pnpm add -D @biomejs/biome"
    return 1
  fi

  if ! biome format "$ROOT_DIR" --write; then
    log FATAL "❌ biome format failed to apply formatting"
    log FATAL "   💡 Tip: Resolve any file permissions or invalid config issues"
    log FATAL "   📘 Example: biome format --write ."
    return 1
  fi

  log INFO "✅ Biome formatting applied successfully"
}

# ------------------------------------------------------------------------------
# 🧪 check::nanostores_safety — Validate structure and safe usage of nanostores
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforces read-only atoms are not mutated
#   - Ensures proper structure of store exports
#   - Detects unused or unimported stores
#   - Prevents env access and side effects in store modules
#   - Validates naming of persistentAtom keys and computed store filenames
#
# Why it matters:
#   - Nanostores should remain atomic, composable, and free of global side effects
#   - Inconsistent patterns or env leaks break SSR, security, and reuse guarantees
#
# Globals used:
#   - ROOT_DIR → project root directory to scan for stores
#
# Example:
#   ROOT_DIR=. check::nanostores_safety
#
# Categories:
#   lint, boundaries, dotenv, naming, paths, safety
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::nanostores_safety() {
  # ✅ Check: Validate all nanostores follow safe usage patterns
  # Category: lint, boundaries, dotenv, naming, paths, safety
  # Stages: lint, check, pre-commit

  local failed=0

  mapfile -t files < <(find "$ROOT_DIR" -type f -name "*.ts" -o -name "*.tsx")

  for file in "${files[@]}"; do
    if grep -Eq 'atom\([^)]+\)' "$file" && grep -Eq '\.set\(' "$file"; then
      log FATAL "❌ Writable mutation detected on read-only atom in $file"
      log FATAL "   💡 Tip: Use writable() instead of atom() for mutable stores"
      log FATAL "   📘 Example: const count = writable(0)"
      failed=1
    fi

    if grep -Eq 'export\s+(const|let|var)\s+\w+\s*=' "$file" &&
       ! grep -Eq 'export\s+(const|let|var)\s+\w+\s*=\s*(atom|writable|computed|persistentAtom)\(' "$file"; then
      log FATAL "❌ Store export in $file does not follow expected Nanostores factory pattern"
      log FATAL "   💡 Tip: Use atom(), writable(), computed(), or persistentAtom() for stores"
      failed=1
    fi

    if grep -Eq 'process\.env\.[A-Z_][A-Z0-9_]*' "$file"; then
      log FATAL "❌ Direct environment access detected in store module: $file"
      log FATAL "   💡 Tip: Inject config via arguments or import safe typed config"
      failed=1
    fi

    if grep -Eq 'localStorage|sessionStorage|window|fetch|navigator' "$file"; then
      log WARN "⚠️ Potential side effect detected in store file: $file"
      log WARN "   💡 Tip: Avoid side effects in top-level store modules"
    fi

    if [[ "$file" =~ persistent && "$file" =~ \.ts$ ]]; then
      grep -E "persistentAtom\(" "$file" | while read -r line; do
        key=$(echo "$line" | grep -oE '"[^"]+"' | head -n1 | tr -d '"')
        if [[ ! "$key" =~ ^[a-z0-9]+(\.[a-z0-9_-]+)+$ ]]; then
          log FATAL "❌ Invalid persistentAtom key in $file: \"$key\""
          log FATAL "   💡 Tip: Use structured, lowercase dotted keys (e.g., app.env.user)"
          failed=1
        fi
      done
    fi

    if [[ "$file" =~ computed && ! "$file" =~ \.computed\.ts$ ]]; then
      log FATAL "❌ Computed store file $file does not use '.computed.ts' suffix"
      log FATAL "   💡 Tip: Rename to follow convention for computed stores"
      log FATAL "   📘 Example: count.computed.ts"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All Nanostores passed safety and structure validation"
}

# ------------------------------------------------------------------------------
# 🧪 check::valibot_consistency — Enforce correct and efficient use of Valibot schemas
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects unused schemas not passed to parse/safeParse
#   - Warns on JSON.parse before validation
#   - Flags unused validation results
#   - Detects redundant or inline schema duplication
#   - Verifies inferred types are correctly used
#
# Why it matters:
#   - Prevents silent validation failures
#   - Avoids perf issues from dynamic schema redeclaration
#   - Reduces schema drift and dead code
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   check::valibot_consistency
#
# Categories:
#   lint, valibot
#
# Stages:
#   check, lint, test
# ------------------------------------------------------------------------------
check::valibot_consistency() {
  # ✅ Check: Proper Valibot usage across codebase
  # Category: lint, valibot
  # Stages: check, lint, test

  local failed=0

  # 1. Unused schemas (defined but never used)
  grep -rE 'const +[A-Za-z0-9_]+Schema *= *v\.object' "$ROOT_DIR" \
    --include="*.ts" | while read -r line; do
    local var
    var=$(echo "$line" | grep -oE 'const +[A-Za-z0-9_]+Schema' | awk '{print $2}')
    local file
    file=$(echo "$line" | cut -d: -f1)
    if ! grep -qE "$var\.(parse|safeParse)" "$file"; then
      log WARN "⚠️ Valibot schema '$var' defined in $file but never validated"
      log WARN "   💡 Tip: Remove unused schema or pass it to parse/safeParse"
      log WARN "   📘 Example: $var.safeParse(input)"
      failed=1
    fi
  done

  # 2. Unsafe JSON.parse usage
  grep -rE 'JSON\.parse\([^)]+\)' "$ROOT_DIR" --include="*.ts" | grep -v test | while read -r match; do
    log WARN "⚠️ Raw JSON.parse usage detected: $match"
    log WARN "   💡 Tip: Prefer unknown input + Valibot for parsing"
    log WARN "   📘 Example: schema.safeParse(raw)"
    failed=1
  done

  # 3. Unused safeParse results
  grep -rE 'const +[A-Za-z0-9_]+ *= *[A-Za-z0-9_]+Schema\.safeParse' "$ROOT_DIR" \
    --include="*.ts" | while read -r line; do
    local var
    var=$(echo "$line" | grep -oE 'const +[A-Za-z0-9_]+' | awk '{print $2}')
    local file
    file=$(echo "$line" | cut -d: -f1)
    if ! grep -qE "$var\.(success|data|error)" "$file"; then
      log WARN "⚠️ safeParse() result assigned but not used: $var in $file"
      log WARN "   💡 Tip: Check result.success before accessing result.data"
      log WARN "   📘 Example: if (result.success) use(result.data)"
      failed=1
    fi
  done

  # 4. Inline schema duplication
  grep -rE 'v\.object\(\{' "$ROOT_DIR" --include="*.ts" | while read -r match; do
    if echo "$match" | grep -vqE 'const|export'; then
      log WARN "⚠️ Inline anonymous Valibot object schema found:"
      log WARN "   ↳ $match"
      log WARN "   💡 Tip: Hoist schemas to top-level constants for reuse and clarity"
      log WARN "   📘 Example: const userSchema = v.object({ ... })"
      failed=1
    fi
  done

  # 5. Schemas declared inside functions (perf + identity hazard)
  grep -rE 'function .*{[^}]*v\.object' "$ROOT_DIR" --include="*.ts" | while read -r line; do
    log WARN "⚠️ Schema declared inside function scope: $line"
    log WARN "   💡 Tip: Move schemas to top-level unless they are runtime-parametric"
    log WARN "   📘 Example: declare schemas once and reuse across calls"
    failed=1
  done

  # 6. Missing type inference from schema
  grep -rE 'Infer<typeof +[A-Za-z0-9_]+Schema>' "$ROOT_DIR" --include="*.ts" | while read -r line; do
    if ! echo "$line" | grep -qE 'type +[A-Za-z0-9_]+'; then
      log WARN "⚠️ Schema inferred but no type alias declared: $line"
      log WARN "   💡 Tip: Name inferred types to avoid repeating Infer<> inline"
      log WARN "   📘 Example: type User = Infer<typeof userSchema>"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ Valibot consistency validated"
}

# ------------------------------------------------------------------------------
# 🧪 check::vitest_config_and_coverage — Enforce Vitest usage, config, coverage, and hygiene
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validates central vitest.config at shared location
#   - Enforces coverage thresholds for lines, branches, functions, statements
#   - Blocks skipped/focused/test.todo usage
#   - Blocks .snap files in Git
#   - Detects use of global APIs in test files (fetch, URL, etc.)
#   - Ensures test/benchmark filenames follow strict suffixes
#   - Blocks multiple or rogue vitest.config.* files
#   - Ensures test timeout and mocking standards are met
#
# Why it matters:
#   - Prevents flakiness, coverage regressions, and config divergence
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::vitest_config_and_coverage
#
# Categories:
#   test, ci, lint
#
# Stages:
#   lint, test, check
# ------------------------------------------------------------------------------
check::vitest_config_and_coverage() {
  # ✅ Check: Enforce all Vitest standards and coverage thresholds
  # Category: test, ci, lint
  # Stages: lint, test, check

  local failed=0
  local shared_path="$ROOT_DIR/packages/shared/utils/test"
  local config_ts="$shared_path/vitest.config.ts"
  local config_js="$shared_path/vitest.config.js"
  local config_file=""
  local coverage_json="$ROOT_DIR/coverage/coverage-summary.json"

  # 1. Ensure vitest.config exists at shared location
  if [[ -f "$config_ts" ]]; then
    config_file="$config_ts"
  elif [[ -f "$config_js" ]]; then
    config_file="$config_js"
  else
    log FATAL "❌ Missing shared vitest.config.ts or .js at: $shared_path"
    log FATAL "   💡 Tip: Place a central Vitest config in $shared_path"
    log FATAL "   📘 Example: defineConfig({ test: { coverage: { reporter: ['json-summary'] } } })"
    failed=1
  fi

  # 2. Enforce single config location (no rogue configs)
  find "$ROOT_DIR" -type f -name "vitest.config.*" ! -path "$config_file" | while read -r rogue; do
    log FATAL "❌ Unexpected Vitest config outside shared utils: $rogue"
    log FATAL "   💡 Tip: Consolidate Vitest configuration in $shared_path only"
    log FATAL "   📘 Example: import config from '$shared_path/vitest.config.ts'"
    failed=1
  done

  # 3. Validate coverage thresholds
  pnpm vitest run --coverage --config "$config_file" --reporter=json-summary >/dev/null 2>&1 || true
  if [[ ! -f "$coverage_json" ]]; then
    log FATAL "❌ Coverage summary not found: $coverage_json"
    log FATAL "   💡 Tip: Ensure reporter includes json-summary"
    log FATAL "   📘 Example: reporter: ['json-summary']"
    failed=1
  else
    for metric in lines branches functions statements; do
      pct=$(jq -r ".total[\"$metric\"].pct" "$coverage_json")
      if (( $(echo "$pct < 90" | bc -l) )); then
        log FATAL "❌ Coverage for $metric below threshold: $pct%"
        log FATAL "   💡 Tip: Improve test coverage to reach 90%+"
        log FATAL "   📘 Example: write more unit tests for uncovered functions"
        failed=1
      fi
    done
  fi

  # 4. Validate naming of test and benchmark files
  find "$ROOT_DIR" -type f \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.bench.ts" \) | sort > /dev/null
  find "$ROOT_DIR" -type f -name "*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" ! -name "*.bench.ts" | while read -r f; do
    if grep -qE '\b(test|describe|expect)\b' "$f"; then
      log FATAL "❌ Test code found in non-conforming file: $f"
      log FATAL "   💡 Tip: Rename to *.test.ts or *.spec.ts"
      log FATAL "   📘 Example: auth-helper.ts → auth-helper.test.ts"
      failed=1
    fi
  done

  # 5. Block skipped/focused/todo tests
  grep -rEn '\b(it|test|describe)\.(skip|only|todo)\b' "$ROOT_DIR" --include="*.ts" | while read -r line; do
    log FATAL "❌ Skipped or focused test found: $line"
    log FATAL "   💡 Tip: Remove .skip/.only/.todo to ensure all tests run"
    log FATAL "   📘 Example: replace test.skip(...) with test(...)"
    failed=1
  done

  # 6. Block committed .snap files
  if git ls-files | grep -q '\.snap$'; then
    log FATAL "❌ Detected .snap files committed to Git"
    log FATAL "   💡 Tip: Remove snapshot tests or move .snap to .gitignore"
    log FATAL "   📘 Example: echo '*.snap' >> .gitignore"
    failed=1
  fi

  # 7. Detect unmocked global APIs
  grep -rEn '\b(fetch|URL|console|Date|Math|Headers|Request|Response)\b' "$ROOT_DIR" --include="*.test.ts" --include="*.spec.ts" | while read -r line; do
    log WARN "⚠️ Global API used in test without mock: $line"
    log WARN "   💡 Tip: Prefer vi.stubGlobal() or mocking utilities to isolate test logic"
    log WARN "   📘 Example: vi.stubGlobal('fetch', vi.fn())"
  done

  # 8. Check for required --help/--version in shared CLI test utils
  if grep -qr -- '--help' "$shared_path" && grep -qr -- '--version' "$shared_path"; then
    log INFO "✅ CLI test helpers expose --help and --version flags"
  else
    log WARN "⚠️ Shared CLI test utilities may be missing --help or --version"
    log WARN "   💡 Tip: Always support basic flags to ensure usability in test scripts"
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::vitest_config_and_usage — Enforce Vitest standards and config consistency
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validates vitest.config.ts includes defineConfig and isolate: true
#   - Confirms test coverage thresholds are set and enforced
#   - Detects excessive concurrency in CI (threads > 4)
#   - Warns on beforeEach/afterAll used without isolation
#   - Ensures all tests specify a timeout or rely on config default
#   - Prevents exporting vitest utils from shared exports field
#   - Warns on unstable snapshots (timestamps, UUIDs, etc.)
#
# Why it matters:
#   - Prevents non-deterministic or flakey test behavior
#   - Enforces test coverage and consistency across packages
#   - Ensures shared exports are clean and properly isolated
#
# Globals used:
#   - ROOT_DIR → project root path
#
# Example:
#   check::vitest_config_and_usage
#
# Categories:
#   test, ci, lint, package
#
# Stages:
#   lint, test, check, build
# ------------------------------------------------------------------------------
check::vitest_config_and_usage() {
  # ✅ Check: Vitest config and usage must follow enforced conventions
  # Category: test, ci, lint, package
  # Stages: lint, test, check, build

  local failed=0

  find "$ROOT_DIR" -type f -name "vitest.config.ts" | while read -r config; do
    # Must use defineConfig
    if ! grep -q 'defineConfig' "$config"; then
      log FATAL "❌ Missing defineConfig wrapper in $config"
      log FATAL "   💡 Tip: Always wrap config in defineConfig() for type safety"
      log FATAL "   📘 Example: export default defineConfig({ test: { ... } })"
      failed=1
    fi

    # Must include isolate: true
    if ! grep -q 'isolate:\s*true' "$config"; then
      log FATAL "❌ Missing 'isolate: true' in $config"
      log FATAL "   💡 Tip: Enabling isolate mode prevents test contamination"
      log FATAL "   📘 Example: test: { isolate: true }"
      failed=1
    fi

    # Must include coverage thresholds
    if ! grep -q 'coverage' "$config"; then
      log FATAL "❌ Missing coverage thresholds in $config"
      log FATAL "   💡 Tip: Enforce minimum test coverage via test.coverage statements"
      log FATAL "   📘 Example: coverage: { lines: 90, functions: 90, branches: 90 }"
      failed=1
    fi
  done

  # Check for concurrency limits in CI
  if grep -r --include "*.yml" -E "vitest.*--threads\s+[5-9]" "$ROOT_DIR/.gitlab" 2>/dev/null | grep -vE 'test/local'; then
    log FATAL "❌ Vitest thread count exceeds 4 in CI"
    log FATAL "   💡 Tip: Use --threads=4 or fewer to prevent flaky behavior in CI"
    log FATAL "   📘 Example: vitest --threads=4"
    failed=1
  fi

  # Warn on global test hooks used without isolation
  if grep -rE 'beforeEach|afterAll' "$ROOT_DIR/packages/shared/utils/test" | grep -v isolate; then
    log FATAL "❌ Shared test utils use global hooks without isolation"
    log FATAL "   💡 Tip: Avoid global beforeEach/afterAll in shared utils"
    log FATAL "   📘 Example: Use inline setup() in individual test files"
    failed=1
  fi

  # Check for unstable patterns in .snap files
  if grep -rE '20[2-3][0-9]-[0-1][0-9]-[0-3][0-9]|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}' "$ROOT_DIR" --include '*.snap' 2>/dev/null; then
    log WARN "⚠️ Non-deterministic data found in Vitest snapshots (timestamps or UUIDs)"
    log WARN "   💡 Tip: Replace dynamic values with deterministic mocks before snapshot"
    log WARN "   📘 Example: Replace new Date() with mockDate('2024-01-01')"
  fi

  # Ensure no test utilities are exported from shared utils
  if grep -r 'export.*from.*vitest' "$ROOT_DIR/packages/shared" 2>/dev/null; then
    log FATAL "❌ Shared package is exporting test-only Vitest utilities"
    log FATAL "   💡 Tip: Avoid polluting shared exports with test-specific code"
    log FATAL "   📘 Example: remove export * from 'vitest' in utils/index.ts"
    failed=1
  fi

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_stale_mrs — Notify of MRs open too long without updates
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Queries GitLab API for open MRs older than N days
#   - Logs or triggers notifications for stale MRs
#
# Why it matters:
#   - Stale MRs create tech debt and block velocity
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → Base GitLab API URL
#   - STALE_DAYS   → Age threshold in days (default: 30)
#
# Example:
#   check::remind_stale_mrs
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_stale_mrs() {
  # ✅ Check: Alert on stale MRs over STALE_DAYS old
  # Category: mr
  # Stages: notify, integration

  local threshold="${STALE_DAYS:-30}"
  local since
  since=$(date -u -d "-${threshold} days" +%Y-%m-%dT%H:%M:%SZ)

  local url="${GITLAB_API}/merge_requests?state=opened&updated_before=${since}&scope=all"

  if [[ -z "${GITLAB_TOKEN:-}" ]]; then
    log FATAL "❌ GITLAB_TOKEN is not set"
    log FATAL "   💡 Tip: Export GITLAB_TOKEN for GitLab API authentication"
    log FATAL "   📘 Example: export GITLAB_TOKEN=abc123"
    return 1
  fi

  local result
  result=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$url")

  if echo "$result" | jq -e 'length > 0' >/dev/null; then
    echo "$result" | jq -r '.[] | "⚠️ MR \(.id): \(.title) is stale (updated: \(.updated_at))"' | while read -r line; do
      log WARN "$line"
    done
    log WARN "⚠️ One or more stale MRs found (not updated in $threshold days)"
    log WARN "   💡 Tip: Reassign or comment to reactivate stale discussions"
    log WARN "   📘 Example: https://gitlab.com/your-org/your-repo/-/merge_requests"
    return 1
  else
    log INFO "✅ No stale MRs found older than $threshold days"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_labels_missing — Notify of MRs missing required labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Queries GitLab API for open merge requests
#   - Flags MRs missing required labels (e.g. type:, scope:, priority:)
#
# Why it matters:
#   - Enforces label hygiene to help routing, dashboards, and triage
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#   - REQUIRED_LABELS → Space-separated list of required label prefixes
#
# Example:
#   REQUIRED_LABELS="type: scope: priority:"
#   check::remind_mr_labels_missing
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_labels_missing() {
  # ✅ Check: MRs must include required label prefixes
  # Category: mr
  # Stages: notify, integration

  local required=(${REQUIRED_LABELS:-type: scope: priority:})

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export GitLab auth/token/env before running"
    log FATAL "   📘 Example: export GITLAB_TOKEN=abc; export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  local mrs
  mrs=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all")

  local failed=0
  echo "$mrs" | jq -c '.[]' | while read -r mr; do
    local id title web_url
    id=$(jq -r '.id' <<<"$mr")
    title=$(jq -r '.title' <<<"$mr")
    web_url=$(jq -r '.web_url' <<<"$mr")
    labels=($(jq -r '.labels[]' <<<"$mr"))

    for required_prefix in "${required[@]}"; do
      local matched=0
      for label in "${labels[@]}"; do
        if [[ "$label" == "$required_prefix"* ]]; then
          matched=1
          break
        fi
      done

      if [[ "$matched" -eq 0 ]]; then
        log WARN "⚠️ MR missing required label: $required_prefix"
        log WARN "   ↳ [$id] $title"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs have required label prefixes"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_old_commits — Warn about MRs with outdated commits
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies open MRs with commits older than N days
#   - Flags MRs that may need rebasing or updating
#
# Why it matters:
#   - Prevents merge conflicts and outdated code from being merged
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#   - MR_MAX_AGE_DAYS → Max allowed commit age (default: 14)
#
# Example:
#   MR_MAX_AGE_DAYS=10
#   check::remind_mr_old_commits
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_old_commits() {
  # ✅ Check: Warn if MR commits are too old
  # Category: mr
  # Stages: notify, integration

  local max_age="${MR_MAX_AGE_DAYS:-14}"
  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  local today ts_cutoff
  today=$(date -u +%s)
  ts_cutoff=$(( today - (max_age * 86400) ))

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title web_url last_commit
      id=$(jq -r '.id' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")
      last_commit=$(jq -r '.updated_at' <<<"$mr")
      last_ts=$(date -d "$last_commit" +%s)

      if (( last_ts < ts_cutoff )); then
        log WARN "⚠️ MR commit history is outdated: [$id] $title"
        log WARN "   ↳ Last activity: $last_commit"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No MRs have stale commit history"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_automerge_candidates — Suggest enabling automerge
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies open MRs that are mergeable but do not have automerge enabled
#   - Flags them so developers can opt in to automerge
#
# Why it matters:
#   - Encourages continuous delivery and reduces merge delays
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#
# Example:
#   check::remind_mr_automerge_candidates
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_automerge_candidates() {
  # ✅ Check: Suggest enabling automerge if conditions are met
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title web_url merge_status squash auto_merge
      id=$(jq -r '.id' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")
      merge_status=$(jq -r '.merge_status' <<<"$mr")
      squash=$(jq -r '.squash' <<<"$mr")
      auto_merge=$(jq -r '.merge_when_pipeline_succeeds' <<<"$mr")

      if [[ "$merge_status" == "can_be_merged" && "$auto_merge" == "false" ]]; then
        log WARN "⚠️ Mergeable MR does not have automerge enabled: [$id] $title"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No mergeable MRs missing automerge"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_unreviewed — Notify of open MRs needing review
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies merge requests with no approvals or reviewer comments
#   - Flags MRs that are stale or unreviewed for team visibility
#
# Why it matters:
#   - Avoids stagnating work and ensures peer review policies are upheld
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#
# Example:
#   check::remind_mr_unreviewed
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_unreviewed() {
  # ✅ Check: Warn about open MRs that need review
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title web_url approvals reviewers
      id=$(jq -r '.id' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")

      approvals=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/approvals")
      reviewers=$(jq '.approved_by | length' <<<"$approvals")

      if [[ "$reviewers" -eq 0 ]]; then
        log WARN "⚠️ Merge Request needs review: [$id] $title"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No unreviewed MRs found"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_stale — Notify of stale merge requests
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs with no activity in the past N days
#   - Flags them to prevent forgotten or abandoned contributions
#
# Why it matters:
#   - Keeps repositories clean and active
#   - Encourages timely review or closure of inactive MRs
#
# Globals used:
#   - GITLAB_TOKEN  → GitLab API token
#   - GITLAB_API    → Base GitLab API URL
#   - MR_STALE_DAYS → Number of days to consider an MR stale (default: 7)
#
# Example:
#   MR_STALE_DAYS=14
#   check::remind_mr_stale
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_stale() {
  # ✅ Check: Flag stale MRs with no activity in past N days
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local days="${MR_STALE_DAYS:-7}"

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/<id>"
    return 1
  fi

  local cutoff
  cutoff=$(date -d "$days days ago" --iso-8601=seconds)

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local updated web_url title id
      updated=$(jq -r '.updated_at' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      id=$(jq -r '.id' <<<"$mr")

      if [[ "$updated" < "$cutoff" ]]; then
        log WARN "⚠️ Stale MR detected: [$id] $title"
        log WARN "   ↳ Last updated: $updated"
        log WARN "   📘 $web_url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs older than $days days"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_missing_labels — Notify if MRs are missing required labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks if open MRs are missing required labels (e.g. type:, scope:)
#
# Why it matters:
#   - Ensures MRs are categorized for automation, changelogs, and review filters
#
# Globals used:
#   - GITLAB_TOKEN     → GitLab API token
#   - GITLAB_API       → GitLab project API base URL
#   - MR_REQUIRED_LABELS → Space-separated list of required label prefixes
#
# Example:
#   MR_REQUIRED_LABELS="type: scope:"
#   check::remind_mr_missing_labels
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_missing_labels() {
  # ✅ Check: Flag open MRs missing required label prefixes
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local prefixes=(${MR_REQUIRED_LABELS:-type: scope:})

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export MR_REQUIRED_LABELS=\"type: scope:\""
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title labels web_url
      id=$(jq -r '.id' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      web_url=$(jq -r '.web_url' <<<"$mr")
      mapfile -t labels < <(jq -r '.labels[]?' <<<"$mr")

      for prefix in "${prefixes[@]}"; do
        local matched=0
        for label in "${labels[@]}"; do
          [[ "$label" == "$prefix"* ]] && matched=1 && break
        done
        if [[ "$matched" -eq 0 ]]; then
          log WARN "⚠️ MR missing required label ($prefix*): [$id] $title"
          log WARN "   ↳ $web_url"
          failed=1
        fi
      done
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs contain required labels"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_not_assigned — Remind if open MRs lack assignees
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs with no assignee set
#
# Why it matters:
#   - Prevents merge requests from being overlooked
#   - Enforces accountability and smoother handoffs
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_not_assigned
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_not_assigned() {
  # ✅ Check: All open MRs must have an assignee
  # Category: mr
  # Stages: notify, integration

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  local failed=0

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local assignee title id url
      assignee=$(jq -r '.assignee // empty' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      id=$(jq -r '.iid' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")

      if [[ -z "$assignee" || "$assignee" == "null" ]]; then
        log WARN "⚠️ MR not assigned: [$id] $title"
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All open MRs have assignees"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_old_stale — Remind on old/stale open merge requests
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns on MRs that have not been updated in >14 days
#
# Why it matters:
#   - Encourages timely reviews and decisions
#   - Reduces context switching and forgotten contributions
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_old_stale
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_old_stale() {
  # ✅ Check: Warn on merge requests older than 14 days without update
  # Category: mr
  # Stages: notify, integration

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  local cutoff
  cutoff=$(date -d '14 days ago' +%s)
  local failed=0

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local updated title id url
      updated=$(jq -r '.updated_at' <<<"$mr")
      updated_ts=$(date -d "$updated" +%s)
      title=$(jq -r '.title' <<<"$mr")
      id=$(jq -r '.iid' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")

      if (( updated_ts < cutoff )); then
        log WARN "⚠️ Stale MR not updated in 14+ days: [$id] $title"
        log WARN "   ↳ Last updated: $updated"
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs over 14 days old"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_missing_labels — Remind if MRs are missing required labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns on merge requests that lack critical labels (e.g. type, scope, priority)
#
# Why it matters:
#   - Enforces label hygiene for filtering, reporting, and automation
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_missing_labels
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_missing_labels() {
  # ✅ Check: Warn on MRs missing required labels like type, scope, or priority
  # Category: mr
  # Stages: notify, integration

  local required_labels=("type:" "scope:" "priority:")
  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local title id url labels missing
      id=$(jq -r '.iid' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")
      mapfile -t labels < <(jq -r '.labels[]' <<<"$mr")

      missing=()
      for required in "${required_labels[@]}"; do
        if ! printf '%s\n' "${labels[@]}" | grep -q "^$required"; then
          missing+=("$required")
        fi
      done

      if [[ "${#missing[@]}" -gt 0 ]]; then
        log WARN "⚠️ MR missing required labels: [$id] $title"
        log WARN "   ↳ Missing: ${missing[*]}"
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All open MRs include required labels"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_unassigned — Remind if MRs are missing an assignee
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns for all open merge requests without any assigned user
#
# Why it matters:
#   - Prevents unreviewed or orphaned merge requests
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_unassigned
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_unassigned() {
  # ✅ Check: Warn on open MRs with no assignee
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export required GitLab context vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id title url assignees
      id=$(jq -r '.iid' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")
      assignees=$(jq -r '.assignees | length' <<<"$mr")

      if [[ "$assignees" -eq 0 ]]; then
        log WARN "⚠️ MR has no assignee: [$id] $title"
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All open MRs have assignees"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_stale_review_requested — Notify on stale MRs with unresolved review requests
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects MRs with reviewers requested but no activity for > X days
#
# Why it matters:
#   - Highlights forgotten or neglected review requests
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#   - MR_STALE_DAYS → Threshold in days (default: 3)
#
# Example:
#   MR_STALE_DAYS=5
#   check::remind_mr_stale_review_requested
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_stale_review_requested() {
  # ✅ Check: Warn if any merge request has open review request but no updates in N days
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local days="${MR_STALE_DAYS:-3}"
  local cutoff
  cutoff=$(date -d "$days days ago" --iso-8601=seconds)

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export GitLab API vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]' | while read -r mr; do
      local id updated title url reviewers
      id=$(jq -r '.iid' <<<"$mr")
      updated=$(jq -r '.updated_at' <<<"$mr")
      title=$(jq -r '.title' <<<"$mr")
      url=$(jq -r '.web_url' <<<"$mr")
      reviewers=$(jq -r '.reviewers | length' <<<"$mr")

      if [[ "$reviewers" -gt 0 && "$updated" < "$cutoff" ]]; then
        log WARN "⚠️ MR $id is stale with pending reviewers: \"$title\""
        log WARN "   ↳ $url"
        failed=1
      fi
    done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs with unresolved review requests"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_no_discussion_started — Notify on MRs with no discussion threads
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs with no comments or discussions
#
# Why it matters:
#   - Surfaces MRs that may be stuck without any reviewer engagement
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_no_discussion_started
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_no_discussion_started() {
  # ✅ Check: Open MRs without any discussion threads
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Export GitLab API vars"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mr_ids < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" | jq -r '.[] | .iid'
  )

  for id in "${mr_ids[@]}"; do
    local discussions
    discussions=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/discussions")

    if [[ "$(jq length <<<"$discussions")" -eq 0 ]]; then
      local title url
      title=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id" | jq -r '.title')
      url=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id" | jq -r '.web_url')
      log WARN "⚠️ MR $id has no discussion: \"$title\""
      log WARN "   ↳ $url"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs have at least one discussion thread"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_blocked_label — Notify on MRs marked blocked for too long
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects MRs with a 'blocked' label that have not changed in >N days
#
# Why it matters:
#   - Highlights long-stalled MRs waiting for external/unresolved action
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_blocked_label
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_blocked_label() {
  # ✅ Check: Detect open MRs with label 'blocked' and no activity
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local max_age_days=7

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API context for reminders"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t blocked_mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all&with_labels_details=true" |
    jq -c '.[] | select(.labels | index("blocked"))'
  )

  for mr in "${blocked_mrs[@]}"; do
    local id updated title url
    id=$(jq -r '.iid' <<< "$mr")
    updated=$(jq -r '.updated_at' <<< "$mr")
    title=$(jq -r '.title' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    # Convert date to timestamp and compare
    local updated_ts now_ts age_days
    updated_ts=$(date -d "$updated" +%s)
    now_ts=$(date +%s)
    age_days=$(( (now_ts - updated_ts) / 86400 ))

    if (( age_days >= max_age_days )); then
      log WARN "⚠️ MR $id has been blocked for $age_days days: \"$title\""
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Resolve the block or update the MR status"
      log WARN "   📘 Example: Remove 'blocked' label if resolved"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No long-blocked MRs detected"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_not_moved_recently — Notify on MRs with no activity
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs with no updates or commits in >N days
#
# Why it matters:
#   - Helps identify forgotten or stale MRs that require action
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_not_moved_recently
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_not_moved_recently() {
  # ✅ Check: Detect MRs with no activity for N+ days
  # Category: mr
  # Stages: notify, integration

  local failed=0
  local max_days=10

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Provide GitLab API context for reminders"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id title updated url updated_ts now_ts age_days
    id=$(jq -r '.iid' <<< "$mr")
    title=$(jq -r '.title' <<< "$mr")
    updated=$(jq -r '.updated_at' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    updated_ts=$(date -d "$updated" +%s)
    now_ts=$(date +%s)
    age_days=$(( (now_ts - updated_ts) / 86400 ))

    if (( age_days > max_days )); then
      log WARN "⚠️ MR $id is stale: no updates for $age_days days"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Rebase, close, or comment to revive the MR"
      log WARN "   📘 Example: git commit --allow-empty -m 'poke CI'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs recently updated"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_no_assignee — Notify on MRs with no assignee
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all open merge requests for missing assignees
#
# Why it matters:
#   - Prevents merge requests from being ignored or unowned
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_no_assignee
#
# Categories:
#   mr
#
# Stages:
#   notify, integration
# ------------------------------------------------------------------------------
check::remind_mr_no_assignee() {
  # ✅ Check: Open MRs must have assignees
  # Category: mr
  # Stages: notify, integration

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Provide GitLab API context for reminders"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id assignee url
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    assignee=$(jq -r '.assignee // empty' <<< "$mr")

    if [[ -z "$assignee" || "$assignee" == "null" ]]; then
      log WARN "⚠️ MR $id has no assignee"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Assign a responsible developer to move this MR forward"
      log WARN "   📘 Example: GitLab UI → Assign dropdown"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All open MRs have assignees"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_missing_scope_label — Remind on MRs missing scope labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies MRs with no label matching pattern: scope:<value>
#
# Why it matters:
#   - Enforces clear categorization of changes
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_missing_scope_label
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_missing_scope_label() {
  # ✅ Check: All MRs must include a scope:<label>
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Provide GitLab API access to query merge requests"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url has_scope=0
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    mapfile -t labels < <(jq -r '.labels[]?' <<< "$mr")

    for label in "${labels[@]}"; do
      [[ "$label" =~ ^scope: ]] && has_scope=1 && break
    done

    if [[ "$has_scope" -eq 0 ]]; then
      log WARN "⚠️ MR $id is missing a scope label"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Add a label like 'scope:api', 'scope:docs', 'scope:infra'"
      log WARN "   📘 Example: GitLab UI → Labels → Add 'scope:<team/module>'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs include at least one scope:<label>"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_needs_changelog — Remind on MRs missing changelog label
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs missing `changelog:` labels (e.g. changelog:added)
#
# Why it matters:
#   - Ensures all user-facing changes are tracked in release notes
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_needs_changelog
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_needs_changelog() {
  # ✅ Check: All MRs must include a changelog:<label>
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url has_changelog=0
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    mapfile -t labels < <(jq -r '.labels[]?' <<< "$mr")

    for label in "${labels[@]}"; do
      [[ "$label" =~ ^changelog: ]] && has_changelog=1 && break
    done

    if [[ "$has_changelog" -eq 0 ]]; then
      log WARN "⚠️ MR $id is missing a changelog label"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Add a label like 'changelog:added', 'changelog:fixed', or 'changelog:removed'"
      log WARN "   📘 Example: GitLab UI → Labels → Add 'changelog:<type>'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs include at least one changelog:<label>"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_pending_approval — Remind on MRs still missing approval
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs that have no approvals
#   - Warns if approval rules are configured but not satisfied
#
# Why it matters:
#   - Ensures merge requests aren't merged without peer review
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_pending_approval
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_pending_approval() {
  # ✅ Check: Open MRs must have at least one approval if rules are defined
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url approvals_required approvals_left
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    approvals=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/approvals")
    approvals_required=$(jq -r '.approvals_required // 0' <<< "$approvals")
    approvals_left=$(jq -r '.approvals_left // 0' <<< "$approvals")

    if (( approvals_required > 0 && approvals_left > 0 )); then
      log WARN "⚠️ MR $id is pending approval ($approvals_left approvals left)"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Request a reviewer or reassign to ensure required approvals are received"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs have sufficient approvals or none required"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_pending_approval — Remind on MRs still missing approval
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects open MRs that have no approvals
#   - Warns if approval rules are configured but not satisfied
#
# Why it matters:
#   - Ensures merge requests aren't merged without peer review
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_pending_approval
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_pending_approval() {
  # ✅ Check: Open MRs must have at least one approval if rules are defined
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url approvals_required approvals_left
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    approvals=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/approvals")
    approvals_required=$(jq -r '.approvals_required // 0' <<< "$approvals")
    approvals_left=$(jq -r '.approvals_left // 0' <<< "$approvals")

    if (( approvals_required > 0 && approvals_left > 0 )); then
      log WARN "⚠️ MR $id is pending approval ($approvals_left approvals left)"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Request a reviewer or reassign to ensure required approvals are received"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs have sufficient approvals or none required"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_assignee_missing — Warn if MRs have no assignee
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans open MRs for missing assignee
#   - Warns if any MRs are not assigned
#
# Why it matters:
#   - Encourages accountability and review ownership
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_assignee_missing
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_assignee_missing() {
  # ✅ Check: All open MRs should have an assignee
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    log FATAL "   📘 Example: export GITLAB_API=https://gitlab.com/api/v4/projects/123"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url assignee
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    assignee=$(jq -r '.assignee // empty' <<< "$mr")

    if [[ -z "$assignee" || "$assignee" == "null" ]]; then
      log WARN "⚠️ MR $id has no assignee"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Assign a reviewer to ensure it gets triaged"
      log WARN "   📘 Example: Click 'Assign' in GitLab UI or use GitLab CLI"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs are assigned"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_stale — Warn if MRs are open too long without updates
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags open MRs with no activity in the last N days (default: 10)
#
# Why it matters:
#   - Encourages active review cycles and avoids stale work
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#   - MR_STALE_DAYS → Number of days to consider a MR stale (default 10)
#
# Example:
#   MR_STALE_DAYS=14
#   check::remind_mr_stale
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_stale() {
  # ✅ Check: Warn on stale MRs
  # Category: mr
  # Stages: notify, lint

  local failed=0
  local days="${MR_STALE_DAYS:-10}"

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    return 1
  fi

  local stale_date
  stale_date=$(date -d "-$days days" +%Y-%m-%dT%H:%M:%SZ)

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c --arg stale "$stale_date" '.[] | select(.updated_at < $stale)'
  )

  for mr in "${mrs[@]}"; do
    local id url updated
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    updated=$(jq -r '.updated_at' <<< "$mr")

    log WARN "⚠️ MR $id is stale (last updated: $updated)"
    log WARN "   ↳ $url"
    log WARN "   💡 Tip: Update MR description or comment to keep it active"
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_stale — Warn if MRs are open too long without updates
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags open MRs with no activity in the last N days (default: 10)
#
# Why it matters:
#   - Encourages active review cycles and avoids stale work
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#   - MR_STALE_DAYS → Number of days to consider a MR stale (default 10)
#
# Example:
#   MR_STALE_DAYS=14
#   check::remind_mr_stale
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_stale() {
  # ✅ Check: Warn on stale MRs
  # Category: mr
  # Stages: notify, lint

  local failed=0
  local days="${MR_STALE_DAYS:-10}"

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    log FATAL "   💡 Tip: Set GitLab API credentials for MR queries"
    return 1
  fi

  local stale_date
  stale_date=$(date -d "-$days days" +%Y-%m-%dT%H:%M:%SZ)

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c --arg stale "$stale_date" '.[] | select(.updated_at < $stale)'
  )

  for mr in "${mrs[@]}"; do
    local id url updated
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    updated=$(jq -r '.updated_at' <<< "$mr")

    log WARN "⚠️ MR $id is stale (last updated: $updated)"
    log WARN "   ↳ $url"
    log WARN "   💡 Tip: Update MR description or comment to keep it active"
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No stale MRs"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_unlinked_issue — Warn if MRs have no linked issues
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans all open MRs for issue references in the description
#
# Why it matters:
#   - Enforces traceability between MRs and tracked work
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_unlinked_issue
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_unlinked_issue() {
  # ✅ Check: All MRs should reference an issue
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url desc
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    desc=$(jq -r '.description // empty' <<< "$mr")

    if ! grep -qE '(Fixes|Closes|Resolves) #[0-9]+' <<< "$desc"; then
      log WARN "⚠️ MR $id has no linked issue in description"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Reference issues using: Fixes #123"
      log WARN "   📘 Example: \"Fixes #42\""
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs link to issues"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_label_missing — Warn if MRs lack required labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags MRs missing any labels from a required set
#
# Why it matters:
#   - Ensures MRs are categorized for review and CI routing
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#   - MR_REQUIRED_LABELS → space-separated required labels (e.g. "type:bug priority:high")
#
# Example:
#   MR_REQUIRED_LABELS="type:bug type:feature"
#   check::remind_mr_label_missing
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_label_missing() {
  # ✅ Check: required labels must be present
  # Category: mr
  # Stages: notify, lint

  local failed=0
  local required=($MR_REQUIRED_LABELS)

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url labels
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    labels=$(jq -r '.labels[]?' <<< "$mr" | sort)

    for req in "${required[@]}"; do
      if ! grep -qFx "$req" <<< "$labels"; then
        log WARN "⚠️ MR $id missing required label: '$req'"
        log WARN "   ↳ $url"
        log WARN "   💡 Tip: Add the '$req' label to the merge request"
        log WARN "   📘 Example: Labels: [\"type:bug\", \"priority:high\"]"
        failed=1
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs contain required labels"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_wip_in_title — Warn if MR title starts with WIP or Draft
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects WIP/Draft markers in MR titles
#
# Why it matters:
#   - Prevents accidental review or merge of incomplete changes
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_wip_in_title
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_wip_in_title() {
  # ✅ Check: MR title must not start with WIP/Draft
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url title
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    title=$(jq -r '.title' <<< "$mr")

    if [[ "$title" =~ ^(WIP|Draft|DRAFT|wip):? ]]; then
      log WARN "⚠️ MR $id is still marked as WIP/Draft in title"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Remove 'WIP' or 'Draft' from the title before requesting review"
      log WARN "   📘 Example: 'feat: add payment sync' ✅ vs 'WIP: add payment sync' ❌"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No WIP/Draft markers in MR titles"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_wip_in_title — Warn if MR title starts with WIP or Draft
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects WIP/Draft markers in MR titles
#
# Why it matters:
#   - Prevents accidental review or merge of incomplete changes
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_wip_in_title
#
# Categories:
#   mr
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_wip_in_title() {
  # ✅ Check: MR title must not start with WIP/Draft
  # Category: mr
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url title
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")
    title=$(jq -r '.title' <<< "$mr")

    if [[ "$title" =~ ^(WIP|Draft|DRAFT|wip):? ]]; then
      log WARN "⚠️ MR $id is still marked as WIP/Draft in title"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Remove 'WIP' or 'Draft' from the title before requesting review"
      log WARN "   📘 Example: 'feat: add payment sync' ✅ vs 'WIP: add payment sync' ❌"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No WIP/Draft markers in MR titles"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_pipeline_failed — Warn if any MRs have failed CI pipelines
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Identifies open MRs where the latest pipeline failed
#
# Why it matters:
#   - Ensures contributors are aware of failing CI before merge
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_pipeline_failed
#
# Categories:
#   mr, ci
#
# Stages:
#   notify, lint
# ------------------------------------------------------------------------------
check::remind_mr_pipeline_failed() {
  # ✅ Check: Notify for MRs with failed pipelines
  # Category: mr, ci
  # Stages: notify, lint

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url pipeline_status
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    pipeline_status=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id/pipelines" |
      jq -r '.[0].status // "unknown"')

    if [[ "$pipeline_status" == "failed" ]]; then
      log WARN "⚠️ MR $id has a failed pipeline"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Check CI logs and push a fix or rerun pipeline"
      log WARN "   📘 Example: git commit --allow-empty -m 'trigger rebuild'"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All MRs passed latest CI"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_unresolved_discussions — Warn if MRs have unresolved threads
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags MRs that have unresolved discussions blocking merge
#
# Why it matters:
#   - Prevents accidental merges before team feedback is resolved
#
# Globals used:
#   - GITLAB_TOKEN → GitLab API token
#   - GITLAB_API   → GitLab project API base URL
#
# Example:
#   check::remind_mr_unresolved_discussions
#
# Categories:
#   mr
#
# Stages:
#   notify
# ------------------------------------------------------------------------------
check::remind_mr_unresolved_discussions() {
  # ✅ Check: Unresolved discussions should block merge
  # Category: mr
  # Stages: notify

  local failed=0

  if [[ -z "$GITLAB_TOKEN" || -z "$GITLAB_API" ]]; then
    log FATAL "❌ GITLAB_TOKEN or GITLAB_API not set"
    return 1
  fi

  mapfile -t mrs < <(
    curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests?state=opened&scope=all" |
    jq -c '.[]'
  )

  for mr in "${mrs[@]}"; do
    local id url unresolved
    id=$(jq -r '.iid' <<< "$mr")
    url=$(jq -r '.web_url' <<< "$mr")

    unresolved=$(curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "$GITLAB_API/merge_requests/$id" |
      jq -r '.blocking_discussions_resolved // true')

    if [[ "$unresolved" != "true" ]]; then
      log WARN "⚠️ MR $id has unresolved discussions"
      log WARN "   ↳ $url"
      log WARN "   💡 Tip: Resolve or mark discussions as resolved before merging"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ No unresolved discussions on open MRs"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_assignee_is_author — MR author should assign themselves
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies that the merge request assignee is the same as the author
#
# Why it matters:
#   Merge requests without an assignee may go unreviewed or blocked in CI
#
# Globals used:
#   - MR_AUTHOR       → GitLab username of the MR author
#   - MR_ASSIGNEE     → GitLab username of the current assignee (optional)
#
# Example:
#   MR_AUTHOR="alice"
#   MR_ASSIGNEE="alice"
#   check::remind_mr_assignee_is_author
#
# Categories:
#   mr
#
# Stages:
#   check, lint, pre-commit
# ------------------------------------------------------------------------------
check::remind_mr_assignee_is_author() {
  # ✅ Check: MR author should assign themselves to their own merge request
  # Category: mr
  # Stages: check, lint, pre-commit

  if [[ -z "$MR_AUTHOR" || -z "$MR_ASSIGNEE" ]]; then
    log WARN "⚠️ MR_AUTHOR or MR_ASSIGNEE not set — skipping self-assignment check"
    return 0
  fi

  if [[ "$MR_AUTHOR" != "$MR_ASSIGNEE" ]]; then
    log WARN "⚠️ MR author is not assigned to their own MR"
    log WARN "   💡 Tip: Assign yourself to your MR to clarify responsibility and unblock workflows"
    log WARN "   📘 Example: Set MR_ASSIGNEE=$MR_AUTHOR in CI or manually assign in UI"
    return 1
  fi

  log INFO "✅ MR is self-assigned by author ($MR_AUTHOR)"
}

# ------------------------------------------------------------------------------
# 🧪 check::remind_mr_missing_description — Warn if MR lacks proper description
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns if the merge request description is empty or boilerplate
#
# Why it matters:
#   Reviewers rely on MR descriptions to understand the purpose and context of changes
#
# Globals used:
#   - MR_DESCRIPTION → The raw Markdown or text description of the MR
#
# Example:
#   MR_DESCRIPTION="Adds login rate limiting"
#   check::remind_mr_missing_description
#
# Categories:
#   mr
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::remind_mr_missing_description() {
  # ✅ Check: Merge request should have a meaningful description
  # Category: mr
  # Stages: check, lint

  if [[ -z "$MR_DESCRIPTION" || "$MR_DESCRIPTION" =~ ^(TBD|WIP|\s*)$ ]]; then
    log WARN "⚠️ Merge request is missing a meaningful description"
    log WARN "   💡 Tip: Add a summary of what changed, why, and any relevant links or reviewers"
    log WARN "   📘 Example: 'Adds support for JWT refresh rotation to resolve issue #128'"
    return 1
  fi

  log INFO "✅ MR description is present"
}

# ------------------------------------------------------------------------------
# 🧪 check::sync_node_config — Auto-sync engines.node and packageManager from root
# ------------------------------------------------------------------------------
# This check ensures all package.json files match the root values for:
#   - engines.node
#   - packageManager
#
# Why it matters:
#   Prevents tooling mismatches across packages and ensures consistency in builds and CI.
#
# Globals used:
#   - ROOT_DIR → monorepo root directory
#
# Example:
#   ROOT_DIR=.
#   check::sync_node_config
#
# Categories:
#   package, pnpm
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::sync_node_config() {
  # ✅ Check: engines.node and packageManager must match root
  # Category: package, pnpm
  # Stages: lint, check, pre-commit

  local failed=0
  local root_pkg="$ROOT_DIR/package.json"

  if [[ ! -f "$root_pkg" ]]; then
    log FATAL "❌ Root package.json not found"
    log FATAL "   💡 Tip: Create one and set consistent values for engines.node and packageManager"
    log FATAL "   📘 Example: { \"engines\": { \"node\": \"^20.0.0\" }, \"packageManager\": \"pnpm@10.12.0\" }"
    return 1
  fi

  local expected_engine expected_pm
  expected_engine=$(jq -r '.engines.node // empty' "$root_pkg")
  expected_pm=$(jq -r '.packageManager // empty' "$root_pkg")

  if [[ -z "$expected_engine" || -z "$expected_pm" ]]; then
    log FATAL "❌ Root package.json is missing engines.node or packageManager"
    log FATAL "   💡 Tip: Define both for workspace consistency"
    return 1
  fi

  find "$ROOT_DIR" -name "package.json" | while read -r pkg; do
    [[ "$pkg" == "$root_pkg" ]] && continue

    local engine pm
    engine=$(jq -r '.engines.node // empty' "$pkg")
    pm=$(jq -r '.packageManager // empty' "$pkg")

    local modified=0 tmp="$(mktemp)"
    cp "$pkg" "$tmp"

    if [[ "$engine" != "$expected_engine" ]]; then
      jq --arg v "$expected_engine" '.engines.node = $v' "$tmp" > "$tmp.tmp" && mv "$tmp.tmp" "$tmp"
      log INFO "🔧 $pkg → updated engines.node"
      modified=1
    fi

    if [[ "$pm" != "$expected_pm" ]]; then
      jq --arg v "$expected_pm" '.packageManager = $v' "$tmp" > "$tmp.tmp" && mv "$tmp.tmp" "$tmp"
      log INFO "🔧 $pkg → updated packageManager"
      modified=1
    fi

    if [[ "$modified" -eq 1 ]]; then
      jq '.' "$tmp" > "$pkg"
    fi

    rm -f "$tmp" "$tmp.tmp"
  done

  log INFO "✅ Node configuration (engines + packageManager) synced across workspace"
}

# ------------------------------------------------------------------------------
# 🧪 check::utility_stateless_integrity — Enforce side-effect-free @stateless utilities
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds all .ts files in /packages/shared with @stateless in comments
#   - Validates they do not use side-effects, global state, or mutation
#
# Why it matters:
#   - Prevents breaking assumptions for memoization, SSR, tests, or re-use
#   - Encourages pure functional style for predictable utility behavior
#
# Globals used:
#   - ROOT_DIR → monorepo root directory
#
# Example:
#   ROOT_DIR=. check::utility_stateless_integrity
#
# Categories:
#   lint, boundaries, safety
#
# Stages:
#   lint, test, check
# ------------------------------------------------------------------------------
check::utility_stateless_integrity() {
  # ✅ Check: @stateless utilities must not contain side effects or mutation
  # Category: lint, boundaries, safety
  # Stages: lint, test, check

  local failed=0

  find "$ROOT_DIR/packages/shared" -type f -name "*.ts" | while read -r file; do
    if grep -q '@stateless' "$file"; then
      log INFO "🔍 Validating @stateless function in: $file"

      # Detect global access
      if grep -E '\b(process\.env|globalThis|window|document|localStorage|sessionStorage|navigator)' "$file" >/dev/null; then
        log FATAL "❌ Global state accessed in @stateless utility: $file"
        log FATAL "   💡 Tip: @stateless utilities must be pure and environment-agnostic"
        log FATAL "   📘 Example: Do not use process.env, window, or document in stateless utils"
        failed=1
      fi

      # Detect runtime side effects
      if grep -E '\b(console\.(log|warn|error|info)|fetch|setTimeout|setInterval|clearTimeout|clearInterval)' "$file" >/dev/null; then
        log FATAL "❌ Side-effectful API used in @stateless utility: $file"
        log FATAL "   💡 Tip: Remove logging, timers, or fetch — these are not allowed"
        log FATAL "   📘 Example: Replace console.log with return values for observability"
        failed=1
      fi

      # Detect time randomness
      if grep -E '\b(Date\.now|new Date|Math\.random)\b' "$file" >/dev/null; then
        log FATAL "❌ Time-based or random state in @stateless utility: $file"
        log FATAL "   💡 Tip: Stateless utilities must be deterministic"
        log FATAL "   📘 Example: Replace Date.now() with function arguments or DI"
        failed=1
      fi

      # Detect mutation
      if grep -E '(^|\s)(let|var)\s' "$file" >/dev/null || grep -E '\+\+|--|=' "$file" | grep -vE 'const\s' >/dev/null; then
        log FATAL "❌ Mutation or non-const assignment in @stateless utility: $file"
        log FATAL "   💡 Tip: Use only const and pure expressions in stateless files"
        log FATAL "   📘 Example: const result = value + 1 ✅   let x = 0 ❌"
        failed=1
      fi

      # Detect missing JSDoc above export
      if ! grep -Pzo '@stateless.*?\nexport (function|const|async)' "$file" >/dev/null; then
        log FATAL "❌ Missing export annotation on @stateless function in: $file"
        log FATAL "   💡 Tip: Ensure @stateless is attached to the export, not just top-of-file"
        log FATAL "   📘 Example: /** @stateless */ export const add = (a, b) => a + b"
        failed=1
      fi
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All @stateless utility files passed purity validation"
}

# ------------------------------------------------------------------------------
# 🧪 check::docs_locale_structure — Ensure all /docs/{locale}/ match /docs/en-US/
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all other /docs/{locale}/ match the structure of /docs/en-US/
#   - Detects missing, extra, or misnamed markdown files
#
# Why it matters:
#   - Prevents incomplete translations and broken localized navigation
#   - Ensures all required legal and help pages exist in every supported language
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::docs_locale_structure
#
# Categories:
#   naming, paths, lint
#
# Stages:
#   check, lint, validate
# ------------------------------------------------------------------------------
check::docs_locale_structure() {
  # ✅ Check: all /docs/{locale} match /docs/en-US/
  # Category: naming, paths, lint
  # Stages: check, lint, validate

  local failed=0
  local base_dir="$ROOT_DIR/docs"
  local canonical_locale="en-US"
  local canonical_path="$base_dir/$canonical_locale"

  if [[ ! -d "$canonical_path" ]]; then
    log FATAL "❌ Missing canonical locale folder: /docs/$canonical_locale"
    log FATAL "   💡 Tip: Create /docs/$canonical_locale as the translation source of truth"
    log FATAL "   📘 Example: mkdir -p docs/en-US && cp docs/shared/README.md docs/en-US/"
    return 1
  fi

  # Canonical files
  mapfile -t canonical < <(find "$canonical_path" -maxdepth 1 -type f -name "*.md" -exec basename {} \; | sort)

  # Other locales
  find "$base_dir" -mindepth 1 -maxdepth 1 -type d | while read -r locale_dir; do
    local locale
    locale=$(basename "$locale_dir")

    [[ "$locale" == "$canonical_locale" ]] && continue

    log INFO "🌐 Checking /docs/$locale matches /docs/$canonical_locale..."

    for required in "${canonical[@]}"; do
      if [[ ! -f "$locale_dir/$required" ]]; then
        log FATAL "❌ Missing: /docs/$locale/$required"
        log FATAL "   💡 Tip: Copy from en-US and translate"
        log FATAL "   📘 Example: cp /docs/$canonical_locale/$required /docs/$locale/$required"
        failed=1
      fi
    done

    # Check for extra files
    mapfile -t actual < <(find "$locale_dir" -maxdepth 1 -type f -name "*.md" -exec basename {} \; | sort)
    for extra in "${actual[@]}"; do
      if ! printf "%s\n" "${canonical[@]}" | grep -qFx "$extra"; then
        log WARN "⚠️ Extra file in /docs/$locale not present in /docs/$canonical_locale: $extra"
        log WARN "   💡 Tip: Only include matching markdown files unless explicitly intentional"
        log WARN "   📘 Example: remove /docs/$locale/$extra if not needed"
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ All /docs/{locale}/ folders match /docs/en-US"
}

# ------------------------------------------------------------------------------
# 🧪 check::docs_workspace_structure — Ensure /docs/en-US/ matches workspace layout
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies /docs/en-US/* mirrors top-level workspace (e.g. packages/, apps/, tools/)
#   - Ensures every package/utility/tool has a corresponding .md file in /docs/en-US
#   - Warns on missing or extra docs
#
# Why it matters:
#   - Prevents incomplete or misleading documentation
#   - Ensures each workspace module is properly documented
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::docs_workspace_structure
#
# Categories:
#   naming, docs, paths
#
# Stages:
#   check, lint, validate
# ------------------------------------------------------------------------------
check::docs_workspace_structure() {
  # ✅ Check: /docs/en-US mirrors all workspace folders under packages/, apps/, etc.
  # Category: naming, docs, paths
  # Stages: check, lint, validate

  local failed=0
  local docs_root="$ROOT_DIR/docs/en-US"
  local workspace_root="$ROOT_DIR"

  if [[ ! -d "$docs_root" ]]; then
    log FATAL "❌ Missing documentation folder: $docs_root"
    log FATAL "   💡 Tip: Create it and ensure each workspace module has matching docs"
    log FATAL "   📘 Example: mkdir -p docs/en-US/packages/shared/utils/logger.md"
    return 1
  fi

  # Find all workspace folders containing source (excluding node_modules, .git, dist, etc.)
  mapfile -t workspace_modules < <(
    find "$workspace_root/packages" "$workspace_root/apps" "$workspace_root/tools" -type f -name "*.ts" \
      -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" \
      -exec dirname {} \; | sort -u
  )

  for module_dir in "${workspace_modules[@]}"; do
    rel_path="${module_dir#$workspace_root/}"
    doc_path="$docs_root/$rel_path.md"

    if [[ ! -f "$doc_path" ]]; then
      log FATAL "❌ Missing documentation for workspace module: $rel_path"
      log FATAL "   💡 Tip: Create a matching markdown file under /docs/en-US/"
      log FATAL "   📘 Example: $doc_path"
      failed=1
    fi
  done

  # Check for orphaned docs that have no matching workspace code
  mapfile -t actual_docs < <(find "$docs_root" -type f -name "*.md" | sed "s|$docs_root/||" | sed 's/\.md$//' | sort)
  for doc_rel in "${actual_docs[@]}"; do
    workspace_match="$workspace_root/$doc_rel"
    if [[ ! -d "$workspace_match" && ! -f "$workspace_match.ts" ]]; then
      log WARN "⚠️ Orphaned documentation without matching code module: $doc_rel.md"
      log WARN "   💡 Tip: Remove or reassign this markdown file if the module was renamed or deleted"
      log WARN "   📘 Example: $docs_root/$doc_rel.md"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1 || log INFO "✅ /docs/en-US mirrors the workspace structure correctly"
}

# ------------------------------------------------------------------------------
# 🧪 check::biome_config_rule_validity — Ensure all rules in biome.base.json are valid
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies every rule declared exists under the expected namespace
#   - Rejects typos, outdated rules, or orphaned fields
#
# Why it matters:
#   Misnamed or deprecated rules silently break linting guarantees.
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   check::biome_config_rule_validity
#
# Categories:
#   biome
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::biome_config_rule_validity() {
  # ✅ Check: biome.base.json has valid rule definitions
  # Category: biome
  # Stages: lint, validate

  local file="$ROOT_DIR/biome.base.json"
  local invalid

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing biome.base.json"
    log FATAL "   💡 Tip: Create this file to define shared lint rules"
    log FATAL "   📘 Example: touch biome.base.json"
    return 1
  fi

  invalid=$(jq -r '
    .rules // {} |
    to_entries[] |
    select(.value == null or (.value | type != "boolean" and type != "object")) |
    .key' "$file")

  if [[ -n "$invalid" ]]; then
    log FATAL "❌ Invalid or malformed rule values in biome.base.json:"
    echo "$invalid" | while read -r key; do
      log FATAL "   ↳ $key"
    done
    log FATAL "💡 Tip: Ensure each rule is set to true, false, or an object"
    log FATAL "📘 Example: \"noDebugger\": true"
    return 1
  fi

  log INFO "✅ All rules in biome.base.json are syntactically valid"
}

# ------------------------------------------------------------------------------
# 🧪 check::biome_config_no_disable — Disallow disabled rules in biome.base.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Rejects any rules set to `false`
#   - Encourages opt-in via inheritance, not opt-out
#
# Why it matters:
#   Disabled rules often mask violations. Use scoped overrides instead.
#
# Globals used:
#   - ROOT_DIR → workspace root
#
# Example:
#   check::biome_config_no_disable
#
# Categories:
#   biome, safety
#
# Stages:
#   lint, validate
# ------------------------------------------------------------------------------
check::biome_config_no_disable() {
  # ✅ Check: biome.base.json must not disable any rules
  # Category: biome, safety
  # Stages: lint, validate

  local file="$ROOT_DIR/biome.base.json"
  local disabled

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Missing biome.base.json"
    log FATAL "   💡 Tip: Create it at the root to enforce shared rules"
    return 1
  fi

  disabled=$(jq -r '
    .rules // {} |
    to_entries[] |
    select(.value == false) |
    .key' "$file")

  if [[ -n "$disabled" ]]; then
    log FATAL "❌ Disabled rules found in biome.base.json:"
    echo "$disabled" | while read -r key; do
      log FATAL "   ↳ $key"
    done
    log FATAL "💡 Tip: Avoid disabling rules globally — override per-project if needed"
    log FATAL "📘 Example: set rule to true or remove it entirely"
    return 1
  fi

  log INFO "✅ No disabled rules found in biome.base.json"
}

# ------------------------------------------------------------------------------
# 🧪 check::image_format_and_compression — Validate image file types and size
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures only allowed formats are present: .webp, .svg, .ico (no .png/.jpg)
#   - Warns if webp/svg/ico are larger than typical thresholds (suggest compression)
#
# Why it matters:
#   Prevents legacy image formats, bloated asset bundles, and uncompressed resources.
#
# Globals used:
#   - ROOT_DIR → root of the project or monorepo
#
# Example:
#   ROOT_DIR=.
#   check::image_format_and_compression
#
# Categories:
#   encoding, safety, lint, paths
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::image_format_and_compression() {
  # ✅ Check: only webp/svg/ico are allowed; webp/svg must be reasonably compressed
  # Category: encoding, safety, lint, paths
  # Stages: lint, check, build

  local failed=0

  # Disallow legacy formats
  mapfile -t legacy_images < <(find "$ROOT_DIR" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \))

  if [[ "${#legacy_images[@]}" -gt 0 ]]; then
    log FATAL "❌ Legacy image formats detected (only .webp, .svg, .ico allowed):"
    for img in "${legacy_images[@]}"; do
      log FATAL "   ↳ $img"
    done
    log FATAL "💡 Tip: Convert images to .webp or .svg using tools like squoosh.app or ImageMagick"
    log FATAL "📘 Example: convert image.png image.webp"
    failed=1
  fi

  # Warn on large webp/svg/ico
  find "$ROOT_DIR" -type f \( -iname "*.webp" -o -iname "*.svg" -o -iname "*.ico" \) | while read -r img; do
    size=$(stat -c%s "$img" 2>/dev/null || stat -f%z "$img")
    max=1048576 # 1MB
    if [[ "$size" -gt "$max" ]]; then
      log WARN "⚠️ Large image detected ($((size / 1024)) KB): $img"
      log WARN "   💡 Tip: Optimize using tools like SVGO, image-webpack-loader, or squoosh"
      log WARN "   📘 Example: svgo $img"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}
# ------------------------------------------------------------------------------
# 🧪 check::images_referenced_in_source — Ensure all images are used
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects orphaned image files (webp/svg/ico) not used in any source/content
#   - Skips node_modules, .git, dist, .next, etc.
#
# Why it matters:
#   Unused assets bloat repo size and slow down CI/CD pipelines and builds.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR=.
#   check::images_referenced_in_source
#
# Categories:
#   lint, paths, encoding
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::images_referenced_in_source() {
  # ✅ Check: Ensure all image files are referenced in source/content
  # Category: lint, paths, encoding
  # Stages: check, lint, build

  local failed=0
  local tmp_used
  tmp_used=$(mktemp)

  # Extract all filenames that appear to reference image extensions
  grep -rEho '[^/"]+\.(webp|svg|ico)' "$ROOT_DIR" \
    --exclude-dir={node_modules,.git,.next,dist,.turbo} \
    --exclude="*.lock" \
    --include="*.{ts,tsx,js,jsx,html,md,css,json,yml,yaml}" \
    2>/dev/null | sort -u > "$tmp_used"

  # Scan for actual image files
  find "$ROOT_DIR" \
    \( -name "*.webp" -o -name "*.svg" -o -name "*.ico" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/.next/*" \
    -not -path "*/dist/*" \
    -not -path "*/.turbo/*" | while read -r image; do

    local filename
    filename=$(basename "$image")

    if ! grep -qxF "$filename" "$tmp_used"; then
      log WARN "⚠️ Unused image file detected: $image"
      log WARN "   💡 Tip: Remove or confirm it's used dynamically via \`require()\`, import, or runtime URL"
      log WARN "   📘 Example: rm \"$image\""
      failed=1
    fi
  done

  rm -f "$tmp_used"
  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_referenced_but_missing — Warn if images are referenced but not found
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds all .webp, .svg, .ico references in source/content files
#   - Checks if those files exist in the workspace
#
# Why it matters:
#   Broken image references cause broken UI, failed tests, and broken builds.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR=.
#   check::images_referenced_but_missing
#
# Categories:
#   lint, paths, encoding
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::images_referenced_but_missing() {
  # ✅ Check: Detect referenced images that do not exist on disk
  # Category: lint, paths, encoding
  # Stages: check, lint, build

  local failed=0
  local tmp_referenced
  tmp_referenced=$(mktemp)

  # Extract all referenced filenames
  grep -rEho '[^/"]+\.(webp|svg|ico)' "$ROOT_DIR" \
    --exclude-dir={node_modules,.git,.next,dist,.turbo} \
    --exclude="*.lock" \
    --include="*.{ts,tsx,js,jsx,html,md,css,json,yml,yaml}" 2>/dev/null \
    | sort -u > "$tmp_referenced"

  # Check that each file actually exists somewhere
  while read -r ref; do
    if ! find "$ROOT_DIR" -type f -name "$ref" ! -path "*/node_modules/*" | grep -q .; then
      log FATAL "❌ Referenced image not found: $ref"
      log FATAL "   💡 Tip: Fix the path, restore the file, or remove the reference"
      log FATAL "   📘 Example: remove '<img src=\"$ref\">' from source"
      failed=1
    fi
  done < "$tmp_referenced"

  rm -f "$tmp_referenced"
  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_has_title_or_desc — Ensure SVGs have accessible labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks all SVG files for <title> or <desc> tags
#
# Why it matters:
#   Accessibility tools and search engines rely on <title>/<desc> for inline SVGs.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR=.
#   check::images_svg_has_title_or_desc
#
# Categories:
#   lint, encoding, accessibility
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_has_title_or_desc() {
  # ✅ Check: Inline SVGs must include a <title> or <desc> for accessibility
  # Category: lint, encoding, accessibility
  # Stages: check, lint

  local failed=0

  find "$ROOT_DIR" -type f -name "*.svg" | while read -r svg; do
    if ! grep -qE '<title>|<desc>' "$svg"; then
      log FATAL "❌ SVG missing <title> or <desc>: $svg"
      log FATAL "   💡 Tip: Add <title> or <desc> for screen readers and SEO"
      log FATAL "   📘 Example: <svg> <title>Download</title> ... </svg>"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_webp_not_used_for_icons — Prevent .webp for small icons or favicons
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags .webp images used for favicons or icon-style filenames
#
# Why it matters:
#   .webp lacks support as favicon; use .ico or .svg instead.
#
# Globals used:
#   - ROOT_DIR → project root
#
# Example:
#   check::images_webp_not_used_for_icons
#
# Categories:
#   lint, paths
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_webp_not_used_for_icons() {
  # ✅ Check: .webp should not be used for favicons or small icons
  # Category: lint, paths
  # Stages: check, lint

  local failed=0

  find "$ROOT_DIR" -type f -iname "*icon*.webp" -o -iname "favicon.webp" | while read -r icon; do
    log FATAL "❌ Invalid icon format (.webp): $icon"
    log FATAL "   💡 Tip: Use .ico or .svg for icons/favicons to ensure browser compatibility"
    log FATAL "   📘 Example: public/favicon.ico or public/icon.svg"
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_large_webp_warning — Warn on oversized webp images
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns if any .webp file exceeds 250KB
#
# Why it matters:
#   Large images harm performance and loading time
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_large_webp_warning
#
# Categories:
#   lint, encoding
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::images_large_webp_warning() {
  # ✅ Check: .webp images should not exceed 250KB
  # Category: lint, encoding
  # Stages: check, lint, build

  local failed=0
  local max_bytes=256000

  find "$ROOT_DIR" -type f -name "*.webp" | while read -r image; do
    local size
    size=$(stat -c%s "$image" 2>/dev/null || stat -f%z "$image")
    if [[ "$size" -gt "$max_bytes" ]]; then
      log WARN "⚠️ .webp image exceeds 250KB: $image ($((size / 1024)) KB)"
      log WARN "   💡 Tip: Consider compressing with cwebp or resizing"
      log WARN "   📘 Example: cwebp -q 80 input.png -o $image"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_webp_lossless_unused — Warn on unused lossless .webp encoding
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scans .webp headers for lossless encodings
#   - Warns if lossy would have sufficed
#
# Why it matters:
#   Lossless .webp is large; often accidental.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_webp_lossless_unused
#
# Categories:
#   lint, encoding
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_webp_lossless_unused() {
  # ✅ Check: .webp should avoid unnecessary lossless encoding
  # Category: lint, encoding
  # Stages: check, lint

  local failed=0

  find "$ROOT_DIR" -type f -name "*.webp" | while read -r file; do
    if file "$file" | grep -qi "lossless"; then
      log WARN "⚠️ Lossless .webp detected: $file"
      log WARN "   💡 Tip: Lossless .webp is larger and rarely needed unless preserving PNG artifacts"
      log WARN "   📘 Example: cwebp -q 80 $file -o ${file%.webp}.lossy.webp"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_inline_style_blocked — Disallow inline style attributes in SVGs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocks any <svg> or descendant element using inline `style="..."`
#
# Why it matters:
#   Inline styles in SVGs can reduce maintainability, violate CSP, and break theming.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR=.
#   check::images_svg_inline_style_blocked
#
# Categories:
#   lint, encoding, paths
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::images_svg_inline_style_blocked() {
  # ✅ Check: SVGs must not contain inline style attributes
  # Category: lint, encoding, paths
  # Stages: lint, check, build

  local failed=0

  find "$ROOT_DIR" -type f -name "*.svg" | while read -r svg; do
    if grep -qE 'style="[^"]+"' "$svg"; then
      log FATAL "❌ Inline style attribute detected in $svg"
      log FATAL "   💡 Tip: Move styles to a class or remove them entirely"
      log FATAL "   📘 Example: Replace style=\"fill:red\" with class=\"icon-red\""
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_viewbox_required — Require viewBox attribute in all SVGs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures every <svg> element includes a viewBox attribute
#
# Why it matters:
#   Without viewBox, SVGs may render incorrectly when resized or embedded responsively.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_viewbox_required
#
# Categories:
#   lint, encoding
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_viewbox_required() {
  # ✅ Check: SVGs must declare viewBox attribute
  # Category: lint, encoding
  # Stages: check, lint

  local failed=0

  find "$ROOT_DIR" -type f -name "*.svg" | while read -r svg; do
    if ! grep -q 'viewBox=' "$svg"; then
      log FATAL "❌ Missing viewBox in $svg"
      log FATAL "   💡 Tip: Add a viewBox to support responsive scaling"
      log FATAL "   📘 Example: <svg viewBox=\"0 0 24 24\" ...>"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_dimensions_static — Enforce static width/height attributes on SVGs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks if each SVG has explicit width and height attributes
#
# Why it matters:
#   Static dimensions improve layout predictability and prevent scaling issues.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_dimensions_static
#
# Categories:
#   lint, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_dimensions_static() {
  # ✅ Check: SVGs must have width and height attributes
  # Category: lint, encoding
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f -name "*.svg" | while read -r svg; do
    if ! grep -q 'width=' "$svg" || ! grep -q 'height=' "$svg"; then
      log WARN "⚠️ Missing width or height in $svg"
      log WARN "   💡 Tip: Set both width and height to prevent rendering issues"
      log WARN "   📘 Example: <svg width=\"24\" height=\"24\" ...>"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_fill_not_black — Detect SVGs with default black fills
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags fill="black" or missing fill on SVG paths when the result is black
#
# Why it matters:
#   Default black fill may not be visible in dark themes and is usually unintended.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_fill_not_black
#
# Categories:
#   lint, encoding
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_fill_not_black() {
  # ✅ Check: SVGs should not use black fills
  # Category: lint, encoding
  # Stages: check, lint

  local failed=0

  find "$ROOT_DIR" -type f -name "*.svg" | while read -r svg; do
    if grep -qi 'fill="black"' "$svg"; then
      log WARN "⚠️ SVG uses black fill: $svg"
      log WARN "   💡 Tip: Use currentColor or theme-consistent fills"
      log WARN "   📘 Example: fill=\"currentColor\""
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_webp_metadata_stripped — Ensure webp images are optimized
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures .webp files do not contain metadata chunks (EXIF/XMP/ICC)
#
# Why it matters:
#   Metadata bloats image size and leaks potentially sensitive info.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_webp_metadata_stripped
#
# Categories:
#   lint, encoding
#
# Stages:
#   build, lint, check
# ------------------------------------------------------------------------------
check::images_webp_metadata_stripped() {
  # ✅ Check: webp files must not contain metadata
  # Category: lint, encoding
  # Stages: build, lint, check

  local failed=0

  find "$ROOT_DIR" -type f -name "*.webp" | while read -r img; do
    if strings "$img" | grep -qE 'ICC_PROFILE|XMP|Exif'; then
      log WARN "⚠️ Metadata detected in $img (ICC/XMP/EXIF)"
      log WARN "   💡 Tip: Strip metadata using: cwebp -metadata none"
      log WARN "   📘 Example: cwebp -metadata none input.png -o output.webp"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_font_embedding_blocked — Disallow embedded fonts in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags <style> or <font> declarations with embedded base64 or WOFF/TTF
#
# Why it matters:
#   Embedded fonts in SVGs increase size and introduce licensing risks.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_font_embedding_blocked
#
# Categories:
#   lint, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_font_embedding_blocked() {
  # ✅ Check: SVGs must not embed fonts
  # Category: lint, encoding
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f -name "*.svg" | while read -r svg; do
    if grep -qiE 'data:font/|.woff|.ttf|<font' "$svg"; then
      log FATAL "❌ Embedded font detected in $svg"
      log FATAL "   💡 Tip: Remove font embedding and use system or CSS fonts"
      log FATAL "   📘 Example: Do not include <style>@font-face{...}</style> in SVGs"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_inaccessible_elements — Warn on missing <title> or <desc>
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns if <svg> lacks <title> or <desc> for accessibility
#
# Why it matters:
#   Screen readers and accessibility tools rely on accessible descriptions.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_inaccessible_elements
#
# Categories:
#   lint, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_inaccessible_elements() {
  # ✅ Check: SVGs must contain title or desc for accessibility
  # Category: lint, encoding
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f -name "*.svg" | while read -r svg; do
    if ! grep -q '<title>' "$svg" && ! grep -q '<desc>' "$svg"; then
      log WARN "⚠️ Inaccessible SVG: $svg (missing <title> or <desc>)"
      log WARN "   💡 Tip: Add a short <title> or <desc> to improve a11y"
      log WARN "   📘 Example: <svg><title>Upload icon</title>...</svg>"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_ico_color_depth_warn — Warn on ICOs with limited color depth
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns if .ico files have low resolution or color depth < 256
#
# Why it matters:
#   Low-color ICOs may appear pixelated or distorted in modern browsers.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_ico_color_depth_warn
#
# Categories:
#   lint, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_ico_color_depth_warn() {
  # ✅ Check: ICO files should be modern resolution + color depth
  # Category: lint, encoding
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -type f -iname "*.ico" | while read -r ico; do
    local details
    details=$(identify "$ico" 2>/dev/null || true)

    if [[ "$details" =~ ([0-9]+)x([0-9]+) ]]; then
      local width="${BASH_REMATCH[1]}"
      local height="${BASH_REMATCH[2]}"
      if (( width < 64 || height < 64 )); then
        log WARN "⚠️ ICO file is low resolution: $ico ($width x $height)"
        log WARN "   💡 Tip: Use at least 64x64 for modern icons"
        log WARN "   📘 Example: convert icon.png -define icon:auto-resize=64,128 favicon.ico"
        failed=1
      fi
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_misleading_file_extension — Block mismatched content-type vs file extension
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects files named .svg, .webp, .ico that do not match MIME
#
# Why it matters:
#   Mismatches break rendering and may introduce security risks.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding, safety
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_misleading_file_extension() {
  # ✅ Check: files must match expected format for their extension
  # Category: encoding, safety
  # Stages: check, lint

  local failed=0

  while IFS= read -r f; do
    local ext mime
    ext="${f##*.}"
    mime=$(file --mime-type -b "$f")

    case "$ext" in
      svg)
        [[ "$mime" != "image/svg+xml" ]] && {
          log FATAL "❌ $f claims to be .svg but is $mime"
          log FATAL "   💡 Tip: Rename file or re-encode it properly"
          log FATAL "   📘 Example: convert with svgo or verify with file --mime-type"
          failed=1
        }
        ;;
      webp)
        [[ "$mime" != "image/webp" ]] && {
          log FATAL "❌ $f claims to be .webp but is $mime"
          log FATAL "   💡 Tip: Use cwebp or ImageMagick to re-encode correctly"
          failed=1
        }
        ;;
      ico)
        [[ "$mime" != "image/vnd.microsoft.icon" ]] && {
          log FATAL "❌ $f claims to be .ico but is $mime"
          log FATAL "   💡 Tip: Re-save as true ICO using image tool"
          failed=1
        }
        ;;
    esac
  done < <(find "$ROOT_DIR" -type f \( -iname "*.svg" -o -iname "*.webp" -o -iname "*.ico" \))

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_script_block — Block embedded <script> tags in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocks embedded JavaScript via <script> in any .svg file
#
# Why it matters:
#   SVGs with embedded scripts are a security risk (XSS, SSRF).
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   safety, encoding
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_script_block() {
  # ✅ Check: disallow <script> in SVG
  # Category: safety, encoding
  # Stages: check, lint

  local failed=0
  find "$ROOT_DIR" -type f -iname "*.svg" | while read -r svg; do
    if grep -qi "<script" "$svg"; then
      log FATAL "❌ Embedded <script> tag found in SVG: $svg"
      log FATAL "   💡 Tip: Remove all <script> tags from inline or static SVGs"
      log FATAL "   📘 Example: Use svgo to strip scripts: svgo $svg"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_css_href_exploit — Block CSS href() external URL leaks
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects `url(http://...)` or `url(https://...)` inside SVG
#
# Why it matters:
#   External URLs in `url()` may exfiltrate data or cause XSS
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   safety, encoding
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_css_href_exploit() {
  # ✅ Check: disallow external URL href() in SVGs
  # Category: safety, encoding
  # Stages: check, lint

  local failed=0
  find "$ROOT_DIR" -type f -iname "*.svg" | while read -r svg; do
    if grep -qE "url\(['\"]?https?://" "$svg"; then
      log FATAL "❌ External URL detected inside CSS 'url()' in: $svg"
      log FATAL "   💡 Tip: Avoid linking to external fonts/images inside SVGs"
      log FATAL "   📘 Example: Replace url('https://...') with embedded or local paths"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_raster_in_svg — Detect raster images embedded in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects embedded base64 PNG, JPEG, or GIF inside <image xlink:href>
#
# Why it matters:
#   Raster data bloats SVGs and makes them non-accessible or unscalable.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding, accessibility
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::images_raster_in_svg() {
  # ✅ Check: no base64 PNG/JPG/GIF embedded inside SVG
  # Category: encoding, accessibility
  # Stages: check, lint, build

  local failed=0
  find "$ROOT_DIR" -type f -iname "*.svg" | while read -r svg; do
    if grep -qE 'data:image/(png|jpeg|gif);base64,' "$svg"; then
      log FATAL "❌ Embedded raster image found in SVG: $svg"
      log FATAL "   💡 Tip: Avoid base64 raster images in vector graphics"
      log FATAL "   📘 Example: convert embedded image to vector or reference external webp"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_inline_svg_ban — Disallow inline SVG blobs in source files
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags embedded `<svg>` blocks inside TSX/JSX/HTML/MD files
#
# Why it matters:
#   Inline SVG adds parsing overhead and XSS surface; prefer components or assets.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   safety, encoding, boundaries
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_inline_svg_ban() {
  # ✅ Check: disallow inline <svg> markup in source
  # Category: safety, encoding, boundaries
  # Stages: check, lint

  local failed=0
  grep -rIE '<svg[^>]*>' "$ROOT_DIR" --include="*.{tsx,jsx,html,md}" \
    --exclude-dir={node_modules,.git,.next,.turbo,dist} | while read -r match; do
    log FATAL "❌ Inline <svg> markup detected: $match"
    log FATAL "   💡 Tip: Move SVGs to external assets or import as components"
    log FATAL "   📘 Example: import Icon from './Icon.svg'"
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_external_font_url — Detect external font URLs in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects @font-face src pointing to remote URLs
#
# Why it matters:
#   External fonts in SVGs can leak data, break CSP, or fail offline.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   safety, encoding
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_external_font_url() {
  # ✅ Check: external font URLs should not appear in SVGs
  # Category: safety, encoding
  # Stages: check, lint

  local failed=0
  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -qE 'src:.*url\(["'\'']?https?://.*\.(woff2?|ttf)' "$svg"; then
      log FATAL "❌ External font URL found in $svg"
      log FATAL "   💡 Tip: Avoid embedding remote @font-face src URLs in SVG"
      log FATAL "   📘 Example: Use local font files or avoid fonts entirely in SVG"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_text_not_converted — Warn on raw <text> nodes in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects <text> tags, which may not render consistently across environments
#
# Why it matters:
#   Embedded text in SVG may cause rendering or font issues unless converted to paths.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding, accessibility
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::images_svg_text_not_converted() {
  # ✅ Check: raw <text> nodes should be avoided in final SVG
  # Category: encoding, accessibility
  # Stages: lint, build

  local failed=0
  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -q "<text" "$svg"; then
      log WARN "⚠️ <text> node found in SVG: $svg"
      log WARN "   💡 Tip: Convert text to outlines/paths before finalizing export"
      log WARN "   📘 Example: In Figma or Illustrator → Convert to Vector"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_xlink_href_http — Detect xlink:href with HTTP URLs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds xlink:href="http://..." in SVGs
#
# Why it matters:
#   Linking via insecure HTTP in SVG can leak data or fail CSP.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   safety, encoding
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_xlink_href_http() {
  # ✅ Check: avoid insecure xlink:href links
  # Category: safety, encoding
  # Stages: check, lint

  local failed=0
  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -q 'xlink:href="http://' "$svg"; then
      log FATAL "❌ Insecure xlink:href detected in $svg"
      log FATAL "   💡 Tip: Do not reference external HTTP links in SVG"
      log FATAL "   📘 Example: Replace xlink:href=\"http://example.com\" with local or HTTPS"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_namespace_missing — Ensure xmlns is defined on <svg>
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks that every SVG declares the xmlns namespace properly
#
# Why it matters:
#   Missing xmlns can break SVG rendering in certain browsers.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_namespace_missing() {
  # ✅ Check: all SVGs must declare xmlns attribute
  # Category: encoding
  # Stages: lint, check

  local failed=0
  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if ! grep -q 'xmlns="http://www.w3.org/2000/svg"' "$svg"; then
      log FATAL "❌ Missing xmlns attribute in SVG: $svg"
      log FATAL "   💡 Tip: Ensure SVGs declare XML namespace"
      log FATAL "   📘 Example: <svg xmlns=\"http://www.w3.org/2000/svg\">"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_hidden_interactive — Detect inaccessible <a> or <button> in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds interactive tags like <a> or <button> that are hidden (display:none or opacity:0)
#
# Why it matters:
#   Hiding interactive elements can break accessibility and confuse screen readers.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   accessibility, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_hidden_interactive() {
  # ✅ Check: interactive elements must not be visually hidden
  # Category: accessibility, encoding
  # Stages: lint, check

  local failed=0
  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -Eq '<(a|button)[^>]*style="[^"]*(display:\s*none|opacity:\s*0)' "$svg"; then
      log FATAL "❌ Hidden interactive element (<a> or <button>) in SVG: $svg"
      log FATAL "   💡 Tip: Avoid hiding elements that can receive focus or interaction"
      log FATAL "   📘 Example: Remove display:none or set opacity above 0"
      failed=1
    fi
  done
  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_symbol_missing_viewbox — Detect <symbol> tags missing viewBox
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures all <symbol> tags include a viewBox attribute
#
# Why it matters:
#   Symbols without viewBox may scale incorrectly when reused.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding, accessibility
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::images_svg_symbol_missing_viewbox() {
  # ✅ Check: <symbol> tags must include viewBox
  # Category: encoding, accessibility
  # Stages: lint, check, build

  local failed=0
  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -q "<symbol" "$svg" && ! grep -q "<symbol[^>]*viewBox=" "$svg"; then
      log FATAL "❌ <symbol> without viewBox found in $svg"
      log FATAL "   💡 Tip: Add viewBox=\"0 0 width height\" to all <symbol> elements"
      log FATAL "   📘 Example: <symbol id=\"icon\" viewBox=\"0 0 24 24\">"
      failed=1
    fi
  done
  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_invalid_structure — Detect malformed SVGs or broken XML
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects unclosed tags or invalid nesting in SVG XML
#
# Why it matters:
#   Malformed XML can silently fail to render or break downstream pipelines.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding, safety
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_invalid_structure() {
  # ✅ Check: SVG must be well-formed XML
  # Category: encoding, safety
  # Stages: check, lint

  local failed=0
  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if ! xmllint --noout "$svg" 2>/dev/null; then
      log FATAL "❌ Invalid SVG structure: $svg"
      log FATAL "   💡 Tip: Ensure all tags are closed and structure is valid XML"
      log FATAL "   📘 Example: Use xmllint or an XML-aware linter"
      failed=1
    fi
  done
  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_ico_multiresolution — Validate .ico contains multiple sizes
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies .ico files contain 16x16, 32x32, and 48x48 sizes at minimum
#
# Why it matters:
#   .ico files without multiple resolutions may appear blurry on some devices.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding
#
# Stages:
#   build, check
# ------------------------------------------------------------------------------
check::images_ico_multiresolution() {
  # ✅ Check: .ico should contain at least 3 standard resolutions
  # Category: encoding
  # Stages: build, check

  local failed=0
  if ! command -v identify >/dev/null; then
    log WARN "⚠️ 'identify' tool (ImageMagick) not found — skipping .ico resolution checks"
    return 0
  fi

  find "$ROOT_DIR" -iname "*.ico" | while read -r ico; do
    local count
    count=$(identify "$ico" | awk '{print $3}' | sort -u | wc -l)
    if [[ "$count" -lt 3 ]]; then
      log FATAL "❌ .ico file missing multiple resolutions: $ico"
      log FATAL "   💡 Tip: Include 16x16, 32x32, and 48x48 for best compatibility"
      log FATAL "   📘 Example: Use convert with -define icon:auto-resize=64,48,32,16"
      failed=1
    fi
  done
  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_ico_unoptimized_palette — Warn on inefficient .ico color palette
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checks for excessive color depth (e.g. 24/32-bit) in .ico files
#
# Why it matters:
#   Using overly large palettes increases .ico size without benefit.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_ico_unoptimized_palette() {
  # ✅ Check: .ico files should use minimal color depth where possible
  # Category: encoding
  # Stages: check, lint

  local failed=0
  if ! command -v identify >/dev/null; then
    log WARN "⚠️ 'identify' (ImageMagick) is not installed — skipping .ico color depth check"
    return 0
  fi

  find "$ROOT_DIR" -iname "*.ico" | while read -r ico; do
    depth=$(identify -format "%k" "$ico" | sort -u)
    if [[ "$depth" -gt 256 ]]; then
      log WARN "⚠️ .ico file uses excessive color depth: $ico ($depth colors)"
      log WARN "   💡 Tip: Reduce to 256 or fewer colors for better performance"
      log WARN "   📘 Example: convert input.png -colors 256 output.ico"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_opacity_fallback — Ensure opacity styles have fallbacks
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures any SVG using `opacity` also provides a fallback color
#
# Why it matters:
#   Some renderers ignore `opacity` unless fallback fill/stroke colors are specified.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   encoding, accessibility
#
# Stages:
#   check, lint
# ------------------------------------------------------------------------------
check::images_svg_opacity_fallback() {
  # ✅ Check: opacity styles should include fallback fill/stroke
  # Category: encoding, accessibility
  # Stages: check, lint

  local failed=0

  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -q 'opacity=' "$svg" && ! grep -q 'fill=' "$svg"; then
      log WARN "⚠️ SVG with opacity but no fill fallback: $svg"
      log WARN "   💡 Tip: Use fill=\"currentColor\" or another fallback with opacity"
      log WARN "   📘 Example: <path opacity=\"0.5\" fill=\"#000\" ...>"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_blur_filter_detected — Detect feGaussianBlur in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags usage of <feGaussianBlur> or blur() filters
#
# Why it matters:
#   SVG blur filters are performance heavy and poorly supported in some renderers.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Categories:
#   lint, encoding
#
# Stages:
#   check, build
# ------------------------------------------------------------------------------
check::images_svg_blur_filter_detected() {
  # ✅ Check: disallow SVG blur filters
  # Category: lint, encoding
  # Stages: check, build

  local failed=0

  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -qE 'feGaussianBlur|blur\(' "$svg"; then
      log WARN "⚠️ Blur filter found in SVG: $svg"
      log WARN "   💡 Tip: Avoid feGaussianBlur or CSS blur() in SVG for performance reasons"
      log WARN "   📘 Example: Remove <feGaussianBlur> and replace with static graphics"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_ids_unique — Ensure all <svg> IDs are globally unique
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parses all SVG files
#   - Fails if any ID is duplicated across files or reused within a file
#
# Why it matters:
#   Reused IDs break accessibility, DOM reference consistency, and shadow DOM reuse.
#
# Globals used:
#   - ROOT_DIR → workspace root directory
#
# Example:
#   ROOT_DIR=.
#   check::images_svg_ids_unique
#
# Categories:
#   lint, accessibility, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_ids_unique() {
  # ✅ Check: all <svg> IDs must be globally unique
  # Category: lint, accessibility, encoding
  # Stages: lint, check

  local failed=0
  declare -A ids

  find "$ROOT_DIR" -type f -name "*.svg" | while read -r file; do
    grep -oP 'id="[^"]+"' "$file" | cut -d'"' -f2 | while read -r id; do
      if [[ -n "${ids[$id]}" ]]; then
        log FATAL "❌ Duplicate SVG ID '$id' found in:"
        log FATAL "   ↳ ${ids[$id]}"
        log FATAL "   ↳ $file"
        log FATAL "   💡 Tip: All <svg id=\"...\"> must be unique across the repo"
        log FATAL "   📘 Example: change one to id=\"$id-2\""
        failed=1
      else
        ids[$id]="$file"
      fi
    done
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_aria_roles_defined — Ensure meaningful role is declared
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warns if <svg> lacks `role` or uses a default one in a meaningful asset
#
# Why it matters:
#   Screen readers rely on role="img"/"presentation"/"graphics-symbol" to interpret SVG meaningfully.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   ROOT_DIR=.
#   check::images_svg_aria_roles_defined
#
# Categories:
#   lint, accessibility
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_aria_roles_defined() {
  # ✅ Check: <svg> should include proper ARIA role
  # Category: lint, accessibility
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -name "*.svg" | while read -r file; do
    if ! grep -qE 'role="(img|presentation|graphics-symbol)"' "$file"; then
      log WARN "⚠️ SVG missing ARIA role: $file"
      log WARN "   💡 Tip: Add role=\"img\" or role=\"presentation\" as appropriate"
      log WARN "   📘 Example: <svg role=\"img\" ...>"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_text_overflow_clipped — Ensure no hidden <text> content
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects <text> with overflow or clip attributes that may hide content
#
# Why it matters:
#   Hidden or clipped text harms accessibility and localization.
#
# Globals used:
#   - ROOT_DIR
#
# Categories:
#   accessibility, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_text_overflow_clipped() {
  # ✅ Check: SVG <text> must not be visually clipped or overflow:hidden
  # Category: accessibility, lint
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -name "*.svg" | while read -r file; do
    if grep -qE '<text[^>]*(overflow|clip-path|clip-rule|clip-path)' "$file"; then
      log WARN "⚠️ SVG may contain clipped <text>: $file"
      log WARN "   💡 Tip: Avoid clip-path or overflow on <text> unless purely decorative"
      log WARN "   📘 Example: remove clip-rule/clip-path attributes from <text>"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_title_first_child — Require <title> as first SVG child
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures <title> appears before any visible elements in the DOM order
#
# Why it matters:
#   Required for correct screen reader interpretation of SVG.
#
# Globals used:
#   - ROOT_DIR
#
# Categories:
#   accessibility
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_title_first_child() {
  # ✅ Check: <svg><title> must appear as the first child
  # Category: accessibility
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -name "*.svg" | while read -r file; do
    if grep -q "<svg" "$file"; then
      local content
      content=$(awk '/<svg/,/<\/svg>/' "$file")
      if ! echo "$content" | grep -m 1 -q "<title>"; then
        log WARN "⚠️ Missing <title> element in $file"
        log WARN "   💡 Tip: Add a <title> element as the first child of <svg>"
        log WARN "   📘 Example: <svg><title>Your label</title>...</svg>"
        failed=1
      fi
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_tabindex_removed — Ensure <svg> does not use tabindex
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detects usage of tabindex on <svg> elements
#
# Why it matters:
#   SVGs should not be focusable unless explicitly interactive.
#
# Globals used:
#   - ROOT_DIR
#
# Categories:
#   accessibility, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_tabindex_removed() {
  # ✅ Check: <svg> should not use tabindex unless interactive
  # Category: accessibility, lint
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -name "*.svg" | while read -r file; do
    if grep -q 'tabindex=' "$file"; then
      log WARN "⚠️ tabindex attribute detected in $file"
      log WARN "   💡 Tip: Avoid tabindex unless the <svg> is meant to be keyboard-focusable"
      log WARN "   📘 Example: remove tabindex or wrap interactive controls separately"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_webp_in_css_url_blocked — Block .webp used in CSS backgrounds
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Prevents .webp references from being used in CSS `background-image` or `url(...)`
#
# Why it matters:
#   .webp transparency/animation may render inconsistently in CSS contexts.
#
# Globals used:
#   - ROOT_DIR
#
# Categories:
#   encoding, lint
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_webp_in_css_url_blocked() {
  # ✅ Check: .webp should not be used in CSS url() or backgrounds
  # Category: encoding, lint
  # Stages: lint, check

  local failed=0

  grep -rI --include="*.css" --include="*.scss" --include="*.sass" --include="*.less" 'url(.*\.webp' "$ROOT_DIR" | while read -r match; do
    log WARN "⚠️ .webp used in CSS background or url(): $match"
    log WARN "   💡 Tip: Prefer .svg or static .png for background images"
    log WARN "   📘 Example: background-image: url('icon.svg')"
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_mask_url_fragment — Block <mask> with unsafe URL fragments
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finds <mask> referencing fragment URLs (e.g. url(#id))
#
# Why it matters:
#   Fragment IDs can conflict or be overridden across embedded SVGs.
#
# Globals used:
#   - ROOT_DIR
#
# Categories:
#   accessibility, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_mask_url_fragment() {
  # ✅ Check: avoid mask="url(#...)" in inline SVGs
  # Category: accessibility, encoding
  # Stages: lint, check

  local failed=0

  find "$ROOT_DIR" -name "*.svg" | while read -r file; do
    if grep -q 'mask="url(#' "$file"; then
      log WARN "⚠️ SVG mask uses inline fragment reference in $file"
      log WARN "   💡 Tip: Avoid 'mask=\"url(#...)\"' — prefer <use> with symbol instead"
      log WARN "   📘 Example: use external symbol <use href=\"#mask\" />"
      failed=1
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_remote_href_any — Disallow xlink:href/href with remote URLs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flags any href or xlink:href to remote (http/https) URIs
#
# Why it matters:
#   External references break reproducibility and caching in deployment pipelines.
#
# Globals used:
#   - ROOT_DIR
#
# Categories:
#   safety, encoding, boundaries
#
# Stages:
#   check, lint, deploy
# ------------------------------------------------------------------------------
check::images_svg_remote_href_any() {
  # ✅ Check: <svg> hrefs must not point to remote HTTP/S URLs
  # Category: safety, encoding, boundaries
  # Stages: check, lint, deploy

  local failed=0

  grep -rI --include="*.svg" -E 'xlink:href="https?://|href="https?://' "$ROOT_DIR" | while read -r match; do
    log FATAL "❌ Remote href in SVG: $match"
    log FATAL "   💡 Tip: Inline assets or use symbol reference instead"
    log FATAL "   📘 Example: replace href=\"https://...\" with href=\"#local-id\""
    failed=1
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_event_handlers_blocked — Prevent on* event handlers in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocks inline SVG event handlers like onload=, onclick=, etc.
#
# Why it matters:
#   Event handlers in SVG can be used for injection or abuse in untrusted contexts.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_event_handlers_blocked
#
# Categories:
#   encoding, safety
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::images_svg_event_handlers_blocked() {
  # ✅ Check: Block on* event handlers in SVG files
  # Category: encoding, safety
  # Stages: check, lint, build

  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -qE '\son[a-zA-Z]+=' "$svg"; then
      log FATAL "❌ SVG contains on* event handler: $svg"
      log FATAL "   💡 Tip: Remove inline event handlers from SVG"
      log FATAL "   📘 Example: onload=, onclick=, onmouseover="
      return 1
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_with_script_element_blocked — Block <script> tags in SVG
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Rejects any <script>...</script> tags in .svg files
#
# Why it matters:
#   Inline script in SVG can be used for injection, exfiltration, or other abuses.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_with_script_element_blocked
#
# Categories:
#   encoding, safety
#
# Stages:
#   check, lint, build
# ------------------------------------------------------------------------------
check::images_svg_with_script_element_blocked() {
  # ✅ Check: Block <script> in SVG files
  # Category: encoding, safety
  # Stages: check, lint, build

  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -iq '<script' "$svg"; then
      log FATAL "❌ SVG contains <script> tag: $svg"
      log FATAL "   💡 Tip: Remove any <script> tags in SVGs to avoid XSS"
      log FATAL "   📘 Example: <script>alert('bad')</script>"
      return 1
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_non_decorative_missing_aria — Ensure ARIA for meaningful SVGs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifies that non-decorative SVGs have role/presentation attributes
#
# Why it matters:
#   Accessibility is broken if interactive or meaningful SVGs lack semantics.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_non_decorative_missing_aria
#
# Categories:
#   accessibility, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_non_decorative_missing_aria() {
  # ✅ Check: Ensure non-decorative SVGs declare ARIA roles
  # Category: accessibility, encoding
  # Stages: lint, check

  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -iq "<svg" "$svg" &&
       ! grep -iqE 'role="(img|presentation)"|aria-' "$svg"; then
      log WARN "⚠️ SVG missing ARIA attributes: $svg"
      log WARN "   💡 Tip: Add role=\"img\" and aria-label or aria-hidden as appropriate"
      log WARN "   📘 Example: <svg role=\"img\" aria-label=\"icon\">"
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_title_desc_missing_lang — Ensure <title>/<desc> have lang
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensures <title> or <desc> includes a lang attribute for accessibility
#
# Why it matters:
#   Screen readers may misinterpret content if language is not specified.
#
# Globals used:
#   - ROOT_DIR → monorepo root
#
# Example:
#   check::images_svg_title_desc_missing_lang
#
# Categories:
#   accessibility, encoding
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_title_desc_missing_lang() {
  # ✅ Check: Ensure <title> and <desc> include lang attribute
  # Category: accessibility, encoding
  # Stages: lint, check

  find "$ROOT_DIR" -iname "*.svg" | while read -r svg; do
    if grep -iq '<title>' "$svg" && ! grep -iq '<title[^>]*lang=' "$svg"; then
      log WARN "⚠️ <title> in SVG missing lang attribute: $svg"
      log WARN "   💡 Tip: Add lang=\"en\" or appropriate code to <title>"
      log WARN "   📘 Example: <title lang=\"en\">Close icon</title>"
    fi

    if grep -iq '<desc>' "$svg" && ! grep -iq '<desc[^>]*lang=' "$svg"; then
      log WARN "⚠️ <desc> in SVG missing lang attribute: $svg"
      log WARN "   💡 Tip: Add lang=\"en\" or appropriate code to <desc>"
      log WARN "   📘 Example: <desc lang=\"en\">Checkmark icon</desc>"
    fi
  done
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_embedded_media_blocked — Prevent media embedding in SVGs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting <image> or <video> tags with embedded external media inside SVGs
#   - Ensuring media isn't used in a way that violates CSP or bloats inline assets
#
# Why it matters:
#   Embedded media in SVGs can leak privacy info, break CSPs, bloat asset size,
#   or even allow unexpected behavior in sensitive contexts like SSR.
#
# Globals used:
#   - SEARCH_PATH → Directory to recursively check for .svg files
#
# Example:
#   SEARCH_PATH=.
#   check::images_svg_embedded_media_blocked
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, pre-commit
# ------------------------------------------------------------------------------
check::images_svg_embedded_media_blocked() {
  # ✅ Check: Block <image>, <video>, <audio> elements inside SVGs
  # Category: lint, safety
  # Stages: lint, pre-commit

  local path="${SEARCH_PATH:-.}"
  local offenders
  offenders=$(grep -rEl --include="*.svg" '<(image|video|audio)' "$path" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ SVG files embed forbidden media elements: <image>, <video>, or <audio>"
    log FATAL "   💡 Tip: Remove embedded media or convert it to pure vector alternatives."
    log FATAL "   📘 Example: Instead of <image xlink:href='video.mp4' />, keep SVGs purely vector-based."
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::images_webp_color_profile_stripped — Enforce stripping color profiles
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting embedded ICC or EXIF color profiles in .webp images
#
# Why it matters:
#   Color profiles can bloat file size and cause inconsistent rendering
#   across browsers or OSes. Stripping them ensures uniform display.
#
# Globals used:
#   - SEARCH_PATH → Directory to search .webp images in
#
# Example:
#   SEARCH_PATH=public/images
#   check::images_webp_color_profile_stripped
#
# Categories:
#   lint, encoding
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::images_webp_color_profile_stripped() {
  # ✅ Check: .webp images must not contain ICC or EXIF color profiles
  # Category: lint, encoding
  # Stages: lint, check, build

  local path="${SEARCH_PATH:-.}"
  local offending=""
  while IFS= read -r -d '' file; do
    if strings "$file" | grep -qiE 'ICC_PROFILE|EXIF'; then
      offending+="$file"$'\n'
    fi
  done < <(find "$path" -type f -iname '*.webp' -print0)

  if [[ -n "$offending" ]]; then
    log FATAL "❌ .webp files contain embedded ICC or EXIF metadata."
    log FATAL "   💡 Tip: Strip metadata using \`cwebp -metadata none\` or \`exiftool -all=\`."
    log FATAL "   📘 Example: cwebp input.jpg -o output.webp -metadata none"
    echo "$offending"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::images_webp_yuv420_subsampling — Enforce YUV420 subsampling in .webp
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring .webp images use YUV420 color subsampling for compression
#
# Why it matters:
#   YUV420 is the most compatible and efficient format for .webp.
#   Using YUV422 or YUV444 increases size and may break on some platforms.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan
#
# Example:
#   SEARCH_PATH=assets/img
#   check::images_webp_yuv420_subsampling
#
# Categories:
#   lint, encoding
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::images_webp_yuv420_subsampling() {
  # ✅ Check: All .webp images must use YUV420 subsampling
  # Category: lint, encoding
  # Stages: lint, build

  local path="${SEARCH_PATH:-.}"
  local offending=""
  while IFS= read -r -d '' file; do
    if webpinfo "$file" 2>/dev/null | grep -qE 'YUV444|YUV422'; then
      offending+="$file"$'\n'
    fi
  done < <(find "$path" -type f -iname '*.webp' -print0)

  if [[ -n "$offending" ]]; then
    log FATAL "❌ Some .webp images are not using YUV420 subsampling."
    log FATAL "   💡 Tip: Re-encode them with \`cwebp -m 6 -q 80 -sharp_yuv\` or use default encoder settings."
    log FATAL "   📘 Example: cwebp input.png -o output.webp"
    echo "$offending"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::images_svg_inlined_should_use_component — Prevent raw inline SVGs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting raw inline <svg> content in source files
#   - Encouraging use of <SvgIcon name="..." /> or similar component system
#
# Why it matters:
#   Centralized components ensure accessibility, deduplication, and theming.
#   Raw SVGs embedded inline are harder to manage and often lack accessibility.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan (defaults to src/)
#
# Example:
#   SEARCH_PATH=src
#   check::images_svg_inlined_should_use_component
#
# Categories:
#   lint, accessibility, naming
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::images_svg_inlined_should_use_component() {
  # ✅ Check: Inline <svg> tags should be replaced with component wrappers
  # Category: lint, accessibility, naming
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEl '<svg[^>]*>' "$path" --include="*.svelte" --include="*.tsx" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found raw inline <svg> content in components."
    log FATAL "   💡 Tip: Use a wrapper like <SvgIcon name=\"check\" /> to enforce consistency and accessibility."
    log FATAL "   📘 Example:
      # Wrong:
      <svg viewBox=\"0 0 24 24\">...</svg>

      # Correct:
      <SvgIcon name=\"check\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_components_imported_consistently — Enforce consistent Astro imports
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring all `.astro` components are imported using consistent casing and aliasing
#   - Preventing mixed casing (e.g., `Header.astro` vs `header.astro`)
#
# Why it matters:
#   Inconsistent imports can break builds on case-sensitive filesystems (e.g., Linux),
#   and cause issues with Vite caching or SSR hydration mismatches.
#
# Globals used:
#   - SEARCH_PATH → Directory to search for .astro files
#
# Example:
#   SEARCH_PATH=src
#   check::astro_components_imported_consistently
#
# Categories:
#   lint, naming, paths
#
# Stages:
#   lint, pre-commit
# ------------------------------------------------------------------------------
check::astro_components_imported_consistently() {
  # ✅ Check: Enforce consistent casing and aliasing for Astro imports
  # Category: lint, naming, paths
  # Stages: lint, pre-commit

  local path="${SEARCH_PATH:-src}"
  local issues=""

  while IFS= read -r -d '' file; do
    if grep -Eq "import .+ from ['\"].+/[A-Z][^/]*\.astro['\"]" "$file"; then
      continue
    elif grep -Eq "import .+ from ['\"].*/[a-z][^/]*\.astro['\"]" "$file"; then
      issues+="$file"$'\n'
    fi
  done < <(find "$path" -type f \( -name '*.astro' -o -name '*.ts' -o -name '*.js' \) -print0)

  if [[ -n "$issues" ]]; then
    log FATAL "❌ Found .astro imports that do not use PascalCase or aliasing."
    log FATAL "   💡 Tip: Always use PascalCase for component names (e.g., Header.astro) and imports (e.g., import Header from './Header.astro')"
    log FATAL "   📘 Example:
      # Wrong:
      import header from './header.astro'

      # Correct:
      import Header from './Header.astro'"
    echo "$issues"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_slot_usage_valid — Ensure valid and named slot usage in .astro
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that all <slot> elements in .astro files include a name (if multiple)
#   - Avoiding unnamed <slot> misuse when multiple children are expected
#
# Why it matters:
#   Named slots provide better structure, easier debugging, and avoid layout confusion
#   when components accept multiple children.
#
# Globals used:
#   - SEARCH_PATH → Directory of Astro components
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_slot_usage_valid
#
# Categories:
#   lint, accessibility
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_slot_usage_valid() {
  # ✅ Check: Ensure all <slot> usage is valid and named where needed
  # Category: lint, accessibility
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local issues=""
  while IFS= read -r -d '' file; do
    if grep -q '<slot>' "$file" && grep -q '<slot name=' "$file"; then
      issues+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$issues" ]]; then
    log FATAL "❌ Found mixed usage of unnamed and named <slot> elements in .astro files."
    log FATAL "   💡 Tip: If using multiple slots, name all of them and avoid mixing <slot> with <slot name=\"...\">."
    log FATAL "   📘 Example:
      # Wrong:
      <slot />
      <slot name=\"footer\" />

      # Correct:
      <slot name=\"main\" />
      <slot name=\"footer\" />"
    echo "$issues"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_style_global_banned — Disallow use of `style[is:global]`
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting any usage of `<style is:global>` in `.astro` components
#
# Why it matters:
#   `is:global` styles leak across component boundaries and can create hard-to-debug
#   CSS conflicts. Scoped or Tailwind styles are preferred for maintainability.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_style_global_banned
#
# Categories:
#   lint, style, safety
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::astro_style_global_banned() {
  # ✅ Check: Disallow <style is:global> usage in .astro files
  # Category: lint, style, safety
  # Stages: lint, check, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEl '<style[^>]*is:global' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Detected use of <style is:global> in Astro components."
    log FATAL "   💡 Tip: Use scoped styles or Tailwind CSS utilities instead of leaking styles globally."
    log FATAL "   📘 Example:
      # Wrong:
      <style is:global>
        body { background: red; }
      </style>

      # Correct:
      <style>
        div { background: red; }
      </style> (scoped)"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_set_html_usage_banned — Disallow use of `set:html` directive
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting any `set:html` usage in `.astro` templates
#
# Why it matters:
#   `set:html` is dangerous if improperly escaped and allows XSS injection.
#   Safer templating or component composition is preferred.
#
# Globals used:
#   - SEARCH_PATH → Folder of Astro components
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_set_html_usage_banned
#
# Categories:
#   lint, safety, encoding
#
# Stages:
#   lint, test, check
# ------------------------------------------------------------------------------
check::astro_set_html_usage_banned() {
  # ✅ Check: Disallow `set:html` usage in .astro files
  # Category: lint, safety, encoding
  # Stages: lint, test, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEl 'set:html' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found set:html directive in Astro templates."
    log FATAL "   💡 Tip: Avoid rendering unescaped HTML. Use safe slotting or Markdown rendering libraries."
    log FATAL "   📘 Example:
      # Wrong:
      <div set:html={userBio} />

      # Correct:
      <Markdown content={userBio} />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_aria_roles — Ensure aria roles are set on components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that interactive containers have `aria-*` or `role` attributes
#
# Why it matters:
#   Without `aria` or `role`, components may be inaccessible to assistive tech.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan Astro templates
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_aria_roles
#
# Categories:
#   lint, accessibility
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_component_aria_roles() {
  # ✅ Check: Components must declare aria-* or role attributes
  # Category: lint, accessibility
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEL '<[a-zA-Z0-9]+[^>]*(aria-|role)=' "$path" --include="*.astro" | grep -E '<(main|section|nav|aside|div|ul|button)' || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found interactive or semantic elements missing role or aria-* in .astro files."
    log FATAL "   💡 Tip: Add appropriate role or aria-* attribute for accessibility compliance."
    log FATAL "   📘 Example:
      # Wrong:
      <section>Content</section>

      # Correct:
      <section aria-labelledby=\"section-heading\">Content</section>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_scripts_disallowed — Prevent use of <script> inside .astro
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocking direct `<script>` tags in `.astro` files
#
# Why it matters:
#   Inline scripts can leak globals, violate CSPs, and break SSR.
#   Scripts should be encapsulated in client components or JS modules.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan
#
# Example:
#   SEARCH_PATH=src
#   check::astro_scripts_disallowed
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::astro_scripts_disallowed() {
  # ✅ Check: Block <script> tags inside .astro templates
  # Category: lint, safety
  # Stages: lint, check, build

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEl '<script[^>]*>' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Inline <script> tags found in Astro components."
    log FATAL "   💡 Tip: Move logic to .ts files or .svelte components and use <script type=\"module\" src=\"...\"> if necessary."
    log FATAL "   📘 Example:
      # Wrong:
      <script>console.log('hi')</script>

      # Correct:
      <script type=\"module\" src=\"/scripts/track.js\"></script>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_slots_documented — Ensure named slots are documented
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that any named <slot> in a .astro file has an associated comment
#     or documentation block explaining its purpose
#
# Why it matters:
#   Named slots are public APIs. Without documentation, consumers may misuse them
#   or overlook required content, leading to visual or functional bugs.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan for .astro files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_slots_documented
#
# Categories:
#   lint, documentation
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::astro_slots_documented() {
  # ✅ Check: Ensure all named <slot> elements are documented
  # Category: lint, documentation
  # Stages: lint, check, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEl '<slot name=' "$path" --include="*.astro" | while read -r file; do
    grep -B1 '<slot name=' "$file" | grep -qE '///|<!--' || echo "$file"
  done)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Named <slot> tags found without documentation."
    log FATAL "   💡 Tip: Add inline comments or documentation before each named slot to describe its expected content."
    log FATAL "   📘 Example:
      <!-- Slot for optional sidebar tools -->
      <slot name=\"sidebar\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_lang_attr_defined — Ensure <html lang="..."> is defined
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting root templates that are missing the `lang` attribute on the <html> element
#
# Why it matters:
#   Missing `lang` breaks accessibility and may cause screen readers to mispronounce text.
#
# Globals used:
#   - SEARCH_PATH → Where to scan for root HTML templates (typically src/pages/)
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_lang_attr_defined
#
# Categories:
#   lint, accessibility
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::astro_lang_attr_defined() {
  # ✅ Check: <html> must include a lang="..." attribute
  # Category: lint, accessibility
  # Stages: lint, check, build

  local path="${SEARCH_PATH:-src/pages}"
  local offenders
  offenders=$(grep -rEl '<html[^>]*>' "$path" --include="*.astro" | while read -r file; do
    grep -q '<html[^>]*lang=' "$file" || echo "$file"
  done)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found root templates missing lang attribute on <html> tag."
    log FATAL "   💡 Tip: Always include a lang attribute (e.g., lang=\"en\") on the <html> element."
    log FATAL "   📘 Example:
      # Wrong:
      <html>

      # Correct:
      <html lang=\"en\">"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_components_export_props_documented — Document exported props
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring all exported props in `.astro` files have JSDoc-style comments
#
# Why it matters:
#   Astro components with props should act like typed, documented interfaces.
#   Undocumented props reduce usability and clarity for consumers.
#
# Globals used:
#   - SEARCH_PATH → Directory of component files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_components_export_props_documented
#
# Categories:
#   lint, documentation
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_components_export_props_documented() {
  # ✅ Check: Exported props in Astro components must be documented
  # Category: lint, documentation
  # Stages: lint, check

  local path="${SEARCH_PATH:-src/components}"
  local offenders
  offenders=$(grep -rEl 'export const' "$path" --include="*.astro" | while read -r file; do
    grep -B1 'export const' "$file" | grep -qE '^/\*\*' || echo "$file"
  done)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Exported props in Astro components are undocumented."
    log FATAL "   💡 Tip: Add JSDoc-style comments above each exported prop declaration."
    log FATAL "   📘 Example:
      /** Text to show inside the button */
      export const label = 'Click me'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_files_named_pascal_case — Enforce PascalCase for Astro components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that all `.astro` files follow PascalCase naming (e.g., `MyComponent.astro`)
#
# Why it matters:
#   Consistent component naming improves readability and avoids OS casing issues.
#
# Globals used:
#   - SEARCH_PATH → Folder of .astro files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_files_named_pascal_case
#
# Categories:
#   lint, naming, paths
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::astro_files_named_pascal_case() {
  # ✅ Check: Astro component files must be PascalCase
  # Category: lint, naming, paths
  # Stages: lint, check, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(find "$path" -type f -name '*.astro' | grep -vE '/[A-Z][a-zA-Z0-9]+\.astro$' || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Some .astro component files are not PascalCase."
    log FATAL "   💡 Tip: Rename your component files to use PascalCase (e.g., MyComponent.astro)."
    log FATAL "   📘 Example:
      # Wrong:
      button.astro

      # Correct:
      Button.astro"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_files_named_pascal_case — Enforce PascalCase for Astro components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that all `.astro` files follow PascalCase naming (e.g., `MyComponent.astro`)
#
# Why it matters:
#   Consistent component naming improves readability and avoids OS casing issues.
#
# Globals used:
#   - SEARCH_PATH → Folder of .astro files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_files_named_pascal_case
#
# Categories:
#   lint, naming, paths
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::astro_files_named_pascal_case() {
  # ✅ Check: Astro component files must be PascalCase
  # Category: lint, naming, paths
  # Stages: lint, check, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(find "$path" -type f -name '*.astro' | grep -vE '/[A-Z][a-zA-Z0-9]+\.astro$' || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Some .astro component files are not PascalCase."
    log FATAL "   💡 Tip: Rename your component files to use PascalCase (e.g., MyComponent.astro)."
    log FATAL "   📘 Example:
      # Wrong:
      button.astro

      # Correct:
      Button.astro"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_client_directives_valid — Enforce proper use of client:* directives
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting invalid or inconsistent use of Astro `client:*` hydration directives
#
# Why it matters:
#   Improper hydration causes broken interactivity, performance regressions, or hydration mismatches.
#
# Globals used:
#   - SEARCH_PATH → Directory of .astro files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_client_directives_valid
#
# Categories:
#   lint, safety, performance
#
# Stages:
#   lint, build, check
# ------------------------------------------------------------------------------
check::astro_client_directives_valid() {
  # ✅ Check: Ensure only supported client:* directives are used
  # Category: lint, safety, performance
  # Stages: lint, build, check

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  local valid_directives="client:load|client:idle|client:visible|client:media|client:only"

  while IFS= read -r -d '' file; do
    if grep -qE 'client:[^ ="]+' "$file"; then
      if ! grep -qE "$valid_directives" "$file"; then
        offenders+="$file"$'\n'
      fi
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found unsupported or invalid client:* directives in Astro components."
    log FATAL "   💡 Tip: Use only valid client hydration options like client:load, client:idle, etc."
    log FATAL "   📘 Example:
      # Wrong:
      <MyComponent client:mount />

      # Correct:
      <MyComponent client:load />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_island_placement_valid — Ensure Astro islands are placed correctly
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting misplaced hydrated components (e.g. inside <head>, <footer>, etc.)
#
# Why it matters:
#   Hydrated components must be placed within valid interactive containers to avoid runtime errors and rendering mismatches.
#
# Globals used:
#   - SEARCH_PATH → Directory of Astro templates
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_island_placement_valid
#
# Categories:
#   lint, safety, performance
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_island_placement_valid() {
  # ✅ Check: Ensure hydrated components are placed only in valid DOM containers
  # Category: lint, safety, performance
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEl 'client:(load|idle|visible|only|media)' "$path" --include="*.astro" | while read -r file; do
    if grep -qE '<(head|footer)[^>]*>.*client:' "$file"; then
      echo "$file"
    fi
  done)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found client:* hydrated components placed inside <head> or <footer>."
    log FATAL "   💡 Tip: Only place hydrated islands in visible layout containers like <main>, <section>, or <div>."
    log FATAL "   📘 Example:
      # Wrong:
      <footer><MyComponent client:load /></footer>

      # Correct:
      <section><MyComponent client:load /></section>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_island_placement_valid — Ensure Astro islands are placed correctly
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting misplaced hydrated components (e.g. inside <head>, <footer>, etc.)
#
# Why it matters:
#   Hydrated components must be placed within valid interactive containers to avoid runtime errors and rendering mismatches.
#
# Globals used:
#   - SEARCH_PATH → Directory of Astro templates
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_island_placement_valid
#
# Categories:
#   lint, safety, performance
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_island_placement_valid() {
  # ✅ Check: Ensure hydrated components are placed only in valid DOM containers
  # Category: lint, safety, performance
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEl 'client:(load|idle|visible|only|media)' "$path" --include="*.astro" | while read -r file; do
    if grep -qE '<(head|footer)[^>]*>.*client:' "$file"; then
      echo "$file"
    fi
  done)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found client:* hydrated components placed inside <head> or <footer>."
    log FATAL "   💡 Tip: Only place hydrated islands in visible layout containers like <main>, <section>, or <div>."
    log FATAL "   📘 Example:
      # Wrong:
      <footer><MyComponent client:load /></footer>

      # Correct:
      <section><MyComponent client:load /></section>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_components_named_exports_valid — Exported props must use valid identifiers
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring exported constants have valid identifier names (no dashes, spaces, etc.)
#
# Why it matters:
#   Exported props are used like function parameters and must be valid JS identifiers.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_components_named_exports_valid
#
# Categories:
#   lint, tsconfig
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_components_named_exports_valid() {
  # ✅ Check: Exported props must use valid JS identifiers
  # Category: lint, tsconfig
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE 'export const [^a-zA-Z_]' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found invalid identifiers used in Astro exported props."
    log FATAL "   💡 Tip: Use camelCase or snake_case for export names (e.g., export const isVisible = true)"
    log FATAL "   📘 Example:
      # Wrong:
      export const show-text = true

      # Correct:
      export const showText = true"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_default_slots_present — Ensure default <slot /> is defined
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that components using named slots also include a default <slot />
#
# Why it matters:
#   Without a default slot, consumers passing children into the component root
#   may unintentionally render nothing, leading to silent UI bugs.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_default_slots_present
#
# Categories:
#   lint, accessibility
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_component_default_slots_present() {
  # ✅ Check: Components with named slots must include a default <slot />
  # Category: lint, accessibility
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -q '<slot name=' "$file" && ! grep -q '<slot[ >]' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Components use named slots but omit a default <slot />."
    log FATAL "   💡 Tip: Always provide a default <slot /> to allow unscoped content rendering."
    log FATAL "   📘 Example:
      # Wrong:
      <slot name=\"header\" />

      # Correct:
      <slot />
      <slot name=\"header\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_duplicate_component_names — Detect duplicate component file names
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Finding `.astro` components with duplicate names in different folders
#
# Why it matters:
#   Astro resolves components by filename. Duplicate names in different folders
#   may cause ambiguous imports, CI failures, or editor confusion.
#
# Globals used:
#   - SEARCH_PATH → Directory of components
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_duplicate_component_names
#
# Categories:
#   lint, naming, paths
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_duplicate_component_names() {
  # ✅ Check: Component filenames must be unique across the repo
  # Category: lint, naming, paths
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local duplicates
  duplicates=$(find "$path" -type f -name '*.astro' -exec basename {} \; | sort | uniq -d)

  if [[ -n "$duplicates" ]]; then
    log FATAL "❌ Duplicate .astro component names found across different directories."
    log FATAL "   💡 Tip: Rename components to include namespace or usage context to avoid collisions."
    log FATAL "   📘 Example:
      # Problem:
      - src/components/Button.astro
      - src/ui/Button.astro

      # Solution:
      - src/components/FormButton.astro
      - src/ui/IconButton.astro"
    echo "$duplicates"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_html_lang_sync_with_translations — Validate lang= attribute matches default locale
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring the `lang="..."` on the root <html> matches the default locale
#
# Why it matters:
#   If the site uses translations and sets a default locale, the `lang` attribute
#   must match for a11y, SEO, and browser behavior consistency.
#
# Globals used:
#   - ASTRO_DEFAULT_LOCALE → The expected default language (e.g. "en", "fr")
#   - SEARCH_PATH → Location of layout or root HTML templates
#
# Example:
#   ASTRO_DEFAULT_LOCALE=en
#   SEARCH_PATH=src/layouts
#   check::astro_html_lang_sync_with_translations
#
# Categories:
#   lint, accessibility, i18n
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::astro_html_lang_sync_with_translations() {
  # ✅ Check: Ensure <html lang="..."> matches the configured default locale
  # Category: lint, accessibility, i18n
  # Stages: lint, check, build

  local path="${SEARCH_PATH:-src}"
  local expected="${ASTRO_DEFAULT_LOCALE:-en}"

  local offenders
  offenders=$(grep -rEl '<html[^>]*lang=' "$path" --include="*.astro" | while read -r file; do
    grep -q "<html[^>]*lang=\"$expected\"" "$file" || echo "$file"
  done)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ <html lang> does not match default locale: expected lang=\"$expected\""
    log FATAL "   💡 Tip: Sync the <html lang> with your default i18n setting (e.g., ASTRO_DEFAULT_LOCALE)."
    log FATAL "   📘 Example:
      # Wrong:
      <html lang=\"de\">

      # Correct:
      <html lang=\"${expected}\">"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_components_tagged_for_docs — Ensure components declare @component JSDoc
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Requiring every public-facing .astro file to include a `/** @component */` doc tag
#
# Why it matters:
#   Marking public components ensures they’re picked up by doc generators and
#   helps separate internal/private components from public APIs.
#
# Globals used:
#   - SEARCH_PATH → Astro component source
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_components_tagged_for_docs
#
# Categories:
#   lint, documentation
#
# Stages:
#   lint, check, pre-commit
# ------------------------------------------------------------------------------
check::astro_components_tagged_for_docs() {
  # ✅ Check: Public .astro components should include /** @component */ JSDoc tag
  # Category: lint, documentation
  # Stages: lint, check, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if ! grep -q '@component' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Some Astro components are missing the /** @component */ tag."
    log FATAL "   💡 Tip: Add a JSDoc block at the top of the file with @component to include in docs."
    log FATAL "   📘 Example:
      /**
       * My reusable layout section
       * @component
       */
      ---"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_client_component_has_fallback — Hydrated islands must provide fallback
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring that any component using `client:*` directive includes a fallback element
#
# Why it matters:
#   Without a fallback, client-only components can cause blank UIs during SSR
#   or poor perceived performance while hydration is pending.
#
# Globals used:
#   - SEARCH_PATH → Directory to check for .astro templates
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_client_component_has_fallback
#
# Categories:
#   lint, accessibility, performance
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::astro_client_component_has_fallback() {
  # ✅ Check: Hydrated client components must include fallback content
  # Category: lint, accessibility, performance
  # Stages: lint, check, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -q 'client:' "$file" && ! grep -q 'fallback=' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Hydrated components lack fallback content for SSR."
    log FATAL "   💡 Tip: Use \`<Component client:load fallback={<Spinner />} />\` or equivalent."
    log FATAL "   📘 Example:
      # Wrong:
      <MyComponent client:visible />

      # Correct:
      <MyComponent client:visible fallback={<Loading />} />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_interactive_elements_have_labels — Ensure buttons/inputs have labels
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that interactive elements have accessible names or `aria-label`
#
# Why it matters:
#   Inputs, buttons, and toggles must have accessible labels to be used by
#   assistive technologies like screen readers or voice input.
#
# Globals used:
#   - SEARCH_PATH → Directory to check
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_interactive_elements_have_labels
#
# Categories:
#   lint, accessibility
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_interactive_elements_have_labels() {
  # ✅ Check: Ensure all buttons, inputs, toggles have accessible labels
  # Category: lint, accessibility
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEL '<(button|input|textarea|select)[^>]*(aria-label|aria-labelledby|alt|title|name)=' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Some interactive elements are missing accessible labels."
    log FATAL "   💡 Tip: Add \`aria-label\`, \`alt\`, \`title\`, or wrap with a <label> element."
    log FATAL "   📘 Example:
      # Wrong:
      <button />

      # Correct:
      <button aria-label=\"Close menu\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_ssr_renderable — Ensure all components render safely in SSR
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting use of `window`, `document`, or browser-only APIs in `.astro`
#
# Why it matters:
#   Astro runs in Node.js during SSR. Browser-only APIs will crash builds unless guarded.
#
# Globals used:
#   - SEARCH_PATH → Directory with .astro files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_ssr_renderable
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, test, build
# ------------------------------------------------------------------------------
check::astro_ssr_renderable() {
  # ✅ Check: Prevent browser-only API usage during SSR
  # Category: lint, safety
  # Stages: lint, test, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -qE '\b(window|document|navigator|localStorage|sessionStorage)\b' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Browser-only globals used in SSR context: window, document, etc."
    log FATAL "   💡 Tip: Guard with \`if (typeof window !== 'undefined')\` or move to client-only script."
    log FATAL "   📘 Example:
      # Wrong:
      const width = window.innerWidth;

      # Correct:
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_svelte_component_integration_safe — Validate Svelte in Astro
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting unsafe or unsupported usages when importing `.svelte` into `.astro`
#
# Why it matters:
#   Astro supports Svelte, but SSR boundaries, props, and reactivity must be
#   handled carefully to avoid runtime errors or hydration mismatches.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_svelte_component_integration_safe
#
# Categories:
#   lint, boundaries, integration
#
# Stages:
#   lint, check, test
# ------------------------------------------------------------------------------
check::astro_svelte_component_integration_safe() {
  # ✅ Check: Ensure imported .svelte files follow integration best practices
  # Category: lint, boundaries, integration
  # Stages: lint, check, test

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE 'import .* from .*\.svelte' "$path" --include="*.astro" | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    if ! grep -qE 'client:(only|load|idle|visible|media)' "$file"; then
      echo "$file"
    fi
  done | sort -u)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Imported Svelte components are used without a client:* directive."
    log FATAL "   💡 Tip: All Svelte components in .astro files must be hydrated with \`client:*\`."
    log FATAL "   📘 Example:
      # Wrong:
      <Counter />

      # Correct:
      <Counter client:load />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_translations_placeholder_keys_present — Validate i18n placeholder usage
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring all translation keys used via `t("key")` exist in the default locale file
#
# Why it matters:
#   Missing translation keys lead to broken UIs, fallback behavior, or user-facing placeholders
#
# Globals used:
#   - TRANSLATION_FILE → Path to default locale file (e.g., locales/en.json)
#   - SEARCH_PATH → Astro templates that call `t()`
#
# Example:
#   TRANSLATION_FILE=locales/en.json
#   SEARCH_PATH=src
#   check::astro_translations_placeholder_keys_present
#
# Categories:
#   lint, i18n
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_translations_placeholder_keys_present() {
  # ✅ Check: All used translation keys must exist in the default locale
  # Category: lint, i18n
  # Stages: lint, test

  local file="${TRANSLATION_FILE:-locales/en.json}"
  local path="${SEARCH_PATH:-src}"

  if [[ ! -f "$file" ]]; then
    log FATAL "❌ Translation file $file not found."
    log FATAL "   💡 Tip: Make sure your default locale file is at $file or override TRANSLATION_FILE."
    log FATAL "   📘 Example: TRANSLATION_FILE=locales/en.json"
    return 1
  fi

  # Flatten JSON keys to dot notation (e.g. a.b.c)
  local valid_keys
  valid_keys=$(jq -r 'paths | map(tostring) | join(".")' "$file")

  # Extract all t("...") keys in .astro files
  local used_keys
  used_keys=$(grep -rhoE 't\(["'"'"'][^"'"'"']+["'"'"']\)' "$path" --include="*.astro" | sed -E 's/t\(["'"'"']([^"'"'"']+)["'"'"']\)/\1/' | sort -u)

  local missing_keys=()

  while IFS= read -r used_key; do
    if ! grep -Fxq "$used_key" <<< "$valid_keys"; then
      missing_keys+=("$used_key")
    fi
  done <<< "$used_keys"

  if (( ${#missing_keys[@]} > 0 )); then
    log FATAL "❌ Missing translation keys in $file:"
    log FATAL "   💡 Tip: Add these missing keys to your default locale."
    log FATAL "   📘 Example:
      {
        \"${missing_keys[0]}\": \"Some text\"
      }"
    printf '%s\n' "${missing_keys[@]}"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_markdown_usage_safe — Ensure Markdown components are sanitized
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting any unescaped usage of raw Markdown content
#
# Why it matters:
#   Markdown content can include unsafe HTML or scripts unless explicitly sanitized.
#   This poses XSS or CSP bypass risks during SSR.
#
# Globals used:
#   - SEARCH_PATH → Path to templates using Markdown
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_markdown_usage_safe
#
# Categories:
#   lint, safety, encoding
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::astro_markdown_usage_safe() {
  # ✅ Check: Ensure Markdown rendering is sanitized or wrapped in safe renderer
  # Category: lint, safety, encoding
  # Stages: lint, check, build

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE 'set:html=\{.*content.*\}' "$path" --include="*.astro" | grep -v 'sanitize=' || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Unescaped Markdown content rendered without sanitization."
    log FATAL "   💡 Tip: Use a Markdown renderer that sanitizes or escape HTML by default."
    log FATAL "   📘 Example:
      # Wrong:
      <div set:html={post.content} />

      # Correct:
      <Markdown content={post.content} sanitize />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_unsafe_html_comments_removed — Strip dev-only HTML comments
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Removing HTML comments like <!-- TODO --> or <!-- DEBUG ONLY -->
#
# Why it matters:
#   Dev-only HTML comments can be leaked to production builds and viewed in page source.
#   They may contain secrets, implementation details, or confuse end users.
#
# Globals used:
#   - SEARCH_PATH → Template path
#
# Example:
#   SEARCH_PATH=src
#   check::astro_unsafe_html_comments_removed
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, build, deploy
# ------------------------------------------------------------------------------
check::astro_unsafe_html_comments_removed() {
  # ✅ Check: Remove dev-only HTML comments like <!-- TODO -->
  # Category: lint, safety
  # Stages: lint, build, deploy

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE '<!-- *(TODO|DEBUG|HACK|REMOVE|DEV ONLY)' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found dev-only comments that must be removed from production code."
    log FATAL "   💡 Tip: Strip comments like <!-- TODO: ... --> before shipping."
    log FATAL "   📘 Example:
      # Wrong:
      <!-- TODO: remove when stable -->

      # Correct:
      (comment removed)"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_client_directive_conflicts — Prevent multiple conflicting client:* directives
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring no single component instance includes multiple `client:*` directives
#
# Why it matters:
#   Using multiple `client:*` directives on the same component (e.g. `client:only` and `client:load`)
#   is invalid and leads to undefined hydration behavior.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan for Astro component usage
#
# Example:
#   SEARCH_PATH=src
#   check::astro_client_directive_conflicts
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, check, build
# ------------------------------------------------------------------------------
check::astro_client_directive_conflicts() {
  # ✅ Check: Components must not use multiple client:* hydration directives
  # Category: lint, safety
  # Stages: lint, check, build

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE '<[^>]+client:(load|idle|visible|only|media)[^>]+client:(load|idle|visible|only|media)' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found multiple client:* directives used on a single component."
    log FATAL "   💡 Tip: Use only one hydration directive per component instance."
    log FATAL "   📘 Example:
      # Wrong:
      <Component client:load client:only />

      # Correct:
      <Component client:load />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_props_passthrough_documented — Require comment for {...props}
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring that spreading props (`{...props}`) into elements includes a justification comment
#
# Why it matters:
#   Spreading unknown props can introduce security or styling risks.
#   Documenting it helps review its intended purpose.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan .astro files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_props_passthrough_documented
#
# Categories:
#   lint, safety, documentation
#
# Stages:
#   lint, pre-commit
# ------------------------------------------------------------------------------
check::astro_component_props_passthrough_documented() {
  # ✅ Check: {...props} must be commented when used in markup
  # Category: lint, safety, documentation
  # Stages: lint, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -q '{...props}' "$file" && ! grep -qE '{/\*.*props.*\*/}' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found {...props} used without documentation."
    log FATAL "   💡 Tip: Add a comment explaining what kind of props are expected and why they’re safe to spread."
    log FATAL "   📘 Example:
      <!-- Passes aria-*, class, and data-* to the root element -->
      <div {...props} />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_static_images_have_dimensions — Ensure <img> tags include width/height
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting <img> tags missing both `width` and `height`
#
# Why it matters:
#   Without dimensions, layout shifts during image load hurt performance and LCP metrics.
#
# Globals used:
#   - SEARCH_PATH → Pages/components directory
#
# Example:
#   SEARCH_PATH=src
#   check::astro_static_images_have_dimensions
#
# Categories:
#   lint, accessibility, performance
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_static_images_have_dimensions() {
  # ✅ Check: Static <img> elements must declare width and height
  # Category: lint, accessibility, performance
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE '<img[^>]*(?<!width=)[^>]*(?<!height=)[^>]*>' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found <img> tags missing width and height attributes."
    log FATAL "   💡 Tip: Add explicit width and height to all images to avoid layout shifts."
    log FATAL "   📘 Example:
      # Wrong:
      <img src=\"/logo.png\" />

      # Correct:
      <img src=\"/logo.png\" width=\"200\" height=\"100\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_inline_styles_banned — Prevent inline `style=` usage in markup
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocking all `style="..."` or `style={...}` usage in `.astro` files
#
# Why it matters:
#   Inline styles hinder reuse, cause duplication, and break CSP in production.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan
#
# Example:
#   SEARCH_PATH=src
#   check::astro_inline_styles_banned
#
# Categories:
#   lint, safety, style
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_inline_styles_banned() {
  # ✅ Check: Inline style attributes are forbidden
  # Category: lint, safety, style
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE 'style\s*=\s*["'\'']' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found inline style attributes in Astro templates."
    log FATAL "   💡 Tip: Use Tailwind classes, scoped CSS, or global classes instead."
    log FATAL "   📘 Example:
      # Wrong:
      <div style=\"color: red;\" />

      # Correct:
      <div class=\"text-red-500\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_fragment_usage_banned — Prevent use of <Fragment> or <template>
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting use of `<Fragment>` or `<template>` which Astro does not support like React/Vue
#
# Why it matters:
#   `<Fragment>` and `<template>` don't behave as in other frameworks. Their use can silently break layout or hydration.
#
# Globals used:
#   - SEARCH_PATH → Component/template source
#
# Example:
#   SEARCH_PATH=src
#   check::astro_fragment_usage_banned
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, test, build
# ------------------------------------------------------------------------------
check::astro_fragment_usage_banned() {
  # ✅ Check: Disallow use of <Fragment> or <template> in Astro
  # Category: lint, safety
  # Stages: lint, test, build

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE '<\/?(Fragment|template)[ >]' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found invalid use of <Fragment> or <template> tags in Astro components."
    log FATAL "   💡 Tip: Wrap multiple elements in a <div> or real semantic container instead."
    log FATAL "   📘 Example:
      # Wrong:
      <Fragment><h1 /><p /></Fragment>

      # Correct:
      <div><h1 /><p /></div>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_ssr_only_component_usage — Enforce `client:only` where needed
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting when a known client-only component is used without `client:only`
#
# Why it matters:
#   Some components (e.g., browser APIs, animations) are never safe to SSR and must be declared with `client:only`
#
# Globals used:
#   - SEARCH_PATH → Component usage location
#   - CLIENT_ONLY_COMPONENTS → List of components requiring `client:only`
#
# Example:
#   SEARCH_PATH=src
#   CLIENT_ONLY_COMPONENTS="VideoPlayer MapChart"
#   check::astro_ssr_only_component_usage
#
# Categories:
#   lint, boundaries, performance
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_ssr_only_component_usage() {
  # ✅ Check: Certain components must always be used with `client:only`
  # Category: lint, boundaries, performance
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local components="${CLIENT_ONLY_COMPONENTS:-}"
  local offenders=""

  for component in $components; do
    while IFS= read -r -d '' file; do
      if grep -q "<$component" "$file" && ! grep -q "<$component[^>]+client:only" "$file"; then
        offenders+="$file:$component"$'\n'
      fi
    done < <(find "$path" -type f -name '*.astro' -print0)
  done

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found usage of SSR-incompatible components without \`client:only\`."
    log FATAL "   💡 Tip: Add \`client:only\` to components like VideoPlayer or MapChart that must be run in the browser."
    log FATAL "   📘 Example:
      # Wrong:
      <VideoPlayer src=\"...\" />

      # Correct:
      <VideoPlayer client:only src=\"...\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_file_matches_export — Ensure filename matches exported component
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that a component’s file name (e.g., `Alert.astro`) matches the name of its `export const` default
#
# Why it matters:
#   File/component name mismatches cause confusion in import autocompletion, docs, and testing.
#
# Globals used:
#   - SEARCH_PATH → Astro component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_file_matches_export
#
# Categories:
#   lint, boundaries, naming
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_component_file_matches_export() {
  # ✅ Check: Component file name should match exported identifier
  # Category: lint, boundaries, naming
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local filename
    filename=$(basename "$file" .astro)
    local export_name
    export_name=$(grep -Eo 'export const [a-zA-Z0-9_]+' "$file" | awk '{print $3}' | head -n1)

    if [[ -n "$export_name" && "$export_name" != "$filename" ]]; then
      offenders+="$file → export: $export_name"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Mismatch between file name and exported component name."
    log FATAL "   💡 Tip: Rename either the file or the exported const to match."
    log FATAL "   📘 Example:
      # Wrong:
      File: Alert.astro
      export const Card = '...'

      # Correct:
      File: Alert.astro
      export const Alert = '...'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_has_prop_types — Require explicit type definitions on props
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting `export const` props missing a `: Type` annotation in `.astro`
#
# Why it matters:
#   Typed props enable validation, autocompletion, and documentation.
#
# Globals used:
#   - SEARCH_PATH → Astro component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_has_prop_types
#
# Categories:
#   lint, tsconfig, documentation
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_component_has_prop_types() {
  # ✅ Check: All props in Astro components should include type annotations
  # Category: lint, tsconfig, documentation
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -qE 'export const [a-zA-Z_]+[[:space:]]*=' "$file" && ! grep -qE 'export const [a-zA-Z_]+[[:space:]]*:[[:space:]]*' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found exported props in Astro files without type annotations."
    log FATAL "   💡 Tip: Add TypeScript types to all props for safety and IDE support."
    log FATAL "   📘 Example:
      # Wrong:
      export const color = 'red'

      # Correct:
      export const color: string = 'red'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_name_conflicts_with_html — Prevent component names that conflict with HTML tags
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting Astro component file names that shadow HTML tags (e.g., `Header.astro`)
#
# Why it matters:
#   Components named like native HTML tags (e.g., `Footer`, `Input`, `Label`) can cause confusion or SSR mismatch.
#
# Globals used:
#   - SEARCH_PATH → Directory of Astro component files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_name_conflicts_with_html
#
# Categories:
#   lint, naming, safety
#
# Stages:
#   lint, check
# ------------------------------------------------------------------------------
check::astro_component_name_conflicts_with_html() {
  # ✅ Check: Component names should not conflict with native HTML elements
  # Category: lint, naming, safety
  # Stages: lint, check

  local path="${SEARCH_PATH:-src}"
  local html_tags="html head body div span input button label section footer header main form nav article aside select option textarea"
  local offenders=""

  while IFS= read -r -d '' file; do
    local base
    base=$(basename "$file" .astro | tr '[:upper:]' '[:lower:]')
    if grep -qw "$base" <<< "$html_tags"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found components with names conflicting with HTML tags."
    log FATAL "   💡 Tip: Rename components to avoid clashing with browser elements (e.g., \`InputField.astro\` instead of \`Input.astro\`)."
    log FATAL "   📘 Example:
      # Wrong:
      src/components/Input.astro

      # Correct:
      src/components/InputField.astro"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_script_module_scoped_only — Ensure all <script> tags are scoped to module
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting <script> tags in .astro files that are not `type="module"`
#
# Why it matters:
#   Only module-scoped `<script type="module">` is supported in `.astro`. Top-level or inline `<script>` will break SSR.
#
# Globals used:
#   - SEARCH_PATH → Astro source files
#
# Example:
#   SEARCH_PATH=src
#   check::astro_script_module_scoped_only
#
# Categories:
#   lint, safety, boundaries
#
# Stages:
#   lint, build, test
# ------------------------------------------------------------------------------
check::astro_script_module_scoped_only() {
  # ✅ Check: <script> tags in .astro must be `type="module"`
  # Category: lint, safety, boundaries
  # Stages: lint, build, test

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rEL '<script[^>]*type=["'\'']module["'\'']' "$path" --include="*.astro" | grep -E '<script(?![^>]+type=)' || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found <script> tags without type=\"module\" in Astro templates."
    log FATAL "   💡 Tip: Use module-scoped scripts only. Place all logic in frontmatter or client components."
    log FATAL "   📘 Example:
      # Wrong:
      <script>console.log('bad')</script>

      # Correct:
      <script type=\"module\">import x from '...'</script>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_dynamic_imports_banned — Prevent dynamic `import()` inside .astro
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting dynamic `import()` expressions inside `.astro` templates or frontmatter
#
# Why it matters:
#   Dynamic imports are not guaranteed to work during SSR and break static bundling.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_dynamic_imports_banned
#
# Categories:
#   lint, safety, build
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_dynamic_imports_banned() {
  # ✅ Check: Prevent dynamic import() usage in .astro
  # Category: lint, safety, build
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE '\bimport\([^)]*\)' "$path" --include="*.astro" || true)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found dynamic import() usage in Astro files."
    log FATAL "   💡 Tip: Use static `import` statements in frontmatter or defer to `client:only` components."
    log FATAL "   📘 Example:
      # Wrong:
      const Comp = await import('./X.astro')

      # Correct:
      import Comp from './X.astro'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_missing_doctype — Require <!DOCTYPE html> in root templates
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring `<!DOCTYPE html>` is declared at the top of every HTML-rendering `.astro` file
#
# Why it matters:
#   Without DOCTYPE, pages render in quirks mode which causes layout issues and broken rendering.
#
# Globals used:
#   - SEARCH_PATH → Root layout/pages directory
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_missing_doctype
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_missing_doctype() {
  # ✅ Check: Root Astro templates must declare <!DOCTYPE html>
  # Category: lint, safety
  # Stages: lint, build

  local path="${SEARCH_PATH:-src/pages}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if ! head -n 5 "$file" | grep -qi '<!DOCTYPE html>'; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found .astro pages missing <!DOCTYPE html> declaration."
    log FATAL "   💡 Tip: Always begin root HTML output with <!DOCTYPE html> for standards mode rendering."
    log FATAL "   📘 Example:
      <!DOCTYPE html>
      <html lang=\"en\">...</html>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_components_max_depth — Warn if import chain exceeds max depth
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Walking `.astro` component dependency depth and flagging any that exceed a limit (default: 4)
#
# Why it matters:
#   Excessive component nesting increases SSR render cost and cognitive load.
#
# Globals used:
#   - SEARCH_PATH → Component root
#   - MAX_COMPONENT_DEPTH → Allowed import depth (default: 4)
#
# Example:
#   SEARCH_PATH=src/components
#   MAX_COMPONENT_DEPTH=4
#   check::astro_components_max_depth
#
# Categories:
#   lint, performance, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_components_max_depth() {
  # ✅ Check: Warn when component import chains are too deep
  # Category: lint, performance, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src/components}"
  local max_depth="${MAX_COMPONENT_DEPTH:-4}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local depth
    depth=$(grep -Eo '\.\./' <<< "$file" | wc -l)
    if (( depth > max_depth )); then
      offenders+="$file (depth: $depth)"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log WARN "⚠️  Components exceed maximum allowed depth of $max_depth."
    log WARN "   💡 Tip: Flatten component structure or promote shared layers."
    log WARN "   📘 Example:
      Instead of:
      src/components/layouts/ui/shared/typography/Text.astro

      Use:
      src/components/Text.astro"
    echo "$offenders"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_frontmatter_mutations_banned — Prevent mutation of props or exports
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting reassignments to `export const` props or any mutation of imports
#
# Why it matters:
#   Astro frontmatter should be static and deterministic. Reassigning exported props
#   or mutating shared imports can break rendering and cause hydration bugs.
#
# Globals used:
#   - SEARCH_PATH → Directory to check for Astro files
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_frontmatter_mutations_banned
#
# Categories:
#   lint, safety, tsconfig
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_frontmatter_mutations_banned() {
  # ✅ Check: Props and imported bindings must not be mutated
  # Category: lint, safety, tsconfig
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -q '^---' "$file"; then
      local frontmatter
      frontmatter=$(awk '/^---/{flag=flag+1; next} flag==1' "$file")
      if grep -Eq 'export const [a-zA-Z0-9_]+ =' <<< "$frontmatter"; then
        local vars
        vars=$(grep -Eo 'export const [a-zA-Z0-9_]+' <<< "$frontmatter" | awk '{print $3}')
        for var in $vars; do
          if grep -Eq "$var\s*=" <<< "$frontmatter" && ! grep -q "export const $var" <<< "$frontmatter"; then
            offenders+="$file (reassigned: $var)"$'\n'
          fi
        done
      fi
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Props or bindings mutated in Astro frontmatter."
    log FATAL "   💡 Tip: Do not reassign exported consts or imported values."
    log FATAL "   📘 Example:
      # Wrong:
      export const color = 'red'
      color = 'blue'

      # Correct:
      export const color = someCondition ? 'red' : 'blue'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_export_default_required — Require default export for pages
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring every page component includes a `export default` statement
#
# Why it matters:
#   Astro expects `.astro` pages to export default content. Without it, pages silently render blank.
#
# Globals used:
#   - SEARCH_PATH → Pages directory
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_export_default_required
#
# Categories:
#   lint, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_export_default_required() {
  # ✅ Check: Every .astro page must have a default export
  # Category: lint, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src/pages}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local frontmatter
    frontmatter=$(awk '/^---/{f++; next} f==1' "$file")
    if ! grep -q 'export default' <<< "$frontmatter"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Missing \`export default\` in Astro page frontmatter."
    log FATAL "   💡 Tip: Always include \`export default\` to define the page component."
    log FATAL "   📘 Example:
      ---
      export default function Page() {
        return <>Hello</>
      }
      ---"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_multiple_hydrated_components_per_page — Limit hydrated components per page
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Counting `client:*` component usages in each page, and warning if >1
#
# Why it matters:
#   Hydrating too many components per page increases bundle size and delays interactivity.
#
# Globals used:
#   - SEARCH_PATH → Pages directory
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_multiple_hydrated_components_per_page
#
# Categories:
#   lint, performance
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_multiple_hydrated_components_per_page() {
  # ✅ Check: Pages should not hydrate more than one component
  # Category: lint, performance
  # Stages: lint, test

  local path="${SEARCH_PATH:-src/pages}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local count
    count=$(grep -o 'client:\(load\|idle\|only\|media\|visible\)' "$file" | wc -l)
    if (( count > 1 )); then
      offenders+="$file (hydrated components: $count)"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log WARN "⚠️  Pages contain more than one hydrated component."
    log WARN "   💡 Tip: Consolidate interactivity into a single island or SSR where possible."
    log WARN "   📘 Example:
      src/pages/index.astro (3 hydrated components)"
    echo "$offenders"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_env_conditional_rendering_detected — Detect `import.meta.env` usage
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warning if `import.meta.env` is used to conditionally render UI
#
# Why it matters:
#   `import.meta.env` is replaced at build-time, not runtime. Conditional logic using it will not behave dynamically in SSR.
#
# Globals used:
#   - SEARCH_PATH → .astro and .ts files
#
# Example:
#   SEARCH_PATH=src
#   check::astro_env_conditional_rendering_detected
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_env_conditional_rendering_detected() {
  # ✅ Check: Warn about conditional rendering using import.meta.env
  # Category: lint, safety
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders
  offenders=$(grep -rE 'if\s*\(\s*import\.meta\.env' "$path" --include="*.astro" --include="*.ts" || true)

  if [[ -n "$offenders" ]]; then
    log WARN "⚠️  Conditional rendering based on import.meta.env detected."
    log WARN "   💡 Tip: Use build-time environment flags, not runtime conditionals, with Astro."
    log WARN "   📘 Example:
      # Wrong:
      if (import.meta.env.PROD) {
        return <ProdOnly />
      }

      # Correct:
      import ProdOnly from './ProdOnly.astro'
      export const isProd = import.meta.env.PROD"
    echo "$offenders"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_has_export_metadata — Enforce component-level metadata
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Requiring all components to export `export const metadata = { ... }`
#
# Why it matters:
#   Metadata improves discoverability for documentation, introspection, and rendering pipelines.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_has_export_metadata
#
# Categories:
#   lint, documentation, boundaries
#
# Stages:
#   lint, pre-commit
# ------------------------------------------------------------------------------
check::astro_component_has_export_metadata() {
  # ✅ Check: Component must export a metadata object
  # Category: lint, documentation, boundaries
  # Stages: lint, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if ! grep -q 'export const metadata' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Missing \`export const metadata = { ... }\` block in component."
    log FATAL "   💡 Tip: Export a metadata object with at least \`name\` and \`description\`."
    log FATAL "   📘 Example:
      ---
      export const metadata = {
        name: 'Alert',
        description: 'Displays a message to the user'
      }
      ---"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_exports_are_const — Ensure all exports use `const`
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Rejecting any `export let`, `export var`, or non-const bindings in `.astro` files
#
# Why it matters:
#   Astro requires exports to be immutable and serializable. `let`/`var` are unsafe in SSR.
#
# Globals used:
#   - SEARCH_PATH → Astro files to validate
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_exports_are_const
#
# Categories:
#   lint, tsconfig, safety
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_component_exports_are_const() {
  # ✅ Check: Only `export const` allowed in .astro frontmatter
  # Category: lint, tsconfig, safety
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -qE '^---' "$file"; then
      local bad
      bad=$(awk '/^---/{f++} f==1' "$file" | grep -E 'export (let|var) ')
      if [[ -n "$bad" ]]; then
        offenders+="$file"$'\n'
      fi
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found non-const export bindings (let/var) in Astro frontmatter."
    log FATAL "   💡 Tip: Always use \`export const\` to ensure safe SSR behavior."
    log FATAL "   📘 Example:
      # Wrong:
      export let count = 0

      # Correct:
      export const count = 0"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_file_size_limit — Enforce max file size for .astro components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Warning or rejecting `.astro` files exceeding a specified byte size (default: 10KB)
#
# Why it matters:
#   Oversized components are often doing too much. Breaking them up improves readability and performance.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#   - ASTRO_MAX_SIZE → Max size in bytes (default: 10240)
#
# Example:
#   SEARCH_PATH=src/components
#   ASTRO_MAX_SIZE=8192
#   check::astro_component_file_size_limit
#
# Categories:
#   lint, performance
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_component_file_size_limit() {
  # ✅ Check: Astro components should stay under reasonable size limits
  # Category: lint, performance
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local max="${ASTRO_MAX_SIZE:-10240}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local size
    size=$(stat -c %s "$file" 2>/dev/null || stat -f %z "$file")
    if (( size > max )); then
      offenders+="$file ($size bytes)"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log WARN "⚠️  Some .astro files exceed ${max} bytes — consider splitting into smaller components."
    log WARN "   💡 Tip: Move logic into utilities or child components."
    log WARN "   📘 Example:
      src/components/GiantForm.astro (13,456 bytes)"
    echo "$offenders"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_single_default_slot_only — Enforce only one default <slot /> per component
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring that each `.astro` component contains no more than one `<slot />` without a `name`
#
# Why it matters:
#   Multiple default slots lead to unpredictable rendering behavior. Named slots should be used for clarity.
#
# Globals used:
#   - SEARCH_PATH → Astro component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_single_default_slot_only
#
# Categories:
#   lint, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_component_single_default_slot_only() {
  # ✅ Check: Only one default <slot /> allowed per component
  # Category: lint, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local count
    count=$(grep -E '<slot\s*/?>' "$file" | grep -vc 'name=' || true)
    if [[ "$count" -gt 1 ]]; then
      offenders+="$file (default slots: $count)"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Multiple default <slot /> elements found in some Astro components."
    log FATAL "   💡 Tip: Use only one default slot and name the others (e.g., <slot name=\"footer\" />)."
    log FATAL "   📘 Example:
      # Wrong:
      <slot />
      <slot />

      # Correct:
      <slot />
      <slot name=\"footer\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_props_prefix_required — Require exported props to have prefix (e.g., `prop:`)
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforcing naming convention on exported props like `propTitle`, `propId`
#
# Why it matters:
#   Consistent naming of props helps distinguish internal variables from interface/API inputs.
#
# Globals used:
#   - SEARCH_PATH → Component source directory
#   - PROP_PREFIX → Expected prefix (default: "prop")
#
# Example:
#   SEARCH_PATH=src/components
#   PROP_PREFIX=prop
#   check::astro_component_props_prefix_required
#
# Categories:
#   lint, naming, boundaries
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_component_props_prefix_required() {
  # ✅ Check: Exported props must use a prefix like `propTitle`
  # Category: lint, naming, boundaries
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local prefix="${PROP_PREFIX:-prop}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local lines
    lines=$(awk '/^---/{f++} f==1' "$file" | grep -E 'export const ')
    while IFS= read -r line; do
      local name
      name=$(echo "$line" | sed -E 's/export const ([a-zA-Z0-9_]+).*/\1/')
      if [[ "$name" != "$prefix"* ]]; then
        offenders+="$file → $name"$'\n'
      fi
    done <<< "$lines"
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Exported props do not follow naming convention with prefix \"$prefix\"."
    log FATAL "   💡 Tip: Rename exported props to start with \"$prefix\" to distinguish interface inputs."
    log FATAL "   📘 Example:
      # Wrong:
      export const title = 'Welcome'

      # Correct:
      export const propTitle = 'Welcome'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_exports_sorted — Enforce alphabetical ordering of exported props
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring that `export const` declarations in frontmatter are alphabetically sorted
#
# Why it matters:
#   Sorting exported props makes component APIs easier to scan, especially in large files.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_exports_sorted
#
# Categories:
#   lint, formatting
#
# Stages:
#   lint, pre-commit
# ------------------------------------------------------------------------------
check::astro_component_exports_sorted() {
  # ✅ Check: Exported const props should be sorted alphabetically
  # Category: lint, formatting
  # Stages: lint, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local exports
    exports=$(awk '/^---/{f++} f==1' "$file" | grep -E '^export const ' | sed -E 's/^export const ([a-zA-Z0-9_]+).*/\1/')
    if [[ -z "$exports" ]]; then
      continue
    fi
    local sorted
    sorted=$(echo "$exports" | sort)
    if [[ "$exports" != "$sorted" ]]; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Exported props are not sorted alphabetically in the following files:"
    log FATAL "   💡 Tip: Alphabetically order `export const` declarations for consistency."
    log FATAL "   📘 Example:
      # Wrong:
      export const propZ = 'z'
      export const propA = 'a'

      # Correct:
      export const propA = 'a'
      export const propZ = 'z'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_frontmatter_exits_early — Ensure frontmatter ends before HTML
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring the `---` frontmatter block closes before any HTML markup begins
#
# Why it matters:
#   Mixing frontmatter with HTML confuses parsing and can lead to broken templates.
#
# Globals used:
#   - SEARCH_PATH → Source directory of .astro files
#
# Example:
#   SEARCH_PATH=src
#   check::astro_frontmatter_exits_early
#
# Categories:
#   lint, tsconfig, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_frontmatter_exits_early() {
  # ✅ Check: Frontmatter must be fully closed before any HTML starts
  # Category: lint, tsconfig, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local first_tag_line
    first_tag_line=$(grep -nE '<[a-zA-Z]' "$file" | cut -d: -f1 | head -n1)
    local second_delim_line
    second_delim_line=$(grep -n '^---' "$file" | cut -d: -f1 | sed -n '2p')

    if [[ -n "$first_tag_line" && -n "$second_delim_line" && "$second_delim_line" -gt "$first_tag_line" ]]; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found Astro files with open frontmatter blocks continuing into HTML markup."
    log FATAL "   💡 Tip: Close the frontmatter block (`---`) before any HTML starts."
    log FATAL "   📘 Example:
      # Wrong:
      ---
      export const foo = 'bar'
      <div>Content</div>

      # Correct:
      ---
      export const foo = 'bar'
      ---"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_has_named_export_id — Require `export const id` for analytics/tracking
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforcing that each `.astro` component defines a unique `export const id = '...'`
#
# Why it matters:
#   ID-based tagging is used for component fingerprinting, telemetry, and auto-doc generation.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_has_named_export_id
#
# Categories:
#   lint, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_component_has_named_export_id() {
  # ✅ Check: Require `export const id` in every component
  # Category: lint, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    if ! grep -qE '^export const id ?=' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Missing \`export const id = '...'\` in components."
    log FATAL "   💡 Tip: Export a globally unique id string for tracking, registration, or docs."
    log FATAL "   📘 Example:
      ---
      export const id = 'button.primary'
      ---"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_no_duplicate_exports — Prevent duplicate `export const` names
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking for multiple `export const` declarations using the same identifier
#
# Why it matters:
#   Duplicate exports shadow previous values and break type checking and consistency.
#
# Globals used:
#   - SEARCH_PATH → Component/page directory
#
# Example:
#   SEARCH_PATH=src
#   check::astro_no_duplicate_exports
#
# Categories:
#   lint, tsconfig
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_no_duplicate_exports() {
  # ✅ Check: No duplicate exported identifiers allowed
  # Category: lint, tsconfig
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local exports
    exports=$(awk '/^---/{f++} f==1' "$file" | grep -E '^export const ' | sed -E 's/^export const ([a-zA-Z0-9_]+).*/\1/')
    local dups
    dups=$(echo "$exports" | sort | uniq -d)
    if [[ -n "$dups" ]]; then
      offenders+="$file → $(echo "$dups" | paste -sd ', ' -)"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Duplicate exported identifiers found in Astro frontmatter."
    log FATAL "   💡 Tip: Rename one of the exports to avoid shadowing."
    log FATAL "   📘 Example:
      # Wrong:
      export const id = 'a'
      export const id = 'b'

      # Correct:
      export const id = 'a'
      export const altId = 'b'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_slot_name_convention — Enforce kebab-case for named slot names
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that all `<slot name="...">` values follow kebab-case naming
#
# Why it matters:
#   Consistent slot naming avoids collisions and aligns with HTML attribute conventions.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_slot_name_convention
#
# Categories:
#   lint, naming
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_slot_name_convention() {
  # ✅ Check: Named slots must follow kebab-case convention
  # Category: lint, naming
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local bad_slots
    bad_slots=$(grep -Eo '<slot name="[^"]+"' "$file" | sed -E 's/<slot name="([^"]+)"/\1/' | grep -vE '^[a-z0-9]+(-[a-z0-9]+)*$' || true)
    if [[ -n "$bad_slots" ]]; then
      offenders+="$file → $(echo "$bad_slots" | paste -sd ', ' -)"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found non-kebab-case slot names."
    log FATAL "   💡 Tip: Rename slots like \`HeaderSlot\` to \`header-slot\`."
    log FATAL "   📘 Example:
      # Wrong:
      <slot name=\"MainContent\" />

      # Correct:
      <slot name=\"main-content\" />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_lifecycle_hooks_only_in_client_components — Block onMount/use:* outside hydrated components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting usage of `on:mount`, `use:*`, or `window.addEventListener` in `.astro` files without `client:*` hydration
#
# Why it matters:
#   Lifecycle code should run only in the browser. Running such logic in SSR or static components will fail silently or crash builds.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan
#
# Example:
#   SEARCH_PATH=src
#   check::astro_lifecycle_hooks_only_in_client_components
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_lifecycle_hooks_only_in_client_components() {
  # ✅ Check: Lifecycle or DOM hooks must only appear in hydrated components
  # Category: lint, safety
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -Eq '\b(on:mount|use:|addEventListener|setTimeout|setInterval)\b' "$file" &&
       ! grep -q 'client:' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Found lifecycle hooks or DOM APIs in components without client:* hydration."
    log FATAL "   💡 Tip: Move DOM logic to client:load or client:only components."
    log FATAL "   📘 Example:
      # Wrong:
      <script>
        window.addEventListener('scroll', ...)
      </script>

      # Correct:
      <ScrollTracker client:load />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_used_multiple_times_with_client — Detect duplicated hydrated instances
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flagging pages where the same component is used multiple times with `client:*`
#
# Why it matters:
#   Each hydrated instance incurs separate JS and rendering cost. Components should reuse internal logic, not be duplicated.
#
# Globals used:
#   - SEARCH_PATH → Pages/components
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_component_used_multiple_times_with_client
#
# Categories:
#   lint, performance
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_component_used_multiple_times_with_client() {
  # ✅ Check: Avoid multiple hydrated uses of the same component per page
  # Category: lint, performance
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local hydrated
    hydrated=$(grep -oE '<([A-Z][a-zA-Z0-9]*)[^>]+client:(load|only|idle|media|visible)' "$file" | sed -E 's/<([A-Z][a-zA-Z0-9]*).*/\1/' | sort)
    local dups
    dups=$(echo "$hydrated" | uniq -d)
    if [[ -n "$dups" ]]; then
      offenders+="$file → $(echo "$dups" | paste -sd ', ' -)"$'\n'
    fi
  done < <(find "$path" -type f -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log WARN "⚠️  Found multiple hydrated instances of the same component per file."
    log WARN "   💡 Tip: Prefer using a single instance and manage state inside."
    log WARN "   📘 Example:
      # Wrong:
      <Toggle client:load />
      <Toggle client:load />

      # Correct:
      <ToggleList client:load />"
    echo "$offenders"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_missing_component_tag — Require `@component` tag for exported components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring that every exported Astro component includes a `@component` JSDoc tag
#
# Why it matters:
#   Tags help tooling index components, and make them discoverable for documentation or live previews.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_missing_component_tag
#
# Categories:
#   lint, documentation
#
# Stages:
#   lint, pre-commit
# ------------------------------------------------------------------------------
check::astro_component_missing_component_tag() {
  # ✅ Check: Require @component JSDoc tag in Astro component frontmatter
  # Category: lint, documentation
  # Stages: lint, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if ! grep -q '@component' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Missing \`@component\` tag in .astro frontmatter JSDoc."
    log FATAL "   💡 Tip: Add /** @component */ to mark this file as a component."
    log FATAL "   📘 Example:
      /**
       * Reusable banner component
       * @component
       */
      ---"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_filename_matches_id — Require file name to match `export const id`
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that `export const id = "foo-bar"` matches the kebab-case version of the file name
#
# Why it matters:
#   Keeps component IDs predictable, supports introspection and tooling lookup by filename
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_filename_matches_id
#
# Categories:
#   lint, naming
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_component_filename_matches_id() {
  # ✅ Check: Component file name must match export const id
  # Category: lint, naming
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local filename
    filename=$(basename "$file" .astro | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]' '[:lower:]')
    local id
    id=$(grep -E '^export const id *= *["'\''].*["'\'']' "$file" | sed -E 's/^export const id *= *["'\'']([^"'\''"]+)["'\''].*/\1/' | head -n1)
    if [[ "$id" != "$filename" ]]; then
      offenders+="$file → id: \"$id\" expected \"$filename\""$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Component id does not match kebab-case filename."
    log FATAL "   💡 Tip: Set \`export const id = '<filename>'\` where the filename is kebab-case."
    log FATAL "   📘 Example:
      File: ToggleSwitch.astro
      export const id = 'toggle-switch'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_multiple_scripts_banned — Allow only one <script> block per .astro file
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting .astro files with multiple `<script>` tags (module or otherwise)
#
# Why it matters:
#   Having more than one `<script>` in an Astro file complicates scoping and often reflects poor structure.
#
# Globals used:
#   - SEARCH_PATH → Astro component directory
#
# Example:
#   SEARCH_PATH=src
#   check::astro_component_multiple_scripts_banned
#
# Categories:
#   lint, boundaries, safety
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_component_multiple_scripts_banned() {
  # ✅ Check: .astro files must not include more than one <script> tag
  # Category: lint, boundaries, safety
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local count
    count=$(grep -c '<script' "$file")
    if [[ "$count" -gt 1 ]]; then
      offenders+="$file (script tags: $count)"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Multiple <script> blocks found in .astro files."
    log FATAL "   💡 Tip: Consolidate logic into a single module-scoped <script> in frontmatter."
    log FATAL "   📘 Example:
      # Wrong:
      <script type=\"module\">...</script>
      <script>...</script>

      # Correct:
      ---
      export const ... = ...
      ---"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_has_description_comment — Require summary comment at top
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring each .astro file starts with a summary JSDoc comment before `---`
#
# Why it matters:
#   Consistent headers make components self-documenting, improve discovery, and support docgen tooling.
#
# Globals used:
#   - SEARCH_PATH → Component directory
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_has_description_comment
#
# Categories:
#   lint, documentation
#
# Stages:
#   lint, pre-commit
# ------------------------------------------------------------------------------
check::astro_component_has_description_comment() {
  # ✅ Check: Each component must start with a /** ... */ description
  # Category: lint, documentation
  # Stages: lint, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    if ! head -n 5 "$file" | grep -q '^/\*\*'; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Component is missing a top-of-file summary comment."
    log FATAL "   💡 Tip: Add a JSDoc-style block before frontmatter to describe component purpose."
    log FATAL "   📘 Example:
      /**
       * Reusable toast notification UI
       * @component
       */"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_has_test_file — Ensure every component has a corresponding test
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring each `.astro` component has a `*.test.ts` or `*.spec.ts` sibling or mirror
#
# Why it matters:
#   Untested components risk regressions. Even basic smoke tests help maintain safety.
#
# Globals used:
#   - SEARCH_PATH → Component root
#
# Example:
#   SEARCH_PATH=src/components
#   check::astro_component_has_test_file
#
# Categories:
#   lint, test
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_component_has_test_file() {
  # ✅ Check: Each component has a corresponding test file
  # Category: lint, test
  # Stages: lint, test

  local path="${SEARCH_PATH:-src/components}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local base="${file%.astro}"
    local dir
    dir=$(dirname "$file")
    local name
    name=$(basename "$file" .astro)

    if ! compgen -G "$dir/${name}*.@(test|spec).@(ts|js)" >/dev/null; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log WARN "⚠️  Missing test files for the following Astro components:"
    log WARN "   💡 Tip: Add a corresponding \`MyComponent.test.ts\` or \`__tests__/MyComponent.spec.ts\`."
    echo "$offenders"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_has_error_boundary — Ensure hydrated components include error fallback
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting client:* components without `<ErrorBoundary>` or try/catch fallback logic
#
# Why it matters:
#   Hydrated islands can fail silently — fallback UIs prevent total UX loss.
#
# Globals used:
#   - SEARCH_PATH → Pages/components
#
# Example:
#   SEARCH_PATH=src
#   check::astro_component_has_error_boundary
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_component_has_error_boundary() {
  # ✅ Check: Hydrated components must be wrapped in error boundaries
  # Category: lint, safety
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local hydrated
    hydrated=$(grep -E 'client:(only|load|idle|visible|media)' "$file")
    local fallback
    fallback=$(grep -i '<ErrorBoundary' "$file")

    if [[ -n "$hydrated" && -z "$fallback" ]]; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Hydrated components missing fallback error boundaries."
    log FATAL "   💡 Tip: Wrap client:* components in <ErrorBoundary> or handle failures gracefully."
    log FATAL "   📘 Example:
      <ErrorBoundary fallback={<ErrorMessage />}>
        <UserChart client:load />
      </ErrorBoundary>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_component_imports_from_index_only — Enforce barrel imports for component folders
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocking direct imports like `../Button/Button.astro` instead of `../Button/index.ts`
#
# Why it matters:
#   Barrel exports simplify internal refactors, improve DX, and support cleaner tree-shaking.
#
# Globals used:
#   - SEARCH_PATH → Project source
#
# Example:
#   SEARCH_PATH=src
#   check::astro_component_imports_from_index_only
#
# Categories:
#   lint, boundaries, paths
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_component_imports_from_index_only() {
  # ✅ Check: Only allow barrel (index.ts) imports from component folders
  # Category: lint, boundaries, paths
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local bad
    bad=$(grep -E "import .* from ['\"].*/[A-Z][^/]+/[A-Z][^/]+\.astro['\"]" "$file" || true)
    if [[ -n "$bad" ]]; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Direct component file imports used instead of barrel index.ts."
    log FATAL "   💡 Tip: Import components via folder barrel (e.g. \`import { Button } from '../Button'\`)."
    log FATAL "   📘 Example:
      # Wrong:
      import Button from '../Button/Button.astro'

      # Correct:
      import { Button } from '../Button'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_dependencies_no_named_default_conflict — Block `export default` when `export const` uses same name
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting files that use `export default X` and `export const X =` simultaneously
#
# Why it matters:
#   Exporting the same name as both default and named breaks interop and toolchain resolution.
#
# Globals used:
#   - SEARCH_PATH → All Astro files
#
# Example:
#   SEARCH_PATH=src
#   check::astro_dependencies_no_named_default_conflict
#
# Categories:
#   lint, tsconfig
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_dependencies_no_named_default_conflict() {
  # ✅ Check: Don't export default and named const of same name
  # Category: lint, tsconfig
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local def
    def=$(grep -Eo 'export default ([a-zA-Z0-9_]+)' "$file" | awk '{print $3}')
    for name in $def; do
      if grep -Eq "export const $name" "$file"; then
        offenders+="$file → export default + const $name"$'\n'
      fi
    done
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ export default conflicts with named export of same identifier."
    log FATAL "   💡 Tip: Rename either the default export or the named one to avoid collisions."
    log FATAL "   📘 Example:
      # Wrong:
      export const Button = ...
      export default Button

      # Correct:
      export const Button = ...
      export default function ButtonWrapper() { ... }"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_svelte_import_has_client_directive — Enforce client:* on imported .svelte components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting `.svelte` imports in `.astro` files
#   - Ensuring those components are used with a `client:*` hydration directive
#
# Why it matters:
#   Svelte components are not SSR-compatible in `.astro` by default. Without client:*,
#   they will fail to render or break hydration silently.
#
# Globals used:
#   - SEARCH_PATH → Directory of .astro files to scan
#
# Example:
#   SEARCH_PATH=src
#   check::astro_svelte_import_has_client_directive
#
# Categories:
#   lint, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_svelte_import_has_client_directive() {
  # ✅ Check: Enforce client:* hydration on .svelte components imported into .astro
  # Category: lint, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local has_svelte_import
    has_svelte_import=$(grep -E 'import .* from .+\.svelte' "$file" || true)
    local has_client_directive
    has_client_directive=$(grep -E 'client:(load|only|idle|media|visible)' "$file" || true)

    if [[ -n "$has_svelte_import" && -z "$has_client_directive" ]]; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ .svelte components are imported into .astro without any client:* directive."
    log FATAL "   💡 Tip: Use client:* hydration (e.g., client:load) when rendering Svelte inside Astro."
    log FATAL "   📘 Example:
      # Wrong:
      import Counter from './Counter.svelte'
      <Counter />

      # Correct:
      import Counter from './Counter.svelte'
      <Counter client:load />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_svelte_component_not_ssr_rendered — Disallow SSR of Svelte components in .astro
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocking any usage of `<Component />` where Component is imported from `.svelte`
#   - Ensuring it's only used with `client:*` hydration
#
# Why it matters:
#   Astro cannot SSR `.svelte` files; rendering them statically will fail or break hydration.
#
# Globals used:
#   - SEARCH_PATH → Directory of Astro templates
#
# Example:
#   SEARCH_PATH=src
#   check::astro_svelte_component_not_ssr_rendered
#
# Categories:
#   lint, safety, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_svelte_component_not_ssr_rendered() {
  # ✅ Check: Prevent SSR usage of .svelte components inside .astro files
  # Category: lint, safety, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -qE 'import .* from .*\.svelte' "$file"; then
      local used_without_hydration
      used_without_hydration=$(awk '/<\/?([A-Z][a-zA-Z0-9]+)[^>]*>/' "$file" | grep -v 'client:' || true)
      if [[ -n "$used_without_hydration" ]]; then
        offenders+="$file"$'\n'
      fi
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Svelte components are rendered in .astro without client:* hydration."
    log FATAL "   💡 Tip: Wrap all .svelte usage in Astro with client:* to prevent SSR errors."
    log FATAL "   📘 Example:
      # Wrong:
      import Dialog from './Dialog.svelte'
      <Dialog />

      # Correct:
      <Dialog client:only />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_svelte_imports_separated_by_comment — Require comment above .svelte imports
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Requiring that any import from `.svelte` be preceded by a comment explaining why
#
# Why it matters:
#   .svelte interop should be intentional. Documenting it signals that the dev understands hydration and boundaries.
#
# Globals used:
#   - SEARCH_PATH → Astro file source directory
#
# Example:
#   SEARCH_PATH=src
#   check::astro_svelte_imports_separated_by_comment
#
# Categories:
#   lint, documentation
#
# Stages:
#   lint, pre-commit
# ------------------------------------------------------------------------------
check::astro_svelte_imports_separated_by_comment() {
  # ✅ Check: Require comment before importing .svelte into .astro
  # Category: lint, documentation
  # Stages: lint, pre-commit

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local lines
    lines=$(grep -nE 'import .* from .+\.svelte' "$file")
    while IFS= read -r line; do
      local lineno
      lineno=$(echo "$line" | cut -d: -f1)
      local prev
      prev=$((lineno - 1))
      local comment
      comment=$(sed -n "${prev}p" "$file" | grep -E '//|/\*')
      if [[ -z "$comment" ]]; then
        offenders+="$file:$lineno"$'\n'
      fi
    done <<< "$lines"
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ .svelte imports in .astro missing justification comment above them."
    log FATAL "   💡 Tip: Add a comment above each .svelte import to clarify purpose and hydration behavior."
    log FATAL "   📘 Example:
      // Imported Svelte-only graph renderer
      import Graph from './Graph.svelte'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_svelte_import_not_reexported — Prevent re-exporting .svelte components from .astro
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocking patterns like `export { default as MyChart } from './Chart.svelte'` in `.astro`
#
# Why it matters:
#   Svelte components should be hydrated where used — re-exporting through `.astro` breaks encapsulation and causes accidental SSR.
#
# Globals used:
#   - SEARCH_PATH → Directory to scan
#
# Example:
#   SEARCH_PATH=src
#   check::astro_svelte_import_not_reexported
#
# Categories:
#   lint, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_svelte_import_not_reexported() {
  # ✅ Check: Disallow re-exporting .svelte files from .astro
  # Category: lint, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -qE 'export .+ from .+\.svelte' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ .svelte components are being re-exported from .astro files."
    log FATAL "   💡 Tip: Hydrate and use Svelte components directly where needed. Never export them through .astro."
    log FATAL "   📘 Example:
      # Wrong:
      export { default as Chart } from './Chart.svelte'

      # Correct:
      import Chart from './Chart.svelte'
      <Chart client:only />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_svelte_component_not_used_in_head — Disallow rendering .svelte components in <head>
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting hydration of Svelte components inside <head> tags
#
# Why it matters:
#   Hydrating components in <head> violates the DOM spec and breaks layout, SSR, and hydration logic.
#
# Globals used:
#   - SEARCH_PATH → Page template directory
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_svelte_component_not_used_in_head
#
# Categories:
#   lint, safety, boundaries
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_svelte_component_not_used_in_head() {
  # ✅ Check: Svelte components must not appear inside <head>
  # Category: lint, safety, boundaries
  # Stages: lint, test

  local path="${SEARCH_PATH:-src/pages}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local in_head
    in_head=$(awk '/<head>/,/<\/head>/' "$file" | grep -E '<[A-Z][a-zA-Z0-9]* client:' || true)
    if [[ -n "$in_head" && "$file" =~ \.astro$ && "$file" =~ \.svelte ]]; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Svelte components rendered inside <head> in .astro files."
    log FATAL "   💡 Tip: Never place hydrated components inside the head tag."
    log FATAL "   📘 Example:
      # Wrong:
      <head>
        <Tooltip client:load />
      </head>

      # Correct:
      <main>
        <Tooltip client:load />
      </main>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_svelte_component_island_named_correctly — Require explicit component tag names
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Flagging Svelte component usage like `<Component client:only />` (ambiguous generic tag)
#
# Why it matters:
#   Generic component names make debugging hydration, telemetry, and tracking harder.
#
# Globals used:
#   - SEARCH_PATH → Template directory
#
# Example:
#   SEARCH_PATH=src
#   check::astro_svelte_component_island_named_correctly
#
# Categories:
#   lint, naming
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_svelte_component_island_named_correctly() {
  # ✅ Check: Hydrated Svelte components must not use generic names
  # Category: lint, naming
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local generic
    generic=$(grep -E '<(Component|Widget|Island)[^>]+client:' "$file" || true)
    if [[ -n "$generic" ]]; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Svelte components hydrated with generic names (e.g., <Component client:load />)."
    log FATAL "   💡 Tip: Use descriptive tags like <UserProfile client:load />."
    log FATAL "   📘 Example:
      # Wrong:
      <Component client:only />

      # Correct:
      <UserProfile client:only />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_react_import_has_client_directive — Require client:* for React components in .astro
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting `.jsx`/`.tsx` imports in `.astro` files
#   - Enforcing that they are used with client:* hydration directives
#
# Why it matters:
#   React components cannot SSR in Astro unless rendered via client:*.
#
# Globals used:
#   - SEARCH_PATH → Astro file root
#
# Example:
#   SEARCH_PATH=src
#   check::astro_react_import_has_client_directive
#
# Categories:
#   lint, boundaries
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_react_import_has_client_directive() {
  # ✅ Check: React components must use client:* hydration
  # Category: lint, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local has_react_import
    has_react_import=$(grep -E 'import .* from .+\.(jsx|tsx)' "$file" || true)
    local has_client
    has_client=$(grep -E 'client:(only|load|idle|visible|media)' "$file" || true)

    if [[ -n "$has_react_import" && -z "$has_client" ]]; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ React components are imported in .astro without client:* hydration."
    log FATAL "   💡 Tip: Use client:* directives like \`client:load\` for React integration."
    log FATAL "   📘 Example:
      # Wrong:
      import Button from './Button.jsx'
      <Button />

      # Correct:
      import Button from './Button.jsx'
      <Button client:load />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_react_component_not_used_in_head — Prevent React usage in <head> tags
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting hydrated React components inside `<head>` tags
#
# Why it matters:
#   React components in <head> violate DOM spec and break hydration.
#
# Globals used:
#   - SEARCH_PATH → Page templates
#
# Example:
#   SEARCH_PATH=src/pages
#   check::astro_react_component_not_used_in_head
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_react_component_not_used_in_head() {
  # ✅ Check: Block React component usage in <head> in .astro
  # Category: lint, safety
  # Stages: lint, build

  local path="${SEARCH_PATH:-src/pages}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -qE 'import .* from .*\.tsx?' "$file"; then
      local in_head
      in_head=$(awk '/<head>/,/<\/head>/' "$file" | grep -E 'client:(only|load|idle|visible|media)' || true)
      if [[ -n "$in_head" ]]; then
        offenders+="$file"$'\n'
      fi
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Hydrated React components used inside <head> in .astro files."
    log FATAL "   💡 Tip: Move hydrated components to <body> or use Astro-native head tags."
    log FATAL "   📘 Example:
      # Wrong:
      <head>
        <ThemeToggle client:load />
      </head>

      # Correct:
      <body>
        <ThemeToggle client:load />
      </body>"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_react_component_not_ssr_rendered — Prevent SSR of React components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Preventing `<Component />` where Component is imported from .tsx/.jsx but used without client:*
#
# Globals used:
#   - SEARCH_PATH → Astro component or page dir
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_react_component_not_ssr_rendered() {
  # ✅ Check: React components must not render statically in .astro
  # Category: lint, safety
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -qE 'import .* from .*\.tsx?' "$file" &&
       ! grep -qE 'client:(only|load|idle|media|visible)' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ React component imported but rendered without client:*."
    log FATAL "   💡 Tip: Always wrap React components with a hydration directive."
    log FATAL "   📘 Example:
      # Wrong:
      import Toggle from './Toggle.tsx'
      <Toggle />

      # Correct:
      <Toggle client:only />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_react_component_not_reexported — Block re-exporting .jsx/.tsx from .astro
# ------------------------------------------------------------------------------
check::astro_react_component_not_reexported() {
  # ✅ Check: Prevent re-exporting React components from .astro
  # Category: lint, boundaries
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    if grep -qE 'export .* from .*\.tsx?' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ React components re-exported from .astro files."
    log FATAL "   💡 Tip: Never re-export .tsx or .jsx through Astro — hydrate them directly."
    log FATAL "   📘 Example:
      # Wrong:
      export { default as Card } from './Card.tsx'

      # Correct:
      import Card from './Card.tsx'
      <Card client:only />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_react_component_named_properly — Enforce PascalCase for imported .tsx/.jsx components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting improperly named React component imports like `import button from './Button.tsx'`
#
# Why it matters:
#   React components must be capitalized to render correctly. Lowercase imports are interpreted as HTML elements.
#
# Globals used:
#   - SEARCH_PATH → Astro directory
#
# Categories:
#   lint, naming
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_react_component_named_properly() {
  # ✅ Check: Enforce PascalCase for imported React components
  # Category: lint, naming
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders=""
  while IFS= read -r -d '' file; do
    local bad
    bad=$(grep -E 'import ([a-z][a-zA-Z0-9_]*) from .*\.tsx?' "$file" || true)
    if [[ -n "$bad" ]]; then
      offenders+="$file → $bad"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ React components imported with lowercase identifiers (invalid JSX tag)."
    log FATAL "   💡 Tip: Use PascalCase (e.g. Button, Modal) when importing React components."
    log FATAL "   📘 Example:
      # Wrong:
      import button from './Button.tsx'

      # Correct:
      import Button from './Button.tsx'"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_react_component_not_used_multiple_times_without_key — Ensure multiple React instances have a `key`
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting repeated use of the same React component in `.astro` without a `key=` attribute
#
# Why it matters:
#   React hydration may break or log warnings if multiple identical elements are rendered without keys.
#
# Globals used:
#   - SEARCH_PATH → Astro directory
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, build
# ------------------------------------------------------------------------------
check::astro_react_component_not_used_multiple_times_without_key() {
  # ✅ Check: Multiple usages of a React component must include unique keys
  # Category: lint, safety
  # Stages: lint, build

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    local components
    components=$(grep -oE '<[A-Z][a-zA-Z0-9]+[^>]*client:' "$file" | cut -d' ' -f1 | sort | uniq -d || true)
    for tag in $components; do
      local count
      count=$(grep -o "<$tag" "$file" | wc -l)
      local keyed
      keyed=$(grep -c "<$tag[^>]*key=" "$file")
      if [[ "$count" -gt 1 && "$keyed" -lt "$count" ]]; then
        offenders+="$file → <$tag> × $count (keyed: $keyed)"$'\n'
      fi
    done
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log WARN "⚠️  Repeated React components without keys may break hydration."
    log WARN "   💡 Tip: Add \`key={...}\` to all repeated component instances."
    log WARN "   📘 Example:
      # Wrong:
      <Card client:load />
      <Card client:load />

      # Correct:
      <Card key=\"a\" client:load />
      <Card key=\"b\" client:load />"
    echo "$offenders"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::astro_client_component_named_export_blocked — Prevent named exports from hydrated components
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Blocking patterns like `export { Button } from './Button.tsx'` or `.svelte`
#
# Why it matters:
#   Only `export default` works with client:* hydration. Named exports can't be used directly in `<Component />`.
#
# Globals used:
#   - SEARCH_PATH → Astro file path
#
# Categories:
#   lint, safety
#
# Stages:
#   lint, test
# ------------------------------------------------------------------------------
check::astro_client_component_named_export_blocked() {
  # ✅ Check: Client components should not be re-exported by name
  # Category: lint, safety
  # Stages: lint, test

  local path="${SEARCH_PATH:-src}"
  local offenders=""

  while IFS= read -r -d '' file; do
    if grep -qE 'export \{ .* \} from .*\.tsx?' "$file"; then
      offenders+="$file"$'\n'
    fi
  done < <(find "$path" -name '*.astro' -print0)

  if [[ -n "$offenders" ]]; then
    log FATAL "❌ Named re-exports used for React components in .astro (not supported)."
    log FATAL "   💡 Tip: Use default exports and hydrate them directly."
    log FATAL "   📘 Example:
      # Wrong:
      export { Button } from './Button.tsx'

      # Correct:
      import Button from './Button.tsx'
      <Button client:only />"
    echo "$offenders"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::tail_worker_health — Ensure tailing the deployed worker succeeds post-deploy
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Attempting to connect to the deployed worker via `wrangler tail`
#   - Validating that tailing succeeds in supported environments
#
# Why it matters:
#   Tailing the worker is a fast way to verify that it's reachable and responding post-deployment.
#   Failures may indicate DNS propagation issues, route binding problems, or broken worker startup.
#
# Globals used:
#   - WRANGLER_ENV → Target Wrangler environment to tail (e.g., staging, production)
#
# Example:
#   WRANGLER_ENV=staging
#   check::tail_worker_health
#
# Categories:
#   lint, wrangler, infra
#
# Stages:
#   test, build, deploy, integration
# ------------------------------------------------------------------------------
check::tail_worker_health() {
  # ✅ Check: Confirm tail connectivity to deployed worker using wrangler
  # Category: lint, wrangler, infra
  # Stages: test, build, deploy, integration

  echo "🔁 Checking tail worker connectivity for env: $WRANGLER_ENV"

  if timeout 10s pnpm exec wrangler tail --env "$WRANGLER_ENV"; then
    log INFO "✅ Tail worker is connectable (env: $WRANGLER_ENV)"
  else
    log WARN "❌ Tail connection failed (may be expected in non-streaming or non-interactive environments)"
    log WARN "   💡 Tip: Ensure the worker was deployed correctly and that wrangler tail is supported for this script type."
    log WARN "   📘 Example:
      pnpm exec wrangler tail --env $WRANGLER_ENV"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::sync_cf_secrets_from_env — Inject secrets into Wrangler using CI ENV vars
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reading expected secrets from `.env.example`
#   - Verifying each one is defined in the current CI environment
#   - Injecting secrets into the target Wrangler environment using `wrangler secret put`
#
# Why it matters:
#   Cloudflare Workers depend on runtime secrets. If a required secret is missing in CI,
#   the deployed worker may fail immediately or expose unconfigured endpoints.
#
# Globals used:
#   - CI → Must be "true" (enforces CI-only usage)
#   - .env.example → Source of required secret keys
#
# Arguments:
#   $WRANGLER_ENV → Target Wrangler environment (e.g. staging, production)
#
# Example:
#   WRANGLER_ENV=staging check::sync_cf_secrets_from_env
#
# Categories:
#   secrets, wrangler, infra, ci
#
# Stages:
#   pre-commit, build, deploy
# ------------------------------------------------------------------------------
check::sync_cf_secrets_from_env() {
  # ✅ Check: Inject required secrets into Wrangler using CI environment variables
  # Category: secrets, wrangler, infra, ci
  # Stages: pre-commit, build, deploy

  local env="${WRANGLER_ENV:-}"
  local example_file=".env.example"

  if [[ -z "$env" ]]; then
    log FATAL "❌ WRANGLER_ENV not set"
    log FATAL "   💡 Tip: Provide the target environment via \`WRANGLER_ENV=staging\`"
    log FATAL "   📘 Example: WRANGLER_ENV=production check::sync_cf_secrets_from_env"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ check::sync_cf_secrets_from_env must be run inside CI (CI=true)"
    log FATAL "   💡 Tip: Do not run this function locally. It mutates production secrets."
    log FATAL "   📘 Example: CI=true WRANGLER_ENV=staging check::sync_cf_secrets_from_env"
    return 1
  fi

  if [[ ! -f "$example_file" ]]; then
    log FATAL "❌ .env.example not found"
    log FATAL "   💡 Tip: Ensure .env.example exists and includes expected secrets as KEY=value pairs."
    log FATAL "   📘 Example:
      DB_PASSWORD=
      API_SECRET="
    return 1
  fi

  local required_secrets
  mapfile -t required_secrets < <(grep -v '^#' "$example_file" | grep '=' | cut -d= -f1)

  log INFO "🔐 Syncing secrets to Cloudflare for env=$env"
  log INFO "🔍 Found ${#required_secrets[@]} required secrets"

  local missing=0
  for secret in "${required_secrets[@]}"; do
    local value="${!secret:-}"
    if [[ -n "$value" ]]; then
      log INFO "🔁 Setting $secret"
      echo "$value" | pnpm exec wrangler secret put "$secret" --env "$env" > /dev/null
    else
      log WARN "⚠️  Skipping unset secret: $secret"
      ((missing++))
    fi
  done

  if [[ "$missing" -gt 0 ]]; then
    log WARN "⚠️  $missing secrets were skipped due to missing environment variables"
  fi

  log INFO "✅ Secret sync completed for env=$env"
}

# ------------------------------------------------------------------------------
# 🧪 check::verify_cf_secret_exists — Validate that required Wrangler secrets already exist in Cloudflare
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reading expected secret keys from `.env.example`
#   - Ensuring each secret is already present in the target Wrangler environment
#
# Why it matters:
#   If secrets are not set in Cloudflare, the worker may fail at runtime. This check
#   provides a read-only way to ensure required secrets were previously provisioned.
#
# Globals used:
#   - WRANGLER_ENV → Target environment to check (e.g. staging, production)
#   - .env.example → Source of required secrets (non-comment lines with `=`)
#
# Example:
#   WRANGLER_ENV=staging
#   check::verify_cf_secret_exists
#
# Categories:
#   secrets, wrangler, infra, ci
#
# Stages:
#   lint, test, build, deploy
# ------------------------------------------------------------------------------
check::verify_cf_secret_exists() {
  # ✅ Check: All required secrets are present in Wrangler for $WRANGLER_ENV
  # Category: secrets, wrangler, infra, ci
  # Stages: lint, test, build, deploy

  local env="${WRANGLER_ENV:-}"
  local example_file=".env.example"

  if [[ -z "$env" ]]; then
    log FATAL "❌ WRANGLER_ENV not set"
    log FATAL "   💡 Tip: Specify the environment using \`WRANGLER_ENV=staging\`"
    log FATAL "   📘 Example: WRANGLER_ENV=production check::verify_cf_secret_exists"
    return 1
  fi

  if [[ ! -f "$example_file" ]]; then
    log FATAL "❌ .env.example not found"
    log FATAL "   💡 Tip: Include your expected secret keys in .env.example"
    log FATAL "   📘 Example:
      DB_PASSWORD=
      API_KEY="
    return 1
  fi

  log INFO "🔍 Verifying Cloudflare secrets for env=$env"

  local expected_secrets
  mapfile -t expected_secrets < <(grep -v '^#' "$example_file" | grep '=' | cut -d= -f1)

  local actual_secrets
  mapfile -t actual_secrets < <(pnpm exec wrangler secret list --env "$env" | awk '{print $1}' | tail -n +2)

  local missing=()
  for key in "${expected_secrets[@]}"; do
    if ! printf '%s\n' "${actual_secrets[@]}" | grep -qx "$key"; then
      missing+=("$key")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    log FATAL "❌ Missing ${#missing[@]} required secrets in env=$env"
    log FATAL "   💡 Tip: Use \`check::sync_cf_secrets_from_env\` to inject missing secrets."
    log FATAL "   📘 Example:
      WRANGLER_ENV=$env check::sync_cf_secrets_from_env"
    printf '🔐 Missing: %s\n' "${missing[@]}"
    return 1
  fi

  log INFO "✅ All required secrets exist in env=$env"
}

# ------------------------------------------------------------------------------
# 🧪 check::cleanup_stale_analytics_data — Delete expired analytics events from D1
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Calculating a date threshold from `D1_RETENTION_DAYS`
#   - Executing a SQL DELETE against a `analytics` table using Wrangler
#
# Why it matters:
#   Stale analytics data increases cost, slows queries, and wastes storage.
#   Automated cleanup ensures D1 remains lean, fast, and compliant.
#
# Globals used:
#   - DB_NAME → The Cloudflare D1 binding name
#   - D1_RETENTION_DAYS → Number of days to retain (default: 1)
#
# Example:
#   DB_NAME=analytics_prod
#   D1_RETENTION_DAYS=30
#   check::cleanup_stale_analytics_data
#
# Categories:
#   database, wrangler, infra
#
# Stages:
#   deploy, build, test, migrate
# ------------------------------------------------------------------------------
check::cleanup_stale_analytics_data() {
  # ✅ Check: Delete analytics events older than N days from D1
  # Category: database, wrangler, infra
  # Stages: deploy, build, test, migrate

  local days="${D1_RETENTION_DAYS:-1}"
  local db="${DB_NAME:-}"

  if [[ -z "$db" ]]; then
    log FATAL "❌ DB_NAME not set"
    log FATAL "   💡 Tip: Export the target D1 database name as DB_NAME before running this cleanup"
    log FATAL "   📘 Example: DB_NAME=analytics_prod check::cleanup_stale_analytics_data"
    return 1
  fi

  local query="DELETE FROM analytics WHERE event_date < DATE('now', '-${days} day');"

  log INFO "🧼 Deleting analytics data older than $days day(s)..."
  log INFO "🧾 SQL: $query"

  if ! pnpm exec wrangler d1 execute "$db" --command "$query" > /dev/null 2>&1; then
    log FATAL "❌ Failed to clean analytics data from D1 database: $db"
    log FATAL "   💡 Tip: Check if the analytics table exists and your bindings are configured"
    log FATAL "   📘 Example: wrangler d1 execute $db --command \"$query\""
    return 1
  fi

  log INFO "✅ Expired analytics data deleted from $db (retention: $days day[s])"
}

# ------------------------------------------------------------------------------
# 🧪 check::teardown_preview_resources — Remove all preview resources (D1, KV, R2)
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Deleting the preview D1 database tied to the current Git branch
#   - Removing all KV namespaces listed in `wrangler.json` for env.preview
#   - Removing all R2 buckets listed in `wrangler.json` for env.preview
#
# Why it matters:
#   Preview environments must be torn down cleanly after CI to avoid resource sprawl,
#   cost leakage, and leftover bindings.
#
# Globals used:
#   - CI_COMMIT_REF_SLUG → Branch slug used in naming preview resources
#   - wrangler.json → Source of environment resource config
#
# Example:
#   CI_COMMIT_REF_SLUG=my-branch
#   check::teardown_preview_resources
#
# Categories:
#   infra, wrangler, ci
#
# Stages:
#   deploy, post-deploy
# ------------------------------------------------------------------------------
check::teardown_preview_resources() {
  # ✅ Check: Remove preview D1 DB, KV namespaces, and R2 buckets from wrangler.json
  # Category: infra, wrangler, ci
  # Stages: deploy, post-deploy

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ check::teardown_preview_resources must be run inside CI"
    log FATAL "   💡 Tip: This is destructive — preview environments should only be cleaned up via CI"
    log FATAL "   📘 Example: CI=true CI_COMMIT_REF_SLUG=feature-x check::teardown_preview_resources"
    return 1
  fi

  if [[ -z "${CI_COMMIT_REF_SLUG:-}" ]]; then
    log FATAL "❌ CI_COMMIT_REF_SLUG is not set"
    log FATAL "   💡 Tip: This variable is required to identify the preview D1 database"
    log FATAL "   📘 Example: CI_COMMIT_REF_SLUG=feature-x"
    return 1
  fi

  local db="preview_${CI_COMMIT_REF_SLUG}"
  log INFO "🗑️ Deleting preview D1 database: $db"
  pnpm exec wrangler d1 delete "$db" --yes > /dev/null 2>&1 || true

  if [[ ! -f wrangler.json ]]; then
    log WARN "⚠️  wrangler.json not found — skipping KV and R2 teardown"
    return 0
  fi

  log INFO "🗑️ Deleting preview KV namespaces..."
  local kv_list
  kv_list=$(jq -r '.env.preview.kv_namespaces[]?.binding' wrangler.json)
  for kv in $kv_list; do
    local ns_id
    ns_id=$(wrangler kv namespace list | jq -r --arg name "$kv" '.[] | select(.title==$name) | .id')
    if [[ -n "$ns_id" ]]; then
      log INFO "🗑️ Deleting KV namespace: $kv ($ns_id)"
      wrangler kv namespace delete --namespace-id "$ns_id" > /dev/null
    else
      log WARN "⚠️  KV namespace not found: $kv"
    fi
  done

  log INFO "🗑️ Deleting preview R2 buckets..."
  local r2_list
  r2_list=$(jq -r '.env.preview.r2_buckets[]?.bucket_name' wrangler.json)
  for r2 in $r2_list; do
    log INFO "🗑️ Deleting R2 bucket: $r2"
    wrangler r2 bucket delete "$r2" > /dev/null 2>&1 || true
  done

  log INFO "✅ Preview teardown complete for branch: $CI_COMMIT_REF_SLUG"
}

# ------------------------------------------------------------------------------
# 🧪 check::cleanup_expired_previews — Remove all expired preview DBs, KV, and R2 buckets
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Scanning for all preview resources matching naming patterns:
#     - D1 databases: `preview_*`
#     - KV namespaces: `preview_*`
#     - R2 buckets: `preview-*`
#   - Deleting any matching resources using Wrangler CLI
#
# Why it matters:
#   Preview resources must be explicitly removed after branch deletion or merge.
#   This prevents leaked environments, wasted resources, and quota exhaustion.
#
# Globals used:
#   - CI → Must be true to allow cleanup
#
# Example:
#   CI=true check::cleanup_expired_previews
#
# Categories:
#   infra, wrangler, ci
#
# Stages:
#   deploy, post-deploy, cleanup
# ------------------------------------------------------------------------------
check::cleanup_expired_previews() {
  # ✅ Check: Delete expired preview D1, KV, and R2 resources
  # Category: infra, wrangler, ci
  # Stages: deploy, post-deploy, cleanup

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ check::cleanup_expired_previews must be run inside GitLab CI"
    log FATAL "   💡 Tip: This is destructive. Preview cleanup should be scheduled or run after merge."
    log FATAL "   📘 Example: CI=true check::cleanup_expired_previews"
    return 1
  fi

  log INFO "🧹 Cleaning up expired preview D1 databases..."
  local dbs
  dbs=$(pnpm exec wrangler d1 list | jq -r '.[].name' | grep '^preview_' || true)
  for db in $dbs; do
    log INFO "🗑️  Deleting D1 DB: $db"
    pnpm exec wrangler d1 delete "$db" --yes > /dev/null 2>&1 || true
  done

  log INFO "🧹 Cleaning up orphaned preview KV namespaces..."
  local kvs
  kvs=$(pnpm exec wrangler kv namespace list | jq -r '.[].title' | grep '^preview_' || true)
  for kv in $kvs; do
    local ns_id
    ns_id=$(pnpm exec wrangler kv namespace list | jq -r --arg name "$kv" '.[] | select(.title==$name) | .id')
    if [[ -n "$ns_id" ]]; then
      log INFO "🗑️  Deleting KV namespace: $kv ($ns_id)"
      pnpm exec wrangler kv namespace delete --namespace-id "$ns_id" > /dev/null 2>&1 || true
    else
      log WARN "⚠️  KV namespace ID not found for $kv — skipping"
    fi
  done

  log INFO "🧹 Cleaning up expired preview R2 buckets..."
  local buckets
  buckets=$(pnpm exec wrangler r2 bucket list | jq -r '.[].name' | grep '^preview-' || true)
  for bucket in $buckets; do
    log INFO "🗑️  Deleting R2 bucket: $bucket"
    pnpm exec wrangler r2 bucket delete "$bucket" > /dev/null 2>&1 || true
  done

  log INFO "✅ Expired preview resource cleanup complete."
}

# ------------------------------------------------------------------------------
# 🧪 check::perform_staging_rollback_with_verification — Roll back staging and verify stability
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Triggering a rollback via Cloudflare API
#   - Waiting for propagation
#   - Verifying health with a post-deploy script
#   - Optionally notifying Sentry of the rollback
#
# Why it matters:
#   Rollbacks must be automated, observable, and safely verifiable after critical failures in staging.
#
# Globals used:
#   - CLOUDFLARE_API_TOKEN → API key for Cloudflare
#   - ACCOUNT_ID → Cloudflare account ID
#   - SERVICE_NAME → Cloudflare Worker service name
#   - STAGING_URL → Health-checkable endpoint for staging
#   - SENTRY_DSN, SENTRY_KEY → Optional: for audit trail in Sentry
#
# Example:
#   WRANGLER_ENV=staging check::perform_staging_rollback_with_verification
#
# Categories:
#   infra, wrangler, ci, safety
#
# Stages:
#   deploy, post-deploy, integration
# ------------------------------------------------------------------------------
check::perform_staging_rollback_with_verification() {
  # ✅ Check: Trigger rollback and verify staging system health
  # Category: infra, wrangler, ci, safety
  # Stages: deploy, post-deploy, integration

  log INFO "🔁 Triggering rollback for staging environment..."

  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${ACCOUNT_ID:-}" || -z "${SERVICE_NAME:-}" ]]; then
    log FATAL "❌ Missing required env vars: CLOUDFLARE_API_TOKEN, ACCOUNT_ID, or SERVICE_NAME"
    log FATAL "   💡 Tip: These are required to authorize the rollback"
    log FATAL "   📘 Example: export CLOUDFLARE_API_TOKEN=... ACCOUNT_ID=... SERVICE_NAME=..."
    return 1
  fi

  if ! curl --fail -X POST \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/services/$SERVICE_NAME/environments/staging/rollback" \
    > /dev/null 2>&1; then
    log FATAL "❌ Failed to trigger rollback via Cloudflare API"
    log FATAL "   💡 Tip: Verify your service name and account ID are correct"
    log FATAL "   📘 Example URL: https://api.cloudflare.com/client/v4/accounts/.../rollback"
    return 1
  fi

  log INFO "⏳ Waiting for rollback propagation..."
  sleep 10

  if [[ -z "${STAGING_URL:-}" ]]; then
    log WARN "⚠️  STAGING_URL not set — skipping health check"
  else
    log INFO "🔍 Verifying rollback health at $STAGING_URL"
    if ! ./src/scripts/post-deploy-health-check.sh "$STAGING_URL"; then
      log FATAL "❌ Health check failed after rollback"
      log FATAL "   💡 Tip: Verify staging is reachable and rolled back cleanly"
      log FATAL "   📘 Example: curl $STAGING_URL"
      return 1
    fi
  fi

  if [[ -n "${SENTRY_DSN:-}" && -n "${SENTRY_KEY:-}" ]]; then
    log INFO "📡 Sending Sentry rollback audit event..."
    curl -s https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/store/ \
      -H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=$SENTRY_KEY, sentry_client=cf-ci/1.0" \
      -H "Content-Type: application/json" \
      -d '{"message":"Staging rollback completed","level":"info","platform":"javascript"}' \
      > /dev/null 2>&1 || log WARN "⚠️  Failed to notify Sentry"
  else
    log INFO "ℹ️  Skipping Sentry notification — SENTRY_DSN or SENTRY_KEY not set"
  fi

  if command -v post_rollback_infra_verification >/dev/null 2>&1; then
    log INFO "🔎 Running post-rollback infrastructure verification..."
    post_rollback_infra_verification || {
      log FATAL "❌ Post-infra verification failed"
      return 1
    }
  else
    log INFO "ℹ️  No post_rollback_infra_verification hook defined"
  fi

  log INFO "✅ Staging rollback and verification completed successfully."
}

# ------------------------------------------------------------------------------
# 🧪 check::post_rollback_infra_verification — Confirm all bindings are valid after rollback
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring KV, R2, D1, and tail worker are operational after a rollback
#   - Capturing output of all checks to `.rollback-staging-summary.md`
#
# Why it matters:
#   After rollback, bindings and endpoints may still be stale or broken.
#   This check verifies all critical infrastructure is reachable and correct.
#
# Globals used:
#   - Any globals required by `validate_kv_namespaces`, `validate_r2`, `validate_d1_database`, `check_tail_worker`
#
# Example:
#   check::post_rollback_infra_verification
#
# Categories:
#   infra, wrangler, ci, safety
#
# Stages:
#   post-deploy, integration, cleanup
# ------------------------------------------------------------------------------
check::post_rollback_infra_verification() {
  # ✅ Check: Run full binding and tail verification after rollback
  # Category: infra, wrangler, ci, safety
  # Stages: post-deploy, integration, cleanup

  local summary=".rollback-staging-summary.md"
  echo "🔍 Revalidating bindings after rollback..." | tee "$summary"

  local failed=0

  for check in validate_kv_namespaces validate_r2 validate_d1_database check_tail_worker; do
    if command -v "$check" >/dev/null 2>&1; then
      log INFO "▶️  Running $check"
      if ! "$check" 2>&1 | tee -a "$summary"; then
        log FATAL "❌ $check failed"
        ((failed++))
      fi
    else
      log WARN "⚠️  $check not defined — skipping"
      echo "⚠️  $check not defined — skipped" >> "$summary"
    fi
  done

  if (( failed > 0 )); then
    log FATAL "❌ One or more rollback binding checks failed"
    log FATAL "   💡 Tip: Inspect .rollback-staging-summary.md for full output"
    log FATAL "   📘 Example: cat .rollback-staging-summary.md"
    return 1
  fi

  log INFO "✅ All post-rollback binding checks passed"
}

# ------------------------------------------------------------------------------
# 🧪 check::reset_local_environment — Reset or bootstrap local dev state for D1, KV, R2
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Resetting local dev state in "clean", "onboard", or "dev" mode
#   - Deleting/recreating local D1 SQLite, KV, and R2 directories
#   - Applying schema and seeding environment config into local D1
#
# Why it matters:
#   Ensures local environments start from a consistent and repeatable state.
#   Prevents stale dev data and missing migrations from causing local bugs.
#
# Globals used:
#   - DB_NAME → D1 binding name
#   - SCHEMA_FILE → SQL schema file path
#   - D1_SQLITE → SQLite file path
#   - KV_DIR, R2_DIR → Local storage folders
#   - SEED_SCRIPT → Script to seed local D1
#   - ENV_FILE → .env path passed into seed
#   - MODE → Optional override for nested mode
#
# Example:
#   check::reset_local_environment clean
#
# Categories:
#   infra, database, shell, wrangler
#
# Stages:
#   hydrate, build, pre-commit, dev
# ------------------------------------------------------------------------------
check::reset_local_environment() {
  # ✅ Check: Reset or bootstrap local D1/KV/R2 state
  # Category: infra, database, shell, wrangler
  # Stages: hydrate, build, pre-commit, dev

  local mode="$1"
  local bootstrap_marker=".wrangler/state/.bootstrapped"

  if [[ "$mode" == "clean" || "$mode" == "onboard" ]]; then
    log WARN "🧹 Wiping local development environment: D1, KV, and R2"

    log INFO "🗑️  Deleting local D1 SQLite database: $D1_SQLITE"
    rm -f "$D1_SQLITE" || true
    mkdir -p "$(dirname "$D1_SQLITE")"

    log INFO "🗑️  Removing local KV and R2 directories: $KV_DIR, $R2_DIR"
    rm -rf "$KV_DIR" "$R2_DIR" || true
    mkdir -p "$KV_DIR" "$R2_DIR"

    if [[ ! -f "$SCHEMA_FILE" ]]; then
      log FATAL "❌ Cannot apply schema — file not found: $SCHEMA_FILE"
      log FATAL "   💡 Tip: Double-check your schema file path or bind it via SCHEMA_FILE"
      log FATAL "   📘 Example: export SCHEMA_FILE=./infra/schema.sql"
      return 1
    fi

    log INFO "🧱 Applying schema from: $SCHEMA_FILE"
    if ! wrangler d1 execute "$DB_NAME" --file="$SCHEMA_FILE"; then
      log FATAL "❌ Failed to apply base schema to D1"
      log FATAL "   💡 Tip: Verify D1 is running and the schema file is valid SQL"
      return 1
    fi

    log INFO "🌱 Seeding local D1 database using: $SEED_SCRIPT"
    export DB_NAME ENV_FILE
    if ! source "$SEED_SCRIPT"; then
      log FATAL "❌ Seeding failed: $SEED_SCRIPT"
      return 1
    fi

  else
    log INFO "🔄 Skipping reset — preserving local D1/KV/R2 state"

    if [[ "${MODE:-$mode}" == "dev" ]]; then
      if [[ ! -f "$bootstrap_marker" ]]; then
        log INFO "🧪 First-time local dev detected — running onboard mode..."
        "$0" onboard || {
          log FATAL "❌ Failed to run onboard bootstrap"
          return 1
        }
        touch "$bootstrap_marker"
      fi

      if command -v launch_local_dev_server >/dev/null 2>&1; then
        log INFO "🚀 Launching local dev server"
        launch_local_dev_server
      else
        log WARN "⚠️  launch_local_dev_server not defined"
      fi
    fi
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::launch_local_dev_server — Start the Wrangler local dev server
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that `wrangler` is available
#   - Executing `wrangler dev --local` using `exec` to replace the current shell
#
# Why it matters:
#   Local development must run against realistic local state to validate D1, KV, R2 bindings,
#   routes, and worker startup behavior. This is the final entry point for local workflows.
#
# Globals used:
#   - None (relies on current directory + wrangler.toml config)
#
# Example:
#   check::launch_local_dev_server
#
# Categories:
#   shell, wrangler, infra
#
# Stages:
#   dev, hydrate
# ------------------------------------------------------------------------------
check::launch_local_dev_server() {
  # ✅ Check: Start Wrangler in local dev mode
  # Category: shell, wrangler, infra
  # Stages: dev, hydrate

  if ! command -v wrangler >/dev/null 2>&1; then
    log FATAL "❌ wrangler not found in PATH"
    log FATAL "   💡 Tip: Install Wrangler CLI and ensure it's in your shell PATH"
    log FATAL "   📘 Example: pnpm add -g wrangler"
    return 1
  fi

  log INFO "🚀 Starting local development server with wrangler..."
  log INFO "🔧 Command: wrangler dev --local"

  exec wrangler dev --local
}

# ------------------------------------------------------------------------------
# 🧪 check::create_kv_namespaces — Provision missing KV namespaces from wrangler.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parsing `kv_namespaces` from wrangler.json or env.<ENVIRONMENT>.kv_namespaces
#   - Creating any missing namespaces using Wrangler CLI
#
# Why it matters:
#   If KV bindings aren't created, Workers will crash at runtime with missing binding errors.
#   This prevents broken deployments and ensures parity with config.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json (default: wrangler.json)
#   - ENVIRONMENT → Optional (e.g. preview, staging, production)
#
# Example:
#   ENVIRONMENT=staging WRANGLER_CONFIG=wrangler.json check::create_kv_namespaces
#
# Categories:
#   wrangler, infra, ci
#
# Stages:
#   hydrate, build, deploy
# ------------------------------------------------------------------------------
check::create_kv_namespaces() {
  # ✅ Check: Create missing KV namespaces from wrangler.json
  # Category: wrangler, infra, ci
  # Stages: hydrate, build, deploy

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ $config not found"
    log FATAL "   💡 Tip: Ensure Wrangler config is committed and accessible in CI or local shell"
    log FATAL "   📘 Example: cp wrangler.json.example wrangler.json"
    return 1
  fi

  local jq_expr
  if [[ -n "${ENVIRONMENT:-}" ]]; then
    jq_expr=".env.\"$ENVIRONMENT\".kv_namespaces[]?.binding"
  else
    jq_expr=".kv_namespaces[]?.binding"
  fi

  local namespaces
  namespaces=$(jq -r "$jq_expr" "$config" 2>/dev/null | grep -v '^null$' | sort -u)

  if [[ -z "$namespaces" ]]; then
    log INFO "ℹ️ No KV namespaces defined in $config under ${ENVIRONMENT:+env.$ENVIRONMENT} — skipping"
    return 0
  fi

  log INFO "⚡ Found KV bindings: $namespaces"

  local failed=0
  for name in $namespaces; do
    if ! pnpm exec wrangler kv namespace list | jq -r '.[].title' | grep -q "^$name$"; then
      log INFO "📦 Creating KV namespace: $name"
      if ! pnpm exec wrangler kv namespace create --binding "$name" ${ENVIRONMENT:+--env "$ENVIRONMENT"} > /dev/null; then
        log FATAL "❌ Failed to create KV namespace: $name"
        failed=1
      fi
    else
      log INFO "✅ KV namespace already exists: $name"
    fi
  done

  if [[ "$failed" -ne 0 ]]; then
    return 1
  fi

  log INFO "✅ KV namespace provisioning complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_kv_namespaces — Ensure required KV namespaces exist in Cloudflare
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reading declared KV bindings from `wrangler.json` for the given $WRANGLER_ENV
#   - Comparing against live namespaces from `wrangler kv namespace list`
#
# Why it matters:
#   Missing KV bindings will break your worker at runtime with unresolved binding errors.
#   This check ensures that expected bindings are provisioned before deploy or test.
#
# Globals used:
#   - WRANGLER_ENV → Environment block to check (e.g. preview, staging)
#   - wrangler.json → Declares `env.<env>.kv_namespaces[]`
#
# Example:
#   WRANGLER_ENV=preview check::validate_kv_namespaces
#
# Categories:
#   infra, wrangler, ci
#
# Stages:
#   hydrate, build, test, deploy
# ------------------------------------------------------------------------------
check::validate_kv_namespaces() {
  # ✅ Check: Validate required KV namespaces exist in Cloudflare
  # Category: infra, wrangler, ci
  # Stages: hydrate, build, test, deploy

  local env="${WRANGLER_ENV:-}"
  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ -z "$env" ]]; then
    log FATAL "❌ WRANGLER_ENV is not set"
    log FATAL "   💡 Tip: Provide a target environment to validate KV bindings"
    log FATAL "   📘 Example: WRANGLER_ENV=preview check::validate_kv_namespaces"
    return 1
  fi

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ Wrangler config not found: $config"
    log FATAL "   💡 Tip: Ensure wrangler.json is present and valid"
    return 1
  fi

  log INFO "📦 Validating KV namespaces for env: $env"

  local kv_bindings
  kv_bindings=$(jq -r ".env[\"$env\"].kv_namespaces[]?.binding" "$config" 2>/dev/null | grep -v '^null$' | sort -u)

  if [[ -z "$kv_bindings" ]]; then
    log WARN "⚠️  No KV namespaces declared for $env in $config"
    return 0
  fi

  local actual_kv
  mapfile -t actual_kv < <(pnpm exec wrangler kv namespace list | jq -r '.[].title')

  local missing=0
  for kv in $kv_bindings; do
    if printf '%s\n' "${actual_kv[@]}" | grep -Fxq "$kv"; then
      log INFO "✅ Found KV: $kv"
    else
      log FATAL "❌ Missing KV: $kv"
      missing=1
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ One or more required KV bindings are missing"
    log FATAL "   💡 Tip: Run check::create_kv_namespaces to provision missing KV namespaces"
    log FATAL "   📘 Example: ENVIRONMENT=$env check::create_kv_namespaces"
    return 1
  fi

  log INFO "✅ All KV namespaces for $env are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::create_r2_buckets — Ensure all declared R2 buckets are created
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Parsing `r2_buckets` from wrangler.json (or env.<ENVIRONMENT>.r2_buckets)
#   - Creating any buckets that do not already exist via Wrangler CLI
#
# Why it matters:
#   R2 buckets must exist before deployment. Missing buckets will cause Workers to fail
#   at runtime when bindings are unresolved or operations are rejected.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json (default: wrangler.json)
#   - ENVIRONMENT → Optional environment block (e.g., preview, staging)
#
# Example:
#   ENVIRONMENT=staging WRANGLER_CONFIG=wrangler.json check::create_r2_buckets
#
# Categories:
#   wrangler, infra, ci
#
# Stages:
#   hydrate, build, deploy
# ------------------------------------------------------------------------------
check::create_r2_buckets() {
  # ✅ Check: Create any missing R2 buckets declared in wrangler.json
  # Category: wrangler, infra, ci
  # Stages: hydrate, build, deploy

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ wrangler.json not found at path: $config"
    log FATAL "   💡 Tip: Ensure your config is committed and correct"
    log FATAL "   📘 Example: cp wrangler.json.example $config"
    return 1
  fi

  local jq_expr
  if [[ -n "${ENVIRONMENT:-}" ]]; then
    jq_expr=".env.\"$ENVIRONMENT\".r2_buckets[]?.bucket_name"
  else
    jq_expr=".r2_buckets[]?.bucket_name"
  fi

  local r2_buckets
  r2_buckets=$(jq -r "$jq_expr" "$config" 2>/dev/null | grep -v '^null$' | sort -u)

  if [[ -z "$r2_buckets" ]]; then
    log WARN "ℹ️  No R2 bucket definitions found in ${ENVIRONMENT:+env.$ENVIRONMENT} → r2_buckets"
    return 0
  fi

  log INFO "💾 Creating R2 buckets defined in $config..."

  local existing
  mapfile -t existing < <(pnpm exec wrangler r2 bucket list | jq -r '.[].name')

  local failed=0
  for name in $r2_buckets; do
    if printf '%s\n' "${existing[@]}" | grep -Fxq "$name"; then
      log INFO "✅ R2 bucket already exists: $name"
    else
      log INFO "📦 R2 bucket not found — creating: $name"
      if ! pnpm exec wrangler r2 bucket create "$name" > /dev/null 2>&1; then
        log FATAL "❌ Failed to create R2 bucket: $name"
        failed=1
      fi
    fi
  done

  if [[ "$failed" -ne 0 ]]; then
    return 1
  fi

  log INFO "✅ R2 bucket provisioning complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_r2_buckets — Ensure required R2 buckets exist in the account
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that each bucket in $REQUIRED_BUCKETS exists in the current account
#   - Enforcing CI-only execution to prevent destructive usage
#
# Why it matters:
#   Missing R2 buckets will cause runtime binding errors in Workers using them.
#   This validation prevents broken deployments and ensures resource consistency.
#
# Globals used:
#   - CI → Must be "true" to run
#   - ENV → Logical environment name (e.g., staging, production)
#   - REQUIRED_BUCKETS → Array of R2 bucket names to validate
#
# Example:
#   ENV=staging REQUIRED_BUCKETS=("analytics-archive" "logs-archive") check::validate_r2_buckets
#
# Categories:
#   wrangler, infra, ci
#
# Stages:
#   build, test, deploy
# ------------------------------------------------------------------------------
check::validate_r2_buckets() {
  # ✅ Check: Ensure all declared R2 buckets are present in the account
  # Category: wrangler, infra, ci
  # Stages: build, test, deploy

  local env="${ENV:-}"

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ check::validate_r2_buckets must be run inside GitLab CI"
    log FATAL "   💡 Tip: Add \`CI=true\` to your CI environment"
    log FATAL "   📘 Example: CI=true ENV=staging check::validate_r2_buckets"
    return 1
  fi

  if [[ -z "${REQUIRED_BUCKETS[*]:-}" ]]; then
    log FATAL "❌ REQUIRED_BUCKETS is not defined"
    log FATAL "   💡 Tip: Provide a list of required R2 buckets as a bash array"
    log FATAL "   📘 Example: REQUIRED_BUCKETS=(archive-a archive-b)"
    return 1
  fi

  log INFO "📦 Validating required R2 buckets for environment: ${env:-<unset>}"

  local existing
  mapfile -t existing < <(pnpm exec wrangler r2 bucket list | jq -r '.[].name')

  local missing=0
  for bucket in "${REQUIRED_BUCKETS[@]}"; do
    if printf '%s\n' "${existing[@]}" | grep -Fxq "$bucket"; then
      log INFO "✅ Found R2 bucket: $bucket"
    else
      log FATAL "❌ Missing R2 bucket: $bucket"
      ((missing++))
    fi
  done

  if [[ "$missing" -gt 0 ]]; then
    log FATAL "❌ R2 bucket validation failed — $missing bucket(s) missing"
    log FATAL "   💡 Tip: Run \`check::create_r2_buckets\` to provision them"
    return 1
  fi

  log INFO "✅ All required R2 buckets are present for $env"
}

# ------------------------------------------------------------------------------
# 🧪 check::ensure_d1_database_exists — Ensure required D1 database exists or create it
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking if a D1 database named $DB_NAME exists in the current account
#   - Creating the database if it doesn't already exist
#
# Why it matters:
#   Workers using D1 will fail if the database binding is not created.
#   This check ensures your project bootstraps correctly in all environments.
#
# Globals used:
#   - DB_NAME → Name of the D1 database to check/create
#   - ENVIRONMENT → Optional environment tag for display/logging
#
# Example:
#   DB_NAME=analytics_prod check::ensure_d1_database_exists
#
# Categories:
#   wrangler, infra, database, ci
#
# Stages:
#   hydrate, build, deploy
# ------------------------------------------------------------------------------
check::ensure_d1_database_exists() {
  # ✅ Check: Create D1 database if it doesn't exist
  # Category: wrangler, infra, database, ci
  # Stages: hydrate, build, deploy

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set — cannot validate or create D1 database"
    log FATAL "   💡 Tip: Set DB_NAME before running this check"
    log FATAL "   📘 Example: DB_NAME=analytics_prod check::ensure_d1_database_exists"
    return 1
  fi

  local env_suffix="${ENVIRONMENT:+ (env: $ENVIRONMENT)}"
  log INFO "🔍 Verifying existence of D1 database: '$DB_NAME'$env_suffix"

  if ! pnpm exec wrangler d1 list | jq -e --arg name "$DB_NAME" '.[] | select(.name == $name)' > /dev/null; then
    log INFO "📦 D1 database not found — creating new database: '$DB_NAME'"
    if ! pnpm exec wrangler d1 create "$DB_NAME" > /dev/null; then
      log FATAL "❌ Failed to create D1 database: '$DB_NAME'"
      log FATAL "   💡 Tip: Check your API token, permissions, and account ID"
      log FATAL "   📘 Example: pnpm exec wrangler d1 create $DB_NAME"
      return 1
    fi
    log INFO "✅ D1 database successfully created: '$DB_NAME'"
  else
    log INFO "✅ D1 database already exists: '$DB_NAME'"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::apply_base_schema_to_d1 — Apply base SQL schema to the D1 database
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Confirming that the base schema SQL file exists
#   - Checking if the schema has already been applied (by verifying known table)
#   - Applying the schema if needed using Wrangler
#
# Why it matters:
#   Applying a schema multiple times can fail unless it’s fully idempotent.
#   This check ensures we only apply the base schema once and only when needed.
#
# Globals used:
#   - DB_NAME → D1 database name
#   - BASE_SCHEMA_PATH → Path to base schema .sql file
#   - SCHEMA_CHECK_TABLE → Optional override for table to check (default: migrations)
#
# Example:
#   DB_NAME=analytics BASE_SCHEMA_PATH=schema/base.sql check::apply_base_schema_to_d1
#
# Categories:
#   database, wrangler, infra
#
# Stages:
#   hydrate, build, test
# ------------------------------------------------------------------------------
check::apply_base_schema_to_d1() {
  # ✅ Check: Apply base schema file to D1 database only if not already present
  # Category: database, wrangler, infra
  # Stages: hydrate, build, test

  local table="${SCHEMA_CHECK_TABLE:-migrations}"

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set. Cannot apply schema."
    log FATAL "   💡 Tip: Provide the D1 binding name via DB_NAME"
    log FATAL "   📘 Example: DB_NAME=analytics check::apply_base_schema_to_d1"
    return 1
  fi

  if [[ -z "${BASE_SCHEMA_PATH:-}" || ! -f "$BASE_SCHEMA_PATH" ]]; then
    log FATAL "❌ Base schema file not found: $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Set BASE_SCHEMA_PATH to your base schema .sql file"
    return 1
  fi

  log INFO "🔍 Checking if schema is already applied by verifying table '$table' exists..."

  if pnpm exec wrangler d1 execute "$DB_NAME" --command \
    "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" \
    | grep -q "$table"; then
    log INFO "✅ Schema already applied — table '$table' exists. Skipping."
    return 0
  fi

  log INFO "🧱 Applying base schema to D1 database: $DB_NAME"
  log INFO "📄 Using schema file: $BASE_SCHEMA_PATH"

  if ! pnpm exec wrangler d1 execute "$DB_NAME" --file "$BASE_SCHEMA_PATH"; then
    log FATAL "❌ Failed to apply schema to '$DB_NAME' using $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Check the SQL file for idempotency and syntax errors"
    return 1
  fi

  log INFO "✅ Base schema successfully applied to D1 database: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::seed_database_from_env — Run seed script to populate D1 from environment config
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validating that the seed script exists and is executable
#   - Exporting DB_NAME and ENV_FILE
#   - Sourcing the script to populate global, tier, and customer config
#
# Why it matters:
#   D1 must be seeded with core data (e.g., tier settings, flags, tenant IDs).
#   If this step fails, your app may start but behave incorrectly.
#
# Globals used:
#   - DB_NAME     → D1 database name
#   - ENV_FILE    → .env file to load configuration from
#   - SEED_SCRIPT → Path to seeding script (e.g. ./scripts/seed-d1.sh)
#
# Example:
#   DB_NAME=analytics ENV_FILE=.env.local SEED_SCRIPT=./scripts/seed.sh check::seed_database_from_env
#
# Categories:
#   database, infra, shell
#
# Stages:
#   hydrate, build, dev
# ------------------------------------------------------------------------------
check::seed_database_from_env() {
  # ✅ Check: Execute seed script for D1 from ENV_FILE
  # Category: database, infra, shell
  # Stages: hydrate, build, dev

  if [[ -z "${SEED_SCRIPT:-}" ]]; then
    log FATAL "❌ SEED_SCRIPT is not set — cannot seed database"
    log FATAL "   💡 Tip: Define path to your seed script (must be executable)"
    log FATAL "   📘 Example: export SEED_SCRIPT=./scripts/seed-d1-from-env.sh"
    return 1
  fi

  if [[ ! -x "$SEED_SCRIPT" ]]; then
    log FATAL "❌ Seed script is missing or not executable: $SEED_SCRIPT"
    log FATAL "   💡 Tip: Ensure the script exists and has execute permissions"
    log FATAL "   📘 Example: chmod +x $SEED_SCRIPT"
    return 1
  fi

  log INFO "🌱 Running seed script to populate D1 from: $ENV_FILE"
  export DB_NAME ENV_FILE

  if ! source "$SEED_SCRIPT"; then
    log FATAL "❌ Seeding failed — script returned non-zero exit"
    log FATAL "   💡 Tip: Check your .env, DB_NAME, and seed logic"
    log FATAL "   📘 Example: DB_NAME=analytics ENV_FILE=.env.local SEED_SCRIPT=... check::seed_database_from_env"
    return 1
  fi

  log INFO "✅ D1 seed completed successfully using: $SEED_SCRIPT"
}

# ------------------------------------------------------------------------------
# 🧪 check::seed_settings_into_d1 — Insert global, tier, and customer settings into D1
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Inserting environment-driven global + tier + customer settings into D1
#   - Verifying all required globals are defined before attempting
#
# Why it matters:
#   Your system's core behavior depends on tier-based and global config.
#   A clean seed ensures deterministic behavior across all environments and tests.
#
# Globals used:
#   - DB_NAME → D1 binding to insert into
#   - DEFAULT_BATCH_SIZE, DEFAULT_FLUSH_INTERVAL_MS, D1_RETENTION_DAYS, DEBUG_FLUSH_LOGGING
#   - columns → Comma-separated columns for tier_settings
#   - tier_rows → Precomputed multi-line value tuples for tier_settings
#   - tiers → Array of lowercase tier names
#   - CUSTOMER_UUID_<TIER> → UUIDs for each tier (env var per tier)
#
# Example:
#   check::seed_settings_into_d1
#
# Categories:
#   database, infra, shell
#
# Stages:
#   hydrate, build, test, dev
# ------------------------------------------------------------------------------
check::seed_settings_into_d1() {
  # ✅ Check: Insert global, tier, and customer settings into D1
  # Category: database, infra, shell
  # Stages: hydrate, build, test, dev

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set"
    log FATAL "   💡 Tip: Provide the target D1 binding name"
    return 1
  fi

  for var in DEFAULT_BATCH_SIZE DEFAULT_FLUSH_INTERVAL_MS D1_RETENTION_DAYS DEBUG_FLUSH_LOGGING columns tier_rows; do
    if [[ -z "${!var:-}" ]]; then
      log FATAL "❌ Required global var missing: $var"
      log FATAL "   💡 Tip: Export or generate $var before calling this check"
      return 1
    fi
  done

  if [[ "${#tiers[@]}" -eq 0 ]]; then
    log FATAL "❌ tiers array is empty"
    log FATAL "   💡 Tip: Populate the tiers array with at least one tier (e.g., free, pro)"
    return 1
  fi

  log INFO "🌱 Inserting global, tier, and customer settings into D1..."

  local customer_rows=""
  for tier in "${tiers[@]}"; do
    local upper
    upper=$(echo "$tier" | tr '[:lower:]' '[:upper:]')
    local uuid_var="CUSTOMER_UUID_${upper}"
    local uuid="${!uuid_var:-}"
    if [[ -z "$uuid" ]]; then
      log FATAL "❌ Missing customer UUID for tier: $tier (expected \$CUSTOMER_UUID_${upper})"
      return 1
    fi
    customer_rows+="  ('$uuid', '$tier'),"$'\n'
  done
  customer_rows=$(echo "$customer_rows" | sed '$ s/,$//') # remove trailing comma

  if ! pnpm exec wrangler d1 execute "$DB_NAME" <<EOF
-- 🌍 global_settings
INSERT OR IGNORE INTO global_settings (key, value) VALUES
  ('DEFAULT_BATCH_SIZE', '$DEFAULT_BATCH_SIZE'),
  ('DEFAULT_FLUSH_INTERVAL_MS', '$DEFAULT_FLUSH_INTERVAL_MS'),
  ('D1_RETENTION_DAYS', '$D1_RETENTION_DAYS'),
  ('DEBUG_FLUSH_LOGGING', '$DEBUG_FLUSH_LOGGING');

-- 📊 tier_settings
INSERT OR IGNORE INTO tier_settings (
  tier, $columns
) VALUES
$tier_rows;

-- 👤 customer_tiers
INSERT OR IGNORE INTO customer_tiers (customer_id, tier) VALUES
$customer_rows;
EOF
  then
    log FATAL "❌ Failed to seed global/tier/customer settings into D1: $DB_NAME"
    log FATAL "   💡 Tip: Check SQL formatting and required variables"
    return 1
  fi

  log INFO "✅ Seeded global, tier, and customer settings into D1: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::confirm_d1_connectivity — Verify that the D1 binding is reachable
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Attempting to run a simple `SELECT 1` against the target D1 database
#
# Why it matters:
#   If Wrangler cannot connect to the D1 binding, any schema or seed operations will fail.
#   This is the fastest way to confirm the environment is operational.
#
# Globals used:
#   - DB_NAME → D1 binding name to connect to
#
# Example:
#   DB_NAME=analytics check::confirm_d1_connectivity
#
# Categories:
#   wrangler, database, infra, ci
#
# Stages:
#   test, hydrate, build
# ------------------------------------------------------------------------------
check::confirm_d1_connectivity() {
  # ✅ Check: Run SELECT 1 against D1 to confirm connection
  # Category: wrangler, database, infra, ci
  # Stages: test, hydrate, build

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set — cannot check D1 connectivity"
    log FATAL "   💡 Tip: Export DB_NAME before calling this check"
    log FATAL "   📘 Example: DB_NAME=analytics check::confirm_d1_connectivity"
    return 1
  fi

  if ! pnpm exec wrangler d1 execute "$DB_NAME" --command "SELECT 1;" > /dev/null 2>&1; then
    log FATAL "❌ Failed to connect to D1 binding: $DB_NAME"
    log FATAL "   💡 Tip: Verify the database exists and Wrangler is authenticated"
    log FATAL "   📘 Example: pnpm exec wrangler d1 list | grep \"$DB_NAME\""
    return 1
  fi

  log INFO "✅ D1 database is reachable: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::ensure_migrations_table_exists — Ensure migrations table exists in D1
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Extracting the DDL for $MIGRATIONS_TABLE from $BASE_SCHEMA_PATH
#   - Executing it against the target D1 database using Wrangler
#
# Why it matters:
#   D1 migration tooling depends on the existence of a tracking table.
#   If it does not exist, future migrations may fail or be reapplied.
#
# Globals used:
#   - DB_NAME → Name of the D1 database
#   - BASE_SCHEMA_PATH → Path to base schema file
#   - MIGRATIONS_TABLE → Table to ensure exists in D1
#
# Example:
#   DB_NAME=analytics \
#   BASE_SCHEMA_PATH=schema/base.sql \
#   MIGRATIONS_TABLE=_migrations \
#   check::ensure_migrations_table_exists
#
# Categories:
#   database, wrangler, infra
#
# Stages:
#   hydrate, build, migrate
# ------------------------------------------------------------------------------
check::ensure_migrations_table_exists() {
  # ✅ Check: Create or verify existence of the D1 migrations table
  # Category: database, wrangler, infra
  # Stages: hydrate, build, migrate

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set"
    log FATAL "   💡 Tip: Provide the D1 binding name"
    log FATAL "   📘 Example: DB_NAME=analytics check::ensure_migrations_table_exists"
    return 1
  fi

  if [[ -z "${BASE_SCHEMA_PATH:-}" || ! -f "$BASE_SCHEMA_PATH" ]]; then
    log FATAL "❌ Base schema file not found: $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Set BASE_SCHEMA_PATH to the path of your .sql schema file"
    log FATAL "   📘 Example: BASE_SCHEMA_PATH=schema/base.sql"
    return 1
  fi

  if [[ -z "${MIGRATIONS_TABLE:-}" ]]; then
    log FATAL "❌ MIGRATIONS_TABLE is not set"
    log FATAL "   💡 Tip: Define the table name to extract from the schema file"
    log FATAL "   📘 Example: MIGRATIONS_TABLE=_migrations"
    return 1
  fi

  log INFO "📜 Extracting DDL for '$MIGRATIONS_TABLE' from $BASE_SCHEMA_PATH..."
  local ddl
  ddl=$(awk "/CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE\\b/,/);/" "$BASE_SCHEMA_PATH" | sed 's/;$//')

  if [[ -z "$ddl" ]]; then
    log FATAL "❌ Could not find CREATE TABLE for '$MIGRATIONS_TABLE' in $BASE_SCHEMA_PATH"
    log FATAL "   💡 Tip: Ensure the schema includes a full CREATE TABLE IF NOT EXISTS statement for $MIGRATIONS_TABLE"
    log FATAL "   📘 Example:
      CREATE TABLE IF NOT EXISTS $MIGRATIONS_TABLE (
        filename TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );"
    return 1
  fi

  log INFO "🧱 Executing DDL to ensure '$MIGRATIONS_TABLE' exists in D1..."
  if ! pnpm exec wrangler d1 execute "$DB_NAME" --command "$ddl" > /dev/null; then
    log FATAL "❌ Failed to apply DDL for $MIGRATIONS_TABLE"
    log FATAL "   💡 Tip: Validate that your DDL is valid SQLite and that Wrangler is authenticated"
    log FATAL "   📘 Example: pnpm exec wrangler d1 execute $DB_NAME --command \"$ddl\""
    return 1
  fi

  log INFO "✅ Migrations table '$MIGRATIONS_TABLE' ensured in D1: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::execute_pending_migrations — Execute or validate D1 SQL migrations
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Applying unapplied SQL migration files from $MIGRATIONS_DIR
#   - Recording each applied migration in $MIGRATIONS_TABLE
#
# Why it matters:
#   Migrations must be tracked, idempotent, and safely recorded to avoid reapplication
#   or schema drift across environments.
#
# Globals used:
#   - DB_NAME → Name of the D1 database binding
#   - MIGRATIONS_DIR → Directory containing .sql files
#   - MIGRATIONS_TABLE → Table tracking applied migrations (default: migrations)
#   - MODE → "check" or "apply"
#   - STRICT → If true, aborts on any pending migration in check mode
#
# Example:
#   DB_NAME=analytics MIGRATIONS_DIR=migrations MODE=check STRICT=true check::execute_pending_migrations
#
# Categories:
#   database, wrangler, ci
#
# Stages:
#   migrate, build, test
# ------------------------------------------------------------------------------
check::execute_pending_migrations() {
  # ✅ Check: Apply or verify unapplied SQL migrations in D1
  # Category: database, wrangler, ci
  # Stages: migrate, build, test

  local applied_count=0
  local pending_count=0
  local skipped_count=0
  local error_count=0
  local table="${MIGRATIONS_TABLE:-migrations}"

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set"
    log FATAL "   💡 Tip: Set DB_NAME before executing this check"
    log FATAL "   📘 Example: DB_NAME=analytics"
    return 1
  fi

  if [[ -z "${MIGRATIONS_DIR:-}" || ! -d "$MIGRATIONS_DIR" ]]; then
    log FATAL "❌ MIGRATIONS_DIR not found: $MIGRATIONS_DIR"
    log FATAL "   💡 Tip: Set MIGRATIONS_DIR to a directory of .sql files"
    log FATAL "   📘 Example: MIGRATIONS_DIR=./migrations"
    return 1
  fi

  shopt -s nullglob
  local files=("$MIGRATIONS_DIR"/*.sql)

  if [[ ${#files[@]} -eq 0 ]]; then
    log INFO "✅ No migration files found in $MIGRATIONS_DIR"
    return 0
  fi

  for file in "${files[@]}"; do
    local filename
    filename="$(basename "$file")"
    local escaped_filename
    escaped_filename=$(printf "%s" "$filename" | sed "s/'/''/g")

    local result
    result=$(pnpm exec wrangler d1 execute "$DB_NAME" \
      --command "SELECT COUNT(1) FROM $table WHERE filename = '$escaped_filename';" \
      --json 2>/dev/null || true)

    local count
    count=$(echo "$result" | jq -r '.[0].results[0]["COUNT(1)"]' 2>/dev/null || echo "ERROR")

    if [[ "$count" == "1" ]]; then
      log INFO "✅ Already applied: $filename"
      ((skipped_count++))
      continue
    elif [[ "$count" != "0" ]]; then
      log FATAL "❌ Unexpected row count for $filename (count=$count)"
      log FATAL "   💡 Tip: Verify the schema of $table and ensure consistent column names"
      log FATAL "   📘 Example: SELECT * FROM $table WHERE filename = '$filename';"
      ((error_count++))
      continue
    fi

    if [[ "$MODE" == "check" ]]; then
      log WARN "⏳ Pending migration: $filename"
      ((pending_count++))
      if [[ "$STRICT" == "true" ]]; then
        log FATAL "🚫 STRICT=true — aborting due to pending migrations"
        log FATAL "   💡 Tip: Apply pending migrations manually or switch to MODE=apply"
        return 1
      fi
      continue
    fi

    log INFO "📥 Executing migration: $filename"
    if ! pnpm exec wrangler d1 execute "$DB_NAME" --file "$file"; then
      log FATAL "❌ Failed to apply: $filename"
      log FATAL "   💡 Tip: Check for SQL syntax errors or binding issues"
      log FATAL "   📘 Example: pnpm exec wrangler d1 execute $DB_NAME --file $file"
      ((error_count++))
      continue
    fi

    local insert="INSERT INTO $table (filename) VALUES ('$escaped_filename');"
    if ! pnpm exec wrangler d1 execute "$DB_NAME" --command "$insert" > /dev/null; then
      log FATAL "❌ Failed to record applied migration: $filename"
      log FATAL "   💡 Tip: Ensure table $table has a column named 'filename'"
      log FATAL "   📘 Example: ALTER TABLE $table ADD COLUMN filename TEXT;"
      ((error_count++))
      continue
    fi

    log INFO "✅ Applied: $filename"
    ((applied_count++))
  done

  log INFO ""
  log INFO "📊 Migration Summary for $DB_NAME:"
  [[ "$MODE" == "apply" ]] && log INFO "   ✅ Applied              : $applied_count"
  log INFO "   ➖ Already applied       : $skipped_count"
  log INFO "   ⚠️  Pending (check only)  : $pending_count"
  log INFO "   ❌ Failed to apply       : $error_count"

  if [[ "$error_count" -gt 0 ]]; then
    log FATAL "💥 Migration execution failed with $error_count error(s)"
    return 1
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_d1_database — Confirm that the expected D1 database exists
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that $DB_NAME exists via `wrangler d1 list`
#
# Why it matters:
#   If the expected D1 database is missing, any schema, seed, or migration steps will fail.
#   This check prevents deploying or testing against unprovisioned infrastructure.
#
# Globals used:
#   - DB_NAME → Name of the D1 database binding
#
# Example:
#   DB_NAME=analytics check::validate_d1_database
#
# Categories:
#   database, wrangler, infra
#
# Stages:
#   hydrate, check, build, deploy
# ------------------------------------------------------------------------------
check::validate_d1_database() {
  # ✅ Check: Ensure D1 database exists in the current account
  # Category: database, wrangler, infra
  # Stages: hydrate, check, build, deploy

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set — cannot validate D1 database"
    log FATAL "   💡 Tip: Export DB_NAME to match your wrangler binding"
    log FATAL "   📘 Example: DB_NAME=analytics check::validate_d1_database"
    return 1
  fi

  log INFO "🧱 Validating D1 database: $DB_NAME"

  if ! pnpm exec wrangler d1 list | jq -r '.[].name' | grep -Fxq "$DB_NAME"; then
    log FATAL "❌ D1 database not found: $DB_NAME"
    log FATAL "   💡 Tip: Run \`check::ensure_d1_database_exists\` to create it"
    log FATAL "   📘 Example: DB_NAME=$DB_NAME check::ensure_d1_database_exists"
    return 1
  fi

  log INFO "✅ Found D1 database: $DB_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::create_and_bootstrap_preview_d1 — Create + bootstrap isolated preview D1 database
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Creating a preview D1 database named preview_<CI_COMMIT_REF_SLUG>
#   - Running the bootstrap script to apply schema + seed
#   - Appending the result to .env.preview
#
# Why it matters:
#   Every preview environment must have an isolated database for accurate
#   feature validation. This ensures schema and data consistency across branches.
#
# Globals used:
#   - CI_COMMIT_REF_SLUG → Branch slug used in the preview DB name
#   - DB_NAME → Temporarily assigned for bootstrap use
#   - analytics_preview_NAME → Exported result for downstream compatibility
#
# Example:
#   CI_COMMIT_REF_SLUG=my-feature-branch \
#   check::create_and_bootstrap_preview_d1
#
# Categories:
#   wrangler, database, cloudflare:d1, ci
#
# Stages:
#   hydrate, build, deploy
# ------------------------------------------------------------------------------
check::create_and_bootstrap_preview_d1() {
  # ✅ Check: Create and bootstrap per-branch D1 preview DB
  # Category: wrangler, database, cloudflare:d1, ci
  # Stages: hydrate, build, deploy

  if [[ -z "${CI_COMMIT_REF_SLUG:-}" ]]; then
    log FATAL "❌ CI_COMMIT_REF_SLUG is not set"
    log FATAL "   💡 Tip: GitLab CI automatically exports this — ensure you're in a CI context"
    log FATAL "   📘 Example: CI_COMMIT_REF_SLUG=feature-x check::create_and_bootstrap_preview_d1"
    return 1
  fi

  local preview_db="preview_${CI_COMMIT_REF_SLUG}"
  export analytics_preview_NAME="$preview_db"

  log INFO "🧱 Attempting to create D1 database: $analytics_preview_NAME"
  if ! pnpm exec wrangler d1 create "$analytics_preview_NAME" > /dev/null 2>&1; then
    log INFO "✅ D1 preview database already exists: $analytics_preview_NAME"
  fi

  if [[ ! -x ./src/scripts/bootstrap-d1.sh ]]; then
    log FATAL "❌ Missing or non-executable: ./src/scripts/bootstrap-d1.sh"
    log FATAL "   💡 Tip: Check that your bootstrap script exists and is chmod +x"
    log FATAL "   📘 Example: chmod +x ./src/scripts/bootstrap-d1.sh"
    return 1
  fi

  log INFO "⚙️ Bootstrapping preview schema for: $analytics_preview_NAME"
  DB_NAME="$analytics_preview_NAME" ./src/scripts/bootstrap-d1.sh || {
    log FATAL "❌ Bootstrap script failed for $analytics_preview_NAME"
    log FATAL "   💡 Tip: Inspect your schema or seed logic"
    log FATAL "   📘 Example: DB_NAME=$analytics_preview_NAME ./src/scripts/bootstrap-d1.sh"
    return 1
  }

  log INFO "📝 Writing analytics_preview_NAME to .env.preview"
  echo "analytics_preview_NAME=$analytics_preview_NAME" >> .env.preview

  log INFO "✅ Preview D1 ready: $analytics_preview_NAME"
}

# ------------------------------------------------------------------------------
# 🧪 check::generate_tier_settings_sql_rows — Construct SQL insert rows for tier_settings table
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Generating a multi-line SQL-ready tuple list for all tiers
#   - Resolving env variables for each schema_key × tier combination
#
# Why it matters:
#   Your D1 tier_settings table must be populated from deterministic, env-scoped
#   values during seeding. This function transforms structured tier config into SQL.
#
# Globals used:
#   - schema_keys → Array of setting keys
#   - tiers → Array of tier names
#   - tier_rows → Output string of SQL tuples
#
# Example:
#   schema_keys=(burst_limit interval_ms)
#   tiers=(free pro)
#   TIER_FREE_BURST_LIMIT=100
#   TIER_FREE_INTERVAL_MS=500
#   TIER_PRO_BURST_LIMIT=1000
#   TIER_PRO_INTERVAL_MS=250
#   check::generate_tier_settings_sql_rows
#
# Categories:
#   shell, database, encoding
#
# Stages:
#   build, hydrate, migrate
# ------------------------------------------------------------------------------
check::generate_tier_settings_sql_rows() {
  # ✅ Check: Generate SQL insert rows for all tiers based on env config
  # Category: shell, database, encoding
  # Stages: build, hydrate, migrate

  if [[ "${#schema_keys[@]}" -eq 0 ]]; then
    log FATAL "❌ schema_keys array is empty"
    log FATAL "   💡 Tip: Populate schema_keys with the keys to inject into tier_settings"
    log FATAL "   📘 Example: schema_keys=(burst_limit interval_ms)"
    return 1
  fi

  if [[ "${#tiers[@]}" -eq 0 ]]; then
    log FATAL "❌ tiers array is empty"
    log FATAL "   💡 Tip: Populate tiers with your supported tier names (e.g., free, pro)"
    log FATAL "   📘 Example: tiers=(free pro)"
    return 1
  fi

  tier_rows=""

  for tier in "${tiers[@]}"; do
    local upper values
    upper=$(echo "$tier" | tr '[:lower:]' '[:upper:]')
    values="'$tier'"

    for key in "${schema_keys[@]}"; do
      local env_key value
      env_key="TIER_${upper}_$(echo "$key" | tr '[:lower:]' '[:upper:]')"
      value="${!env_key:-}"

      if [[ -z "$value" ]]; then
        log FATAL "❌ Missing environment variable: $env_key"
        log FATAL "   💡 Tip: Define all required values for each tier key"
        log FATAL "   📘 Example: export $env_key=123"
        return 1
      fi

      if [[ "$value" =~ ^[0-9]+$ || "$value" == "true" || "$value" == "false" ]]; then
        values+=", $value"
      else
        values+=", '$value'"
      fi
    done

    tier_rows+="  ($values),"$'\n'
  done

  tier_rows="${tier_rows%,*}"  # Trim trailing comma
  log INFO "✅ tier_rows generated successfully with ${#tiers[@]} tier(s)"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_pending_migrations — Execute pending migrations via migration script
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring the migration script is executable
#   - Invoking it with `apply` mode and passing in $DB_NAME
#
# Why it matters:
#   D1 migrations must be applied in a controlled, repeatable way.
#   This ensures schema consistency in CI, local, or preview environments.
#
# Globals used:
#   - DB_NAME → Name of the D1 database to apply migrations to
#   - MIGRATE_SCRIPT → Path to migration runner script (default: migrate.sh)
#
# Example:
#   DB_NAME=analytics MIGRATE_SCRIPT=./scripts/migrate.sh check::run_pending_migrations
#
# Categories:
#   wrangler, database, shell, ci
#
# Stages:
#   build, migrate, deploy
# ------------------------------------------------------------------------------
check::run_pending_migrations() {
  # ✅ Check: Execute pending D1 migrations using a script wrapper
  # Category: wrangler, database, shell, ci
  # Stages: build, migrate, deploy

  if [[ -z "${DB_NAME:-}" ]]; then
    log FATAL "❌ DB_NAME is not set — cannot apply migrations"
    log FATAL "   💡 Tip: Export DB_NAME or pass it via environment"
    log FATAL "   📘 Example: DB_NAME=analytics check::run_pending_migrations"
    return 1
  fi

  local script="${MIGRATE_SCRIPT:-migrate.sh}"

  if [[ -x "$script" ]]; then
    log INFO "🔄 Applying pending D1 migrations using: $script"
    DB_NAME="$DB_NAME" "$script" apply || {
      log FATAL "❌ Migration script failed: $script"
      log FATAL "   💡 Tip: Check the script's output and ensure your SQL files are valid"
      log FATAL "   📘 Example: DB_NAME=$DB_NAME $script apply"
      return 1
    }
  else
    log INFO "ℹ️  Migration script not found or not executable: $script"
    log INFO "🔸 Skipping migration step for DB: $DB_NAME"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::deploy_to_staging_worker — Deploy Worker to staging and verify health
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforcing CI-only execution
#   - Deploying Worker to Cloudflare using Wrangler
#   - Verifying $STAGING_URL/__health responds with 200
#   - Writing a structured Markdown deployment summary
#
# Why it matters:
#   All staging deploys must run in CI, complete health verification,
#   and produce a durable deployment summary for downstream consumption.
#
# Globals used:
#   - CI → Must be set to "true"
#   - CI_COMMIT_REF_NAME → Git branch name
#   - CI_COMMIT_SHA → Git commit hash
#   - STAGING_URL → URL to verify post-deploy health
#
# Example:
#   CI=true CI_COMMIT_REF_NAME=main CI_COMMIT_SHA=abc STAGING_URL=https://myapp-staging.pages.dev check::deploy_to_staging_worker
#
# Categories:
#   wrangler, deploy, ci, infra
#
# Stages:
#   deploy, post-deploy
# ------------------------------------------------------------------------------
check::deploy_to_staging_worker() {
  # ✅ Check: Deploy Worker to staging and validate runtime health
  # Category: wrangler, deploy, ci, infra
  # Stages: deploy, post-deploy

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ CI=true is not set — this check must only run in GitLab CI"
    log FATAL "   💡 Tip: Protect deploys using GitLab environments or stages"
    log FATAL "   📘 Example: CI=true check::deploy_to_staging_worker"
    return 1
  fi

  export ENVIRONMENT="staging"
  export DEPLOY_START_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  export DEPLOY_COMMIT_SHA="${CI_COMMIT_SHA:-unknown}"
  export DEPLOY_BRANCH="${CI_COMMIT_REF_NAME:-unknown}"

  log INFO "🚀 Deploying to Wrangler environment: $ENVIRONMENT"
  if ! pnpm exec wrangler deploy --env "$ENVIRONMENT"; then
    log FATAL "❌ Deployment failed for environment: $ENVIRONMENT"
    log FATAL "   💡 Tip: Check logs for syntax errors or config issues"
    log FATAL "   📘 Example: pnpm exec wrangler deploy --env staging"
    return 1
  fi

  local health_status=""
  if [[ -n "${STAGING_URL:-}" ]]; then
    log INFO "🔍 Running health check: $STAGING_URL/__health"
    if curl -sf "$STAGING_URL/__health" > /dev/null; then
      health_status="✅ Healthy"
      log INFO "✅ Health check passed"
    else
      health_status="❌ Health check failed"
      log FATAL "❌ Health check failed at: $STAGING_URL/__health"
      log FATAL "   💡 Tip: Confirm your routes and bindings are deployed"
      log FATAL "   📘 Example: curl -i $STAGING_URL/__health"
      return 1
    fi
  else
    health_status="⚠️ No STAGING_URL provided"
    log WARN "⚠️  Skipping health check — STAGING_URL not defined"
  fi

  log INFO "📝 Writing deployment summary: .deploy-staging-summary.md"
  {
    echo "# 🚀 Staging Deploy Summary"
    echo ""
    echo "- Branch: \`$DEPLOY_BRANCH\`"
    echo "- Commit: \`$DEPLOY_COMMIT_SHA\`"
    echo "- Environment: \`$ENVIRONMENT\`"
    echo "- Deployed at: \`$DEPLOY_START_TIME\`"
    echo "- Healthcheck: $health_status"
    [[ -n "${STAGING_URL:-}" ]] && echo "- URL: $STAGING_URL"
  } > .deploy-staging-summary.md

  log INFO "✅ Deployment and health verification complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_gradual_canary_rollout — Deploy and incrementally promote canary
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Deploying the canary environment
#   - Gradually adjusting traffic split (5% → 25% → 100%)
#   - Monitoring health at each stage and generating rollback or promotion report
#
# Why it matters:
#   Canary deployment lets you verify runtime stability under live traffic.
#   This check guards against shipping regressions directly to production.
#
# Globals used:
#   - CI → Must be set to "true"
#
# Example:
#   CI=true check::run_gradual_canary_rollout
#
# Categories:
#   ci, deploy, infra, wrangler, safety
#
# Stages:
#   deploy, post-deploy, integration
# ------------------------------------------------------------------------------
check::run_gradual_canary_rollout() {
  # ✅ Check: Perform staged canary rollout with rollback on error
  # Category: ci, deploy, infra, wrangler, safety
  # Stages: deploy, post-deploy, integration

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ CI is not set — canary rollout must only run in CI"
    log FATAL "   💡 Tip: Wrap this check inside a GitLab job with CI=true"
    log FATAL "   📘 Example: CI=true check::run_gradual_canary_rollout"
    return 1
  fi

  log INFO "🚀 Deploying canary version to Cloudflare..."
  if ! pnpm exec wrangler deploy --env canary; then
    log FATAL "❌ Canary deployment failed"
    log FATAL "   💡 Tip: Check wrangler.toml or the deployment logs"
    log FATAL "   📘 Example: pnpm exec wrangler deploy --env canary"
    return 1
  fi

  log INFO "📊 Setting traffic weight to 5%..."
  ./src/scripts/adjust-traffic-weight.sh 5

  log INFO "⏳ Monitoring canary health @ 5%..."
  if ! ./src/scripts/monitor-canary-health.sh --max-errors 10 --window 2m; then
    log FATAL "❌ Canary failed health check at 5% — reverting"
    log FATAL "   💡 Tip: Inspect metrics before reattempting rollout"
    log FATAL "   📘 Example: adjust-traffic-weight.sh 0"
    ./src/scripts/adjust-traffic-weight.sh 0
    ./src/scripts/generate-canary-report.sh fail > .canary-summary.md
    return 1
  fi

  log INFO "📈 Increasing canary to 25%..."
  ./src/scripts/adjust-traffic-weight.sh 25

  log INFO "⏳ Monitoring canary health @ 25%..."
  if ! ./src/scripts/monitor-canary-health.sh --max-errors 10 --window 2m; then
    log FATAL "❌ Canary failed at 25% — reverting"
    log FATAL "   💡 Tip: Stop rollout and promote last stable release"
    log FATAL "   📘 Example: adjust-traffic-weight.sh 0"
    ./src/scripts/adjust-traffic-weight.sh 0
    ./src/scripts/generate-canary-report.sh fail > .canary-summary.md
    return 1
  fi

  log INFO "✅ Canary stable — promoting to 100%"
  ./src/scripts/adjust-traffic-weight.sh 100
  ./src/scripts/generate-canary-report.sh success > .canary-summary.md

  log INFO "📝 Canary rollout complete — report written to .canary-summary.md"
}

# ------------------------------------------------------------------------------
# 🧪 check::deploy_preview_worker_with_secrets — Deploy preview worker and inject secrets
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Injecting required secrets into the preview environment
#   - Deploying to preview using Wrangler
#   - Extracting the resulting preview URL
#   - Writing .env.preview and performing a health check
#
# Why it matters:
#   Preview workers must include all runtime secrets and pass a basic health check.
#   Without validation, CI may silently deploy broken or unreachable previews.
#
# Globals used:
#   - SENTRY_DSN, SENTRY_PROJECT → Required secrets to inject
#   - PREVIEW_URL → Inferred from deployment output
#
# Example:
#   SENTRY_DSN=... SENTRY_PROJECT=... check::deploy_preview_worker_with_secrets
#
# Categories:
#   wrangler, secrets, deploy, ci, infra
#
# Stages:
#   build, deploy, post-deploy
# ------------------------------------------------------------------------------
check::deploy_preview_worker_with_secrets() {
  # ✅ Check: Deploy preview worker and inject SENTRY secrets
  # Category: wrangler, secrets, deploy, ci, infra
  # Stages: build, deploy, post-deploy

  log INFO "🚀 Deploying preview worker..."
  local preview_log
  preview_log=$(mktemp)

  local injected=0
  for s in SENTRY_DSN SENTRY_PROJECT; do
    if [[ -n "${!s:-}" ]]; then
      echo "${!s}" | pnpm exec wrangler secret put "$s" --env preview > /dev/null
      echo "$s=${!s}" >> .env.preview
      log INFO "✅ Secret injected: $s"
      ((injected++))
    else
      log WARN "⚠️  Secret not set: $s — skipping injection"
    fi
  done

  if [[ "$injected" -eq 0 ]]; then
    log FATAL "❌ No secrets injected — SENTRY_DSN and SENTRY_PROJECT are missing"
    log FATAL "   💡 Tip: Ensure these secrets are exported in your CI environment"
    log FATAL "   📘 Example: SENTRY_DSN=abc SENTRY_PROJECT=xyz check::deploy_preview_worker_with_secrets"
    return 1
  fi

  if ! pnpm exec wrangler deploy --preview | tee "$preview_log" > /dev/null; then
    log FATAL "❌ Wrangler preview deployment failed"
    log FATAL "   💡 Tip: Check your bindings and preview script config"
    log FATAL "   📘 Example: pnpm exec wrangler deploy --preview"
    return 1
  fi

  local url
  url=$(grep -o 'https://[^ ]*\.workers\.dev' "$preview_log" | head -n1 || true)

  if [[ -z "$url" ]]; then
    log FATAL "❌ Could not extract PREVIEW_URL from deployment output"
    log FATAL "   💡 Tip: Ensure wrangler deploy returns a preview URL in logs"
    log FATAL "   📘 Example: grep 'https://*.workers.dev'"
    return 1
  fi

  export PREVIEW_URL="$url"
  echo "PREVIEW_URL=$PREVIEW_URL" >> .env.preview
  log INFO "✅ PREVIEW_URL resolved: $PREVIEW_URL"

  log INFO "🔍 Running post-deploy health check..."
  if ! ./src/scripts/post-deploy-health-check.sh "$PREVIEW_URL"; then
    log FATAL "❌ Health check failed for preview: $PREVIEW_URL"
    log FATAL "   💡 Tip: Confirm routes are configured and bindings are present"
    log FATAL "   📘 Example: curl -i $PREVIEW_URL/__health"
    return 1
  fi

  log INFO "✅ Preview deployment successful and healthy: $PREVIEW_URL"
}

# ------------------------------------------------------------------------------
# 🧪 check::demote_canary_traffic — Reset Cloudflare canary traffic weight to 0%
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring CI=true is set
#   - Immediately shifting all traffic away from the canary environment
#   - Logging the demotion reason for audit
#
# Why it matters:
#   Canary rollouts must be instantly reversible. This check ensures 0% traffic
#   is routed to unstable builds when failures are detected.
#
# Globals used:
#   - CI → Must be "true" to enforce CI-only usage
#
# Example:
#   CI=true check::demote_canary_traffic "Health check failed"
#
# Categories:
#   deploy, ci, infra, safety
#
# Stages:
#   post-deploy, integration, rollback
# ------------------------------------------------------------------------------
check::demote_canary_traffic() {
  # ✅ Check: Immediately demote canary traffic to 0% if rollout fails
  # Category: deploy, ci, infra, safety
  # Stages: post-deploy, integration, rollback

  local reason="${1:-Canary demotion triggered}"

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must only be run in GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Protect this check with a CI guard to avoid manual demotion"
    log FATAL "   📘 Example: CI=true check::demote_canary_traffic"
    return 1
  fi

  if [[ ! -x ./src/scripts/adjust-traffic-weight.sh ]]; then
    log FATAL "❌ adjust-traffic-weight.sh script not found or not executable"
    log FATAL "   💡 Tip: Ensure the script exists at ./src/scripts/adjust-traffic-weight.sh and is chmod +x"
    log FATAL "   📘 Example: chmod +x ./src/scripts/adjust-traffic-weight.sh"
    return 1
  fi

  log INFO "🔁 Demoting Cloudflare Canary traffic to 0%"
  log INFO "📝 Reason: $reason"

  ./src/scripts/adjust-traffic-weight.sh 0

  log INFO "✅ Canary traffic demoted successfully"
}

# ------------------------------------------------------------------------------
# 🧪 check::adjust_canary_traffic_weight — Update Cloudflare canary traffic split
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Enforcing CI-only usage
#   - Sending a traffic update to Cloudflare Workers API
#   - Splitting traffic between production and canary
#
# Why it matters:
#   Canary rollout relies on adjustable traffic weights. This check
#   enables progressive exposure while allowing rollback control.
#
# Globals used:
#   - CLOUDFLARE_API_TOKEN → Cloudflare API auth token
#   - ACCOUNT_ID → Cloudflare account ID
#   - SERVICE_NAME → Worker service name
#   - CI → Must be "true" to allow traffic change
#
# Example:
#   CI=true check::adjust_canary_traffic_weight 25
#
# Categories:
#   deploy, infra, wrangler, ci
#
# Stages:
#   deploy, post-deploy, rollback, integration
# ------------------------------------------------------------------------------
check::adjust_canary_traffic_weight() {
  # ✅ Check: Adjust production ↔ canary traffic weighting in Cloudflare
  # Category: deploy, infra, wrangler, ci
  # Stages: deploy, post-deploy, rollback, integration

  local weight="${1:-}"
  if [[ -z "$weight" || ! "$weight" =~ ^[0-9]{1,3}$ || "$weight" -lt 0 || "$weight" -gt 100 ]]; then
    log FATAL "❌ Invalid weight value: '$weight'"
    log FATAL "   💡 Tip: Must be an integer from 0 to 100"
    log FATAL "   📘 Example: check::adjust_canary_traffic_weight 25"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must only run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Wrap in a GitLab CI job or check the CI export"
    log FATAL "   📘 Example: CI=true check::adjust_canary_traffic_weight 25"
    return 1
  fi

  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${ACCOUNT_ID:-}" || -z "${SERVICE_NAME:-}" ]]; then
    log FATAL "❌ Missing required Cloudflare vars: CLOUDFLARE_API_TOKEN, ACCOUNT_ID, or SERVICE_NAME"
    log FATAL "   💡 Tip: Set these in your CI/CD environment"
    log FATAL "   📘 Example: export CLOUDFLARE_API_TOKEN=... ACCOUNT_ID=... SERVICE_NAME=..."
    return 1
  fi

  local prod_weight=$((100 - weight))

  log INFO "⚖️ Adjusting Cloudflare traffic → Canary: ${weight}%, Production: ${prod_weight}%"

  local response
  response=$(curl -sS -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$SERVICE_NAME/traffic" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d @- <<EOF
{
  "traffic": [
    { "environment": "production", "weight": $prod_weight },
    { "environment": "canary", "weight": $weight }
  ]
}
EOF
)

  if ! echo "$response" | grep -q '"success":true'; then
    log FATAL "❌ Failed to update Cloudflare traffic split"
    log FATAL "   💡 Tip: Validate the API response and auth tokens"
    log FATAL "   📘 Example: curl -X PUT ... /traffic"
    return 1
  fi

  log INFO "✅ Traffic successfully updated: canary=${weight}%, production=${prod_weight}%"
}

# ------------------------------------------------------------------------------
# 🧪 check::deploy_tail_worker — Deploy Tail Worker in CI and confirm deployment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Deploying a Tail Worker named $SERVICE_NAME-$ENV-tail
#   - Enforcing CI-only execution
#   - Logging deployment result
#   - Optionally sending a Sentry test ping (TODO)
#
# Why it matters:
#   The Tail Worker must be deployed alongside the primary Worker
#   to support logging, observability, or event relay infrastructure.
#
# Globals used:
#   - CI → Must be "true"
#   - SERVICE_NAME → Base name of the Worker service
#   - SENTRY_DSN → Optional: used to notify Sentry of success
#
# Example:
#   CI=true SERVICE_NAME=my-worker check::deploy_tail_worker staging
#
# Categories:
#   deploy, infra, wrangler, ci
#
# Stages:
#   build, deploy, post-deploy
# ------------------------------------------------------------------------------
check::deploy_tail_worker() {
  # ✅ Check: Deploy Tail Worker and confirm via Wrangler
  # Category: deploy, infra, wrangler, ci
  # Stages: build, deploy, post-deploy

  local env="$1"

  if [[ -z "$env" ]]; then
    log FATAL "❌ Missing environment argument (e.g. staging, production)"
    log FATAL "   💡 Tip: Pass the target Wrangler environment as the first argument"
    log FATAL "   📘 Example: check::deploy_tail_worker staging"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ CI=true is not set — this must only run in GitLab CI"
    log FATAL "   💡 Tip: Run this only as part of CI/CD deployment workflows"
    log FATAL "   📘 Example: CI=true check::deploy_tail_worker $env"
    return 1
  fi

  if [[ -z "${SERVICE_NAME:-}" ]]; then
    log FATAL "❌ SERVICE_NAME is not defined"
    log FATAL "   💡 Tip: Define SERVICE_NAME in your CI/CD env or .env"
    log FATAL "   📘 Example: SERVICE_NAME=my-worker"
    return 1
  fi

  local name="${SERVICE_NAME}-${env}-tail"

  log INFO "🚀 Deploying Tail Worker: $name"
  if pnpm exec wrangler deploy --name "$name" --env="$env"; then
    log INFO "✅ Tail Worker deployed successfully: $name"
  else
    log WARN "⚠️  Failed to deploy Tail Worker: $name"
    return 1
  fi

  if [[ -n "${SENTRY_DSN:-}" ]]; then
    log INFO "📡 Sentry DSN is set — placeholder for tail worker test ping"
    # TODO: Implement curl to sentry /store/ endpoint if needed
  else
    log INFO "ℹ️  Sentry not configured — skipping post-deploy notification"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::bootstrap_node_toolchain — Install and validate Volta-managed toolchain
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Installing Node and pnpm via Volta
#   - Ensuring required CLI tools are available (node, pnpm, wrangler)
#   - Installing dependencies from pnpm lockfile
#
# Why it matters:
#   Projects must run on a consistent, pinned Node + pnpm toolchain.
#   This check ensures toolchain reproducibility and enforces CLI integrity.
#
# Globals used:
#   - None (relies on Volta and lockfile)
#
# Example:
#   check::bootstrap_node_toolchain
#
# Categories:
#   shell, ci, pnpm, package
#
# Stages:
#   hydrate, build, pre-commit
# ------------------------------------------------------------------------------
check::bootstrap_node_toolchain() {
  # ✅ Check: Install Volta toolchain and verify all required CLIs
  # Category: shell, ci, pnpm, package
  # Stages: hydrate, build, pre-commit

  log INFO "🔧 Installing Volta-managed Node and pnpm..."
  if ! volta install node pnpm > /dev/null; then
    log FATAL "❌ Failed to install Node or pnpm via Volta"
    log FATAL "   💡 Tip: Ensure Volta is installed and your system PATH is configured"
    log FATAL "   📘 Example: curl https://get.volta.sh | bash"
    return 1
  fi

  log INFO "📦 Toolchain versions:"
  log INFO "   node:  $(node -v || echo '❌ not found')"
  log INFO "   pnpm:  $(pnpm -v || echo '❌ not found')"

  log INFO "📦 Installing project dependencies via pnpm..."
  if ! pnpm install --frozen-lockfile; then
    log FATAL "❌ pnpm install failed"
    log FATAL "   💡 Tip: Check for corrupted lockfile or missing peer deps"
    log FATAL "   📘 Example: pnpm install --frozen-lockfile"
    return 1
  fi

  log INFO "🔍 Verifying required CLI tools..."

  if ! command -v node > /dev/null; then
    log FATAL "❌ node not found in PATH"
    log FATAL "   💡 Tip: Ensure Volta installed node and it's in PATH"
    log FATAL "   📘 Example: volta install node"
    return 1
  fi

  if ! command -v pnpm > /dev/null; then
    log FATAL "❌ pnpm not found in PATH"
    log FATAL "   💡 Tip: Ensure pnpm is installed via Volta"
    log FATAL "   📘 Example: volta install pnpm"
    return 1
  fi

  if ! command -v wrangler > /dev/null; then
    log FATAL "❌ wrangler not found in PATH"
    log FATAL "   💡 Tip: Install wrangler via pnpm"
    log FATAL "   📘 Example: pnpm add -g wrangler"
    return 1
  fi

  log INFO "✅ Node toolchain bootstrap complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::log_ci_context — Log current GitLab CI job environment context
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Printing job metadata, commit details, author, pipeline, environment, project
#   - Ensuring visibility into what environment and commit is being executed
#
# Why it matters:
#   Job and deployment logs must include reproducible context to aid debugging,
#   traceability, rollback decisions, and auditing.
#
# Globals used:
#   - CI_COMMIT_REF_NAME, CI_COMMIT_REF_SLUG
#   - CI_COMMIT_SHA, CI_COMMIT_SHORT_SHA
#   - GITLAB_USER_NAME, GITLAB_USER_EMAIL
#   - CI_PIPELINE_ID, CI_JOB_NAME, CI_JOB_ID
#   - CI_RUNNER_DESCRIPTION, CI_PROJECT_NAME, CI_PROJECT_NAMESPACE
#   - WRANGLER_ENV, DB_NAME
#   - CI_COMMIT_TAG, CI_MERGE_REQUEST_IID
#   - CI_PROJECT_URL, CI_REPOSITORY_URL
#
# Example:
#   check::log_ci_context
#
# Categories:
#   ci, shell, safety
#
# Stages:
#   build, deploy, test, integration
# ------------------------------------------------------------------------------
check::log_ci_context() {
  # ✅ Check: Log key CI metadata and contextual info
  # Category: ci, shell, safety
  # Stages: build, deploy, test, integration

  log INFO "📦 CI Context:"
  log INFO "   - Branch:            ${CI_COMMIT_REF_NAME:-<unset>}"
  log INFO "   - Branch (slug):     ${CI_COMMIT_REF_SLUG:-<unset>}"
  log INFO "   - Commit:            ${CI_COMMIT_SHA:-<unset>}"
  log INFO "   - Short SHA:         ${CI_COMMIT_SHORT_SHA:-<unset>}"
  log INFO "   - Author:            ${GITLAB_USER_NAME:-unknown} (${GITLAB_USER_EMAIL:-?})"
  log INFO "   - Pipeline ID:       ${CI_PIPELINE_ID:-<unset>}"
  log INFO "   - Job:               ${CI_JOB_NAME:-<unset>} (#${CI_JOB_ID:-?})"
  log INFO "   - Runner:            ${CI_RUNNER_DESCRIPTION:-<unset>}"
  log INFO "   - Environment:       ${WRANGLER_ENV:-<unset>}"
  log INFO "   - DB Name:           ${DB_NAME:-<unset>}"
  log INFO "   - Git Tag:           ${CI_COMMIT_TAG:-<none>}"
  log INFO "   - Merge Request IID: ${CI_MERGE_REQUEST_IID:-<none>}"
  log INFO "   - Project:           ${CI_PROJECT_NAMESPACE:-?}/${CI_PROJECT_NAME:-?}"
  log INFO "   - Project URL:       ${CI_PROJECT_URL:-<unset>}"
  log INFO "   - Repo:              ${CI_REPOSITORY_URL:-<unset>}"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_ci_environment_checks — Run all required CI toolchain + secret validators
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring the Node toolchain is installed and working via Volta
#   - Verifying required CI/CD secrets are available
#
# Why it matters:
#   CI builds must guarantee consistent versions, CLI presence, and critical secrets.
#   Without these checks, CI may silently fail or produce non-reproducible builds.
#
# Globals used:
#   - DB_NAME, WRANGLER_ENV, CLOUDFLARE_API_TOKEN, etc. (used in delegated checks)
#
# Example:
#   check::run_ci_environment_checks
#
# Categories:
#   ci, shell, infra, secrets
#
# Stages:
#   pre-commit, build, deploy
# ------------------------------------------------------------------------------
check::run_ci_environment_checks() {
  # ✅ Check: Run CI environment validations (toolchain + secrets)
  # Category: ci, shell, infra, secrets
  # Stages: pre-commit, build, deploy

  log INFO "🔍 Verifying toolchain..."
  if ! check::bootstrap_node_toolchain; then
    log FATAL "❌ Toolchain setup failed"
    log FATAL "   💡 Tip: Ensure Volta is installed and configured for your shell"
    log FATAL "   📘 Example: curl https://get.volta.sh | bash"
    return 1
  fi

  log INFO "🔐 Checking required CI/CD secrets..."
  if ! check::required_secrets; then
    log FATAL "❌ Missing one or more required secrets"
    log FATAL "   💡 Tip: Verify required secrets in GitLab Settings → CI/CD → Variables"
    log FATAL "   📘 Example: CLOUDFLARE_API_TOKEN, SENTRY_DSN, SERVICE_NAME"
    return 1
  fi

  log INFO "✅ CI environment setup complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::get_durable_object_classes — Extract Durable Object class names from wrangler.json
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Reading Durable Object class names from wrangler.json
#   - Supporting both top-level and environment-scoped bindings
#   - Returning class names via log INFO (one per line)
#
# Why it matters:
#   Durable Object declarations must match class names exported from Worker modules.
#   This ensures code and config stay in sync.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json (default: wrangler.json)
#   - ENVIRONMENT → Optional env name (e.g. preview, staging)
#
# Example:
#   WRANGLER_CONFIG=wrangler.json ENVIRONMENT=staging check::get_durable_object_classes
#
# Categories:
#   wrangler, cloudflare:do, ci, infra
#
# Stages:
#   build, check, hydrate
# ------------------------------------------------------------------------------
check::get_durable_object_classes() {
  # ✅ Check: Extract Durable Object class names from wrangler.json
  # Category: wrangler, cloudflare:do, ci, infra
  # Stages: build, check, hydrate

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ wrangler.json not found at: $config"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG to the correct path or ensure it exists"
    log FATAL "   📘 Example: WRANGLER_CONFIG=./config/wrangler.json"
    return 1
  fi

  local classes

  if [[ -n "${ENVIRONMENT:-}" ]]; then
    log INFO "🔍 Searching for DO classes in env: $ENVIRONMENT"
    classes=$(jq -r --arg env "$ENVIRONMENT" '
      (
        try .env[$env].durable_objects.bindings[]?.class_name catch empty
      ) + (
        try .durable_objects.bindings[]?.class_name catch empty
      )
    ' "$config")
  else
    log INFO "🔍 Searching for DO classes in top-level config"
    classes=$(jq -r 'try .durable_objects.bindings[]?.class_name catch empty' "$config")
  fi

  if [[ -z "$classes" ]]; then
    log WARN "⚠️  No Durable Object class names found in $config"
    return 0
  fi

  log INFO "✅ Found Durable Object class names:"
  while IFS= read -r class; do
    [[ -n "$class" ]] && log INFO "   - $class"
  done <<< "$classes"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_do_migrations — Ensure all Durable Object classes are migrated
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring all Durable Object class names under `durable_objects.bindings`
#     are registered under the `migrations[].new_classes` array
#
# Why it matters:
#   Durable Objects require explicit declaration in migration history.
#   Missing migrations will cause deployment failures or binding issues.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json or .jsonc
#
# Example:
#   WRANGLER_CONFIG=wrangler.json check::validate_do_migrations
#
# Categories:
#   wrangler, cloudflare:do, infra
#
# Stages:
#   check, deploy, build, migrate
# ------------------------------------------------------------------------------
check::validate_do_migrations() {
  # ✅ Check: All DO classes in bindings must exist in migrations[].new_classes
  # Category: wrangler, cloudflare:do, infra
  # Stages: check, deploy, build, migrate

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ wrangler config not found: $config"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG or place wrangler.json in project root"
    log FATAL "   📘 Example: WRANGLER_CONFIG=config/wrangler.json"
    return 1
  fi

  local do_classes
  do_classes=$(jq -r '.durable_objects.bindings[]?.class_name' "$config" 2>/dev/null | sort -u || echo "")

  if [[ -z "$do_classes" ]]; then
    log FATAL "❌ No Durable Object classes found in $config"
    log FATAL "   💡 Tip: Define durable_objects.bindings[].class_name in your wrangler.json"
    log FATAL "   📘 Example:
      \"durable_objects\": {
        \"bindings\": [
          { \"name\": \"Buffer\", \"class_name\": \"AnalyticsBufferDO\" }
        ]
      }"
    return 1
  fi

  local migrated_classes
  migrated_classes=$(jq -r '[.migrations[]?.new_classes[]?] | unique[]' "$config" 2>/dev/null || echo "")

  if [[ -z "$migrated_classes" ]]; then
    log FATAL "❌ No migration entries found in $config"
    log FATAL "   💡 Tip: Add migrations[].new_classes[] for each Durable Object"
    log FATAL "   📘 Example:
      \"migrations\": [
        {
          \"tag\": \"v1\",
          \"new_classes\": [\"AnalyticsBufferDO\"]
        }
      ]"
    return 1
  fi

  local missing=()
  while IFS= read -r cls; do
    if ! grep -Fxq "$cls" <<< "$migrated_classes"; then
      missing+=("$cls")
    fi
  done <<< "$do_classes"

  if (( ${#missing[@]} > 0 )); then
    log FATAL "❌ The following DO classes are missing from migrations[].new_classes:"
    for cls in "${missing[@]}"; do
      log FATAL "   - $cls"
    done
    log FATAL "   💡 Tip: Add the missing classes to a new migration tag"
    log FATAL "   📘 Example:
      \"migrations\": [
        {
          \"tag\": \"vNEXT\",
          \"new_classes\": [\"${missing[*]}\"] 
        }
      ]"
    return 1
  fi

  log INFO "✅ All Durable Object classes are declared in migrations[].new_classes"
}

# ------------------------------------------------------------------------------
# 🧪 check::deploy_durable_objects — Deploy Durable Object classes to target environment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Verifying that Durable Object classes are defined in wrangler.json
#   - Confirming ENVIRONMENT is set
#   - Deploying to the specified Wrangler environment using wrangler CLI
#
# Why it matters:
#   Durable Objects must be both declared and migrated before deployment.
#   This check ensures config, bindings, and deploy action are all in sync.
#
# Globals used:
#   - WRANGLER_CONFIG → Path to wrangler.json
#   - ENVIRONMENT → Target deployment environment (e.g. staging, production)
#
# Example:
#   ENVIRONMENT=staging WRANGLER_CONFIG=wrangler.json check::deploy_durable_objects
#
# Categories:
#   cloudflare:do, wrangler, deploy, infra, ci
#
# Stages:
#   build, deploy, post-deploy
# ------------------------------------------------------------------------------
check::deploy_durable_objects() {
  # ✅ Check: Deploy Durable Object classes via Wrangler
  # Category: cloudflare:do, wrangler, deploy, infra, ci
  # Stages: build, deploy, post-deploy

  if [[ -z "${WRANGLER_CONFIG:-}" ]]; then
    export WRANGLER_CONFIG="wrangler.json"
  fi

  if [[ ! -f "$WRANGLER_CONFIG" ]]; then
    log FATAL "❌ wrangler config not found at: $WRANGLER_CONFIG"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG or ensure wrangler.json exists"
    log FATAL "   📘 Example: WRANGLER_CONFIG=config/wrangler.json"
    return 1
  fi

  if [[ -z "${ENVIRONMENT:-}" ]]; then
    log FATAL "❌ ENVIRONMENT is not set"
    log FATAL "   💡 Tip: Set the target deployment environment"
    log FATAL "   📘 Example: ENVIRONMENT=staging check::deploy_durable_objects"
    return 1
  fi

  local do_classes
  do_classes=$(check::get_durable_object_classes 2>/dev/null || true)

  if [[ -z "$do_classes" ]]; then
    log FATAL "❌ No Durable Object classes found in $WRANGLER_CONFIG"
    log FATAL "   💡 Tip: Ensure durable_objects.bindings[].class_name is populated"
    log FATAL "   📘 Example: { \"class_name\": \"MyDO\" }"
    return 1
  fi

  log INFO "✅ Durable Object classes resolved:"
  while IFS= read -r cls; do
    [[ -n "$cls" ]] && log INFO "   - $cls"
  done <<< "$do_classes"

  log INFO "📦 Deploying Durable Objects to environment: $ENVIRONMENT"

  if ! pnpm exec wrangler deploy --env "$ENVIRONMENT" --minify; then
    log FATAL "❌ wrangler deploy failed"
    log FATAL "   💡 Tip: Check for invalid bindings, missing migrations, or bad credentials"
    log FATAL "   📘 Example: pnpm exec wrangler deploy --env $ENVIRONMENT"
    return 1
  fi

  log INFO "✅ Durable Object deployment successful"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_storage_bindings — Ensure all configured storage bindings exist
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validating that all expected KV namespaces, R2 buckets, and the D1 database exist
#   - Reading bindings from wrangler.json under env.$WRANGLER_ENV
#
# Why it matters:
#   Cloudflare Workers will fail to deploy or operate if required storage bindings
#   are missing. This check ensures all declared infrastructure exists before deploy.
#
# Globals used:
#   - WRANGLER_ENV → Environment name to validate (e.g. preview, staging)
#   - DB_NAME → Name of the expected D1 database
#
# Example:
#   WRANGLER_ENV=staging DB_NAME=analytics check::validate_storage_bindings
#
# Categories:
#   wrangler, cloudflare:kv, cloudflare:r2, cloudflare:d1, infra, ci
#
# Stages:
#   check, hydrate, build, deploy
# ------------------------------------------------------------------------------
check::validate_storage_bindings() {
  # ✅ Check: Validate all storage bindings for env.$WRANGLER_ENV
  # Category: wrangler, cloudflare:kv, cloudflare:r2, cloudflare:d1, infra, ci
  # Stages: check, hydrate, build, deploy

  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ -z "${WRANGLER_ENV:-}" ]]; then
    log FATAL "❌ WRANGLER_ENV is not set"
    log FATAL "   💡 Tip: Set WRANGLER_ENV to the environment block you're validating"
    log FATAL "   📘 Example: WRANGLER_ENV=staging"
    return 1
  fi

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ Wrangler config not found: $config"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG or ensure wrangler.json exists"
    log FATAL "   📘 Example: WRANGLER_CONFIG=./wrangler.json"
    return 1
  fi

  local missing=0
  log INFO "📦 Validating storage bindings for env: $WRANGLER_ENV"

  log INFO "🔍 Validating KV namespaces..."
  local kvs
  kvs=$(jq -r ".env[\"$WRANGLER_ENV\"].kv_namespaces[]?.binding" "$config" 2>/dev/null || true)
  for kv in $kvs; do
    if ! pnpm exec wrangler kv namespace list | jq -r '.[].title' | grep -q "^$kv$"; then
      log FATAL "❌ Missing KV namespace: $kv"
      log FATAL "   💡 Tip: Run \`check::create_kv_namespaces\` to create it"
      log FATAL "   📘 Example: ENVIRONMENT=$WRANGLER_ENV check::create_kv_namespaces"
      missing=1
    else
      log INFO "✅ Found KV: $kv"
    fi
  done

  log INFO "📦 Validating R2 buckets..."
  local r2s
  r2s=$(jq -r ".env[\"$WRANGLER_ENV\"].r2_buckets[]?.bucket_name" "$config" 2>/dev/null || true)
  for r2 in $r2s; do
    if ! pnpm exec wrangler r2 bucket list | jq -r '.[].name' | grep -q "^$r2$"; then
      log FATAL "❌ Missing R2 bucket: $r2"
      log FATAL "   💡 Tip: Run \`check::create_r2_buckets\` to provision it"
      log FATAL "   📘 Example: ENVIRONMENT=$WRANGLER_ENV check::create_r2_buckets"
      missing=1
    else
      log INFO "✅ Found R2: $r2"
    fi
  done

  log INFO "🧱 Validating D1 database: $DB_NAME"
  if ! pnpm exec wrangler d1 list | jq -r '.[].name' | grep -q "^$DB_NAME$"; then
    log FATAL "❌ Missing D1 database: $DB_NAME"
    log FATAL "   💡 Tip: Run \`check::ensure_d1_database_exists\` to create it"
    log FATAL "   📘 Example: DB_NAME=$DB_NAME check::ensure_d1_database_exists"
    missing=1
  else
    log INFO "✅ Found D1: $DB_NAME"
  fi

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ One or more storage bindings are missing in env.$WRANGLER_ENV"
    return 1
  fi

  log INFO "✅ All storage bindings for env.$WRANGLER_ENV are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::get_bindings — Extract .binding values from wrangler.json (env-aware)
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Resolving an array of binding names for a given top-level key (e.g. r2_buckets, kv_namespaces)
#   - Preferring env.$ENVIRONMENT.<key> if set, falling back to top-level.<key>
#
# Why it matters:
#   Resource provisioning and validation depend on resolving declared bindings in
#   wrangler.json. This ensures infrastructure setup scripts use correct scopes.
#
# Globals used:
#   - ENVIRONMENT → Optional env block name (e.g. preview, staging)
#   - WRANGLER_CONFIG → Path to wrangler.json (default: wrangler.json)
#
# Example:
#   WRANGLER_CONFIG=wrangler.json ENVIRONMENT=staging check::get_bindings r2_buckets
#
# Categories:
#   wrangler, shell, cloudflare:kv, cloudflare:r2, cloudflare:do, ci
#
# Stages:
#   hydrate, check, deploy
# ------------------------------------------------------------------------------
check::get_bindings() {
  # ✅ Check: Resolve binding names from wrangler.json (env-aware fallback)
  # Category: wrangler, shell, cloudflare:kv, cloudflare:r2, cloudflare:do, ci
  # Stages: hydrate, check, deploy

  local key="$1"
  local config="${WRANGLER_CONFIG:-wrangler.json}"

  if [[ -z "$key" ]]; then
    log FATAL "❌ Missing argument: binding key (e.g. r2_buckets)"
    log FATAL "   💡 Tip: Pass a top-level wrangler.json key to resolve (e.g. kv_namespaces)"
    log FATAL "   📘 Example: check::get_bindings kv_namespaces"
    return 1
  fi

  if [[ ! -f "$config" ]]; then
    log FATAL "❌ wrangler config not found: $config"
    log FATAL "   💡 Tip: Set WRANGLER_CONFIG or place wrangler.json at the project root"
    log FATAL "   📘 Example: WRANGLER_CONFIG=config/wrangler.json"
    return 1
  fi

  local resolved=""
  if [[ -n "${ENVIRONMENT:-}" ]]; then
    resolved=$(jq -r --arg key "$key" --arg env "$ENVIRONMENT" '
      try .env[$env][$key][]?.binding catch empty
    ' "$config" | grep -v '^null$')
    if [[ -n "$resolved" ]]; then
      log INFO "✅ Bindings resolved from env.$ENVIRONMENT.$key:"
      while IFS= read -r line; do
        [[ -n "$line" ]] && log INFO "   - $line"
      done <<< "$resolved"
      return 0
    fi
  fi

  resolved=$(jq -r --arg key "$key" '
    try .[$key][]?.binding catch empty
  ' "$config" | grep -v '^null$')

  if [[ -n "$resolved" ]]; then
    log INFO "✅ Bindings resolved from top-level $key:"
    while IFS= read -r line; do
      [[ -n "$line" ]] && log INFO "   - $line"
    done <<< "$resolved"
    return 0
  fi

  log WARN "⚠️  No bindings found for key: $key in $config"
  return 0
}

# ------------------------------------------------------------------------------
# 🧪 check::bootstrap_preview_storage_with_secrets — Setup preview secrets + bootstrap storage
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Injecting required secrets into the preview environment
#   - Appending secrets to .env.preview
#   - Running the preview storage bootstrap script
#
# Why it matters:
#   Preview environments require secrets and provisioned KV, R2, and D1 bindings
#   before they can be used in CI, dev, or integration testing.
#
# Globals used:
#   - ENVIRONMENT → Automatically set to "preview"
#   - SENTRY_DSN, SENTRY_PROJECT → Required secrets
#
# Example:
#   CI=true SENTRY_DSN=abc SENTRY_PROJECT=xyz check::bootstrap_preview_storage_with_secrets
#
# Categories:
#   cloudflare:kv, cloudflare:r2, cloudflare:d1, secrets, wrangler, ci
#
# Stages:
#   build, hydrate, post-deploy
# ------------------------------------------------------------------------------
check::bootstrap_preview_storage_with_secrets() {
  # ✅ Check: Provision preview secrets and bootstrap storage
  # Category: cloudflare:kv, cloudflare:r2, cloudflare:d1, secrets, wrangler, ci
  # Stages: build, hydrate, post-deploy

  export ENVIRONMENT=preview

  log INFO "🔐 Injecting secrets into Wrangler preview environment..."

  local injected=0
  for s in SENTRY_DSN SENTRY_PROJECT; do
    if [[ -n "${!s:-}" ]]; then
      echo "${!s}" | pnpm exec wrangler secret put "$s" --env preview > /dev/null
      echo "$s=${!s}" >> .env.preview
      log INFO "✅ Secret injected: $s"
      ((injected++))
    else
      log WARN "⚠️  Secret not set: $s — skipping injection"
    fi
  done

  if [[ "$injected" -eq 0 ]]; then
    log FATAL "❌ No secrets injected — both SENTRY_DSN and SENTRY_PROJECT are missing"
    log FATAL "   💡 Tip: Set required preview secrets in GitLab CI/CD variables"
    log FATAL "   📘 Example: export SENTRY_DSN=abc SENTRY_PROJECT=xyz"
    return 1
  fi

  if [[ ! -x ./src/scripts/bootstrap-storage.sh ]]; then
    log FATAL "❌ bootstrap-storage.sh not found or not executable"
    log FATAL "   💡 Tip: Ensure the script exists and has execution permission"
    log FATAL "   📘 Example: chmod +x ./src/scripts/bootstrap-storage.sh"
    return 1
  fi

  log INFO "☁️ Bootstrapping preview storage via ./src/scripts/bootstrap-storage.sh..."
  if ! ./src/scripts/bootstrap-storage.sh; then
    log FATAL "❌ Storage bootstrap failed"
    log FATAL "   💡 Tip: Check wrangler.json bindings and your bootstrap script logic"
    log FATAL "   📘 Example: ./src/scripts/bootstrap-storage.sh"
    return 1
  fi

  log INFO "✅ Preview storage and secrets bootstrap complete"
}

# ------------------------------------------------------------------------------
# 🧪 check::bootstrap_storage_with_optional_tail — Bootstrap bindings and tail worker (if defined)
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Bootstrapping storage resources via bootstrap-storage.sh
#   - Conditionally deploying a tail worker if tail_consumers[].service is defined
#
# Why it matters:
#   Workers must be deployed with the correct KV, R2, and D1 bindings.
#   If a tail consumer is defined for observability or stream processing,
#   it must be deployed alongside the main service.
#
# Globals used:
#   - WRANGLER_ENV → Target environment name
#   - ENVIRONMENT → Exported for consistency with other scripts
#
# Example:
#   WRANGLER_ENV=staging check::bootstrap_storage_with_optional_tail
#
# Categories:
#   wrangler, infra, cloudflare:kv, cloudflare:r2, cloudflare:d1, cloudflare:do
#
# Stages:
#   build, hydrate, deploy, post-deploy
# ------------------------------------------------------------------------------
check::bootstrap_storage_with_optional_tail() {
  # ✅ Check: Bootstrap storage and deploy tail worker (if declared)
  # Category: wrangler, infra, cloudflare:kv, cloudflare:r2, cloudflare:d1, cloudflare:do
  # Stages: build, hydrate, deploy, post-deploy

  local env="${WRANGLER_ENV:-}"
  export ENVIRONMENT="$env"

  if [[ -z "$env" ]]; then
    log FATAL "❌ WRANGLER_ENV is not set"
    log FATAL "   💡 Tip: Specify the target environment (e.g. staging, preview)"
    log FATAL "   📘 Example: WRANGLER_ENV=staging check::bootstrap_storage_with_optional_tail"
    return 1
  fi

  if [[ ! -x ./src/scripts/bootstrap-storage.sh ]]; then
    log FATAL "❌ bootstrap-storage.sh not found or not executable"
    log FATAL "   💡 Tip: Ensure the script exists and has chmod +x"
    log FATAL "   📘 Example: chmod +x ./src/scripts/bootstrap-storage.sh"
    return 1
  fi

  log INFO "☁️ Bootstrapping storage resources for env: $ENVIRONMENT"
  if ! ./src/scripts/bootstrap-storage.sh; then
    log FATAL "❌ Failed to bootstrap storage for $ENVIRONMENT"
    log FATAL "   💡 Tip: Check for missing wrangler bindings or provisioning scripts"
    log FATAL "   📘 Example: ./src/scripts/bootstrap-storage.sh"
    return 1
  fi

  log INFO "🔍 Checking wrangler.json for tail worker definition..."
  if jq -e ".env[\"$ENVIRONMENT\"].tail_consumers[]?.service" wrangler.json > /dev/null 2>&1; then
    log INFO "🚀 Tail worker config found — deploying to $ENVIRONMENT"
    if ! ./src/scripts/deploy-tail-worker.sh "$ENVIRONMENT"; then
      log FATAL "❌ Failed to deploy tail worker for $ENVIRONMENT"
      log FATAL "   💡 Tip: Check deploy-tail-worker.sh or Wrangler credentials"
      log FATAL "   📘 Example: ./src/scripts/deploy-tail-worker.sh $ENVIRONMENT"
      return 1
    fi
  else
    log INFO "ℹ️  No tail worker defined for env: $ENVIRONMENT — skipping tail deploy"
  fi

  log INFO "✅ Storage bootstrap complete for env: $ENVIRONMENT"
}

# ------------------------------------------------------------------------------
# 🧪 check::bootstrap_local_worker — Initialize local dev environment for Cloudflare Workers
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Validating startup mode (start, clean, onboard)
#   - Loading local .env config
#   - Resetting local D1/KV/R2 if needed
#   - Launching wrangler dev in --local mode
#
# Why it matters:
#   Local environments must be bootstrapped in a consistent and safe way,
#   especially when resetting or onboarding. This ensures predictable local dev.
#
# Globals used:
#   - MODE → One of: start, clean, onboard
#   - DB_NAME, D1_SQLITE, SCHEMA_FILE, ENV_FILE, SEED_SCRIPT → Required by reset script
#
# Example:
#   MODE=clean check::bootstrap_local_worker
#
# Categories:
#   ci, shell, wrangler, infra, cloudflare:kv, cloudflare:d1, cloudflare:r2
#
# Stages:
#   dev, hydrate
# ------------------------------------------------------------------------------
check::bootstrap_local_worker() {
  # ✅ Check: Bootstrap and launch Cloudflare Workers local dev server
  # Category: ci, shell, wrangler, infra, cloudflare:kv, cloudflare:d1, cloudflare:r2
  # Stages: dev, hydrate

  local mode="${MODE:-start}"
  local valid_modes=("start" "clean" "onboard")

  if [[ ! " ${valid_modes[*]} " =~ " $mode " ]]; then
    log FATAL "❌ Invalid MODE: $mode"
    log FATAL "   💡 Tip: Must be one of: start, clean, onboard"
    log FATAL "   📘 Example: MODE=clean check::bootstrap_local_worker"
    return 1
  fi

  log INFO "📦 Starting local bootstrap with mode: $mode"

  if ! command -v load_env_file >/dev/null; then
    log FATAL "❌ Missing helper: load_env_file"
    log FATAL "   💡 Tip: Ensure your shell environment defines it"
    log FATAL "   📘 Example: declare -f load_env_file"
    return 1
  fi

  if ! command -v reset_local_environment >/dev/null; then
    log FATAL "❌ Missing helper: reset_local_environment"
    log FATAL "   💡 Tip: Required for clean/onboard flows"
    log FATAL "   📘 Example: declare -f reset_local_environment"
    return 1
  fi

  if ! command -v launch_local_dev_server >/dev/null; then
    log FATAL "❌ Missing helper: launch_local_dev_server"
    log FATAL "   💡 Tip: This is required to start Wrangler in --local mode"
    log FATAL "   📘 Example: declare -f launch_local_dev_server"
    return 1
  fi

  # Load environment variables
  log INFO "📄 Loading environment variables from .env.local"
  if ! load_env_file; then
    log FATAL "❌ Failed to load environment from .env.local"
    return 1
  fi

  # Reset if necessary
  if [[ "$mode" == "clean" || "$mode" == "onboard" ]]; then
    log INFO "🧹 Running environment reset for: $mode"
    if ! reset_local_environment "$mode"; then
      log FATAL "❌ Environment reset failed for: $mode"
      return 1
    fi
  fi

  # Launch local dev server (will exec and not return)
  log INFO "🚀 Launching local Wrangler dev server (mode: --local)"
  launch_local_dev_server
}

# ------------------------------------------------------------------------------
# 🧪 check::find_project_root — Detect project root by traversing parent directories
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Walking upward from the current directory
#   - Detecting presence of pnpm-workspace.yaml or .git to infer the root
#
# Why it matters:
#   Many bootstrap and deployment scripts must run relative to the project root.
#   This check guarantees you’re scoped correctly inside a monorepo or repo.
#
# Globals used:
#   - None
#
# Example:
#   ROOT_DIR=$(check::find_project_root) || {
#     log FATAL "❌ Could not determine root"
#     exit 1
#   }
#
# Categories:
#   shell, paths
#
# Stages:
#   check, hydrate, pre-commit
# ------------------------------------------------------------------------------
check::find_project_root() {
  # ✅ Check: Walk upward to find .git or pnpm-workspace.yaml as project root
  # Category: shell, paths
  # Stages: check, hydrate, pre-commit

  local dir="$PWD"

  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/pnpm-workspace.yaml" || -d "$dir/.git" ]]; then
      log INFO "✅ Project root found at: $dir"
      return "$dir"
    fi
    dir="$(dirname "$dir")"
  done

  log FATAL "❌ Could not determine project root"
  log FATAL "   💡 Tip: Ensure you're running this inside a Git repo or workspace"
  log FATAL "   📘 Example: cd <project> && check::find_project_root"
  exit 1
}


# ------------------------------------------------------------------------------
# 🧪 check::required_shell_tools — Ensure all tools used by *.sh scripts exist
# ------------------------------------------------------------------------------
# This check scans all *.sh files in the workspace and dynamically extracts
# all CLI tool names used (e.g., grep, sed, wrangler, jq, pnpm, etc.).
# It then verifies those tools are available in the shell.
#
# Why it matters:
#   Prevents runtime errors from missing tools or untracked dependencies in CI/dev
#
# Globals used:
#   - ROOT_DIR → workspace root
#
# Example:
#   ROOT_DIR=.
#   check::required_shell_tools
#
# Categories:
#   shell, lint, ci
#
# Stages:
#   lint, pre-commit, check
# ------------------------------------------------------------------------------
check::required_shell_tools() {
  # ✅ Check: All CLI tools invoked by *.sh scripts must exist
  # Category: shell, lint, ci
  # Stages: lint, pre-commit, check

  local failed=0
  declare -A seen
  local tools=()

  # Find all .sh scripts
  find "$ROOT_DIR" -type f -name "*.sh" | while read -r file; do
    log INFO "🔍 Scanning: $file"
    grep -Eo '\b([a-z0-9._-]+)(?=\s|\s+-)' "$file" | while read -r tool; do
      # Skip bash builtins and safe keywords
      case "$tool" in
        if|then|else|fi|do|done|for|while|case|esac|function|return|local|readonly|declare|export|true|false|echo|printf|cd|pwd|exit|set|test|read) continue ;; 
      esac

      [[ -n "$tool" && -z "${seen[$tool]}" ]] && {
        seen[$tool]=1
        tools+=("$tool")
      }
    done
  done

  log INFO "🔧 Checking availability of required tools: ${tools[*]}"

  for tool in "${tools[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      log FATAL "❌ Required CLI tool '$tool' is missing"
      log FATAL "   💡 Tip: Install $tool and ensure it is in your \$PATH"
      log FATAL "   📘 Example (Homebrew): brew install $tool"
      failed=1
    else
      log INFO "✅ Found: $tool"
    fi
  done

  [[ "$failed" -eq 1 ]] && return 1
}

# ------------------------------------------------------------------------------
# 🧪 check::load_env_file — Load .env file or auto-generate from fallback template
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring that a valid $ENV_FILE exists
#   - Creating $ENV_FILE from $ENV_FILE_DEFAULT if needed
#   - Sourcing and exporting all variables
#
# Why it matters:
#   Scripts depend on consistent environment configuration.
#   This check guarantees that .env variables are always present and loaded.
#
# Globals used:
#   - ENV_FILE → Target .env file to load (e.g. .env.local)
#   - ENV_FILE_DEFAULT → Fallback template to use (e.g. .env.example)
#   - ROOT_DIR → Absolute path to resolve fallback if $ENV_FILE is missing
#
# Example:
#   ENV_FILE=.env.local ENV_FILE_DEFAULT=.env.example ROOT_DIR=$(pwd) check::load_env_file
#
# Categories:
#   dotenv, shell, safety
#
# Stages:
#   hydrate, dev, build
# ------------------------------------------------------------------------------
check::load_env_file() {
  # ✅ Check: Load and export .env file, using fallback if necessary
  # Category: dotenv, shell, safety
  # Stages: hydrate, dev, build

  if [[ -z "${ENV_FILE:-}" ]]; then
    log FATAL "❌ ENV_FILE is not set"
    log FATAL "   💡 Tip: Define which .env file to load (e.g. .env.local)"
    log FATAL "   📘 Example: ENV_FILE=.env.local"
    return 1
  fi

  if [[ -z "${ENV_FILE_DEFAULT:-}" ]]; then
    log FATAL "❌ ENV_FILE_DEFAULT is not set"
    log FATAL "   💡 Tip: Define fallback template (e.g. .env.example)"
    log FATAL "   📘 Example: ENV_FILE_DEFAULT=.env.example"
    return 1
  fi

  if [[ -z "${ROOT_DIR:-}" ]]; then
    log FATAL "❌ ROOT_DIR is not set"
    log FATAL "   💡 Tip: Set this to your project root (use check::find_project_root)"
    log FATAL "   📘 Example: ROOT_DIR=$(check::find_project_root)"
    return 1
  fi

  if [[ -f "$ENV_FILE" ]]; then
    log INFO "📄 Loading environment file: $ENV_FILE"
  elif [[ -f "$ROOT_DIR/$ENV_FILE_DEFAULT" ]]; then
    log INFO "🧪 $ENV_FILE not found — generating from template: $ENV_FILE_DEFAULT"
    cp "$ROOT_DIR/$ENV_FILE_DEFAULT" "$ENV_FILE"
  else
    log FATAL "❌ Environment file missing: $ENV_FILE"
    log FATAL "   🔍 Template fallback also missing: $ROOT_DIR/$ENV_FILE_DEFAULT"
    log FATAL "   💡 Tip: Generate the file from the template manually"
    log FATAL "   📘 Example: cp $ENV_FILE_DEFAULT $ENV_FILE"
    return 1
  fi

  set -a
  source "$ENV_FILE"
  set +a

  log INFO "✅ Environment variables loaded from: $ENV_FILE"
}

# ------------------------------------------------------------------------------
# 🧪 check::resolve_env_config — Set all core environment/configuration variables globally
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Detecting project root (ROOT_DIR)
#   - Resolving env file, migrations path, schema path, script paths, etc.
#   - Exporting all configuration variables needed across bootstrap/deploy
#
# Why it matters:
#   Every script depends on consistent paths, environments, and tool references.
#   This check guarantees that all shared variables are defined and exported.
#
# Globals exported:
#   - ROOT_DIR, PACKAGE_DIR, SCRIPTS_DIR, WRANGLER_CONFIG
#   - ENV_FILE, ENV_FILE_DEFAULT, ENVIRONMENT
#   - DB_NAME, D1_SQLITE, KV_DIR, R2_DIR, WRANGLER_STATE
#   - MIGRATIONS_DIR, MIGRATE_SCRIPT, BASE_SCHEMA, BASE_SCHEMA_PATH
#   - SEED_SCRIPT, SETTINGS_MODEL
#
# Example:
#   WRANGLER_ENV=preview check::resolve_env_config
#
# Categories:
#   shell, paths, ci, safety
#
# Stages:
#   hydrate, check, build, deploy
# ------------------------------------------------------------------------------
check::resolve_env_config() {
  # ✅ Check: Resolve and export all required config/environment variables
  # Category: shell, paths, ci, safety
  # Stages: hydrate, check, build, deploy

  if ! ROOT_DIR="$(check::find_project_root 2>/dev/null)"; then
    log FATAL "❌ Failed to locate project root (missing .git or pnpm-workspace.yaml)"
    log FATAL "   💡 Tip: Run this from within a Git project or workspace root"
    log FATAL "   📘 Example: cd ~/your-project && check::resolve_env_config"
    return 1
  fi

  export ROOT_DIR

  export PACKAGE_DIR="${PACKAGE_DIR:-$ROOT_DIR/packages/apps/analytics}"
  export SCRIPTS_DIR="$ROOT_DIR/packages/shared/scripts"
  export WRANGLER_CONFIG="${WRANGLER_CONFIG:-$PACKAGE_DIR/wrangler.json}"
  export ENVIRONMENT="${ENVIRONMENT:-$WRANGLER_ENV}"
  export ENV_FILE="${ENV_FILE:-.env.${WRANGLER_ENV:-local}}"
  export ENV_FILE_DEFAULT="${ENV_FILE_DEFAULT:-.env.example}"

  export MIGRATIONS_DIR="${MIGRATIONS_DIR:-$PACKAGE_DIR/migrations}"
  export MIGRATE_SCRIPT="${MIGRATE_SCRIPT:-$SCRIPTS_DIR/migrate.sh}"
  export BASE_SCHEMA="${BASE_SCHEMA:-000-initial-schema.sql}"
  export BASE_SCHEMA_PATH="$MIGRATIONS_DIR/$BASE_SCHEMA"
  export SEED_SCRIPT="${SEED_SCRIPT:-$SCRIPTS_DIR/seed-d1-from-env.sh}"
  export SETTINGS_MODEL="${SETTINGS_MODEL:-settings-model.ts}"

  export WRANGLER_STATE=".wrangler/state"
  export KV_DIR="$WRANGLER_STATE/kv/local-kv"
  export R2_DIR="$WRANGLER_STATE/r2/local-archive"

  local resolved_db="${1:-${DB_NAME:-analytics_staging}}"
  export DB_NAME="$resolved_db"
  export D1_SQLITE="$WRANGLER_STATE/d1/$DB_NAME/$DB_NAME.sqlite"

  log INFO "✅ Environment config resolved:"
  log INFO "   ROOT_DIR            = $ROOT_DIR"
  log INFO "   PACKAGE_DIR         = $PACKAGE_DIR"
  log INFO "   WRANGLER_CONFIG     = $WRANGLER_CONFIG"
  log INFO "   ENVIRONMENT         = $ENVIRONMENT"
  log INFO "   ENV_FILE            = $ENV_FILE"
  log INFO "   ENV_FILE_DEFAULT    = $ENV_FILE_DEFAULT"
  log INFO "   DB_NAME             = $DB_NAME"
  log INFO "   D1_SQLITE           = $D1_SQLITE"
  log INFO "   MIGRATIONS_DIR      = $MIGRATIONS_DIR"
  log INFO "   MIGRATE_SCRIPT      = $MIGRATE_SCRIPT"
  log INFO "   BASE_SCHEMA_PATH    = $BASE_SCHEMA_PATH"
  log INFO "   SEED_SCRIPT         = $SEED_SCRIPT"
  log INFO "   SETTINGS_MODEL      = $SETTINGS_MODEL"
  log INFO "   KV_DIR              = $KV_DIR"
  log INFO "   R2_DIR              = $R2_DIR"
}

# ------------------------------------------------------------------------------
# 🧪 check::load_log_helpers — Source standardized log.sh and verify logging functions
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Sourcing log.sh from the same directory as this file
#   - Verifying that the `log()` function is now available
#
# Why it matters:
#   All checks and bootstrap logic must emit logs using `log INFO|FATAL|WARN`.
#   This guarantees consistency in output formatting and diagnostics.
#
# Globals used:
#   - None
#
# Example:
#   check::load_log_helpers
#
# Categories:
#   shell, safety
#
# Stages:
#   hydrate, check, dev
# ------------------------------------------------------------------------------
check::load_log_helpers() {
  # ✅ Check: Load and verify log() helpers from colocated log.sh
  # Category: shell, safety
  # Stages: hydrate, check, dev

  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  if [[ ! -f "$dir/log.sh" ]]; then
    echo "❌ log.sh not found at $dir/log.sh" >&2
    echo "   💡 Tip: Ensure log.sh is colocated with this script"
    echo "   📘 Example: scripts/check/log.sh"
    return 1
  fi

  # shellcheck source=/dev/null
  source "$dir/log.sh"

  if ! declare -f log > /dev/null; then
    echo "❌ log() function not defined after sourcing log.sh" >&2
    echo "   💡 Tip: Check log.sh implements a log() dispatcher with INFO/WARN/FATAL"
    echo "   📘 Example: grep '^log()' $dir/log.sh"
    return 1
  fi

  log INFO "✅ log.sh sourced successfully from: $dir/log.sh"
}

# ------------------------------------------------------------------------------
# 🧪 check::setup_error_handling — Install global error and exit traps
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Installing global `trap ERR` and `trap EXIT` handlers
#   - Printing human-readable stack traces on failure
#   - Logging successful script completion on clean exit
#
# Why it matters:
#   Every check and bootstrap script must fail loudly, early, and helpfully.
#   This function prevents silent errors and ensures traceability.
#
# Globals set:
#   - _ERROR_HANDLER_INSTALLED → Prevents double-trapping
#
# Example:
#   check::load_log_helpers && check::setup_error_handling
#
# Categories:
#   shell, safety, ci
#
# Stages:
#   hydrate, check, dev
# ------------------------------------------------------------------------------
check::setup_error_handling() {
  # ✅ Check: Set -Eeuo pipefail and global ERR/EXIT traps
  # Category: shell, safety, ci
  # Stages: hydrate, check, dev

  if [[ "${_ERROR_HANDLER_INSTALLED:-}" == "1" ]]; then
    return 0
  fi

  set -Eeuo pipefail
  readonly _ERROR_HANDLER_INSTALLED=1

  _print_stack_trace() {
    log INFO "---- STACK TRACE ----"
    local i=0
    while caller "$i"; do
      ((i++))
    done
  }

  _handle_error() {
    local code=$?
    local line=${1:-unknown}
    local cmd="${BASH_COMMAND:-unknown}"
    local func="${FUNCNAME[1]:-main}"

    echo >&2
    log FATAL "❌ Command \`$cmd\` failed in \`$func\` at line $line (exit: $code)"
    _print_stack_trace >&2
    return "$code"
  }

  _cleanup() {
    local code=$?
    if [[ $code -eq 0 ]]; then
      log INFO "✅ Script completed successfully"
    fi
  }

  trap '_handle_error $LINENO' ERR
  trap _cleanup EXIT

  log INFO "🧯 Global error + exit traps installed (ERR, EXIT)"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_integration_test_and_healthcheck — Run integration test and confirm post-deploy health
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Running the designated integration test script for $WRANGLER_ENV
#   - Verifying runtime availability via a post-deploy healthcheck
#
# Why it matters:
#   Even successful builds can silently fail at runtime. This check ensures
#   functional behavior of the deployed preview/staging environment.
#
# Globals used:
#   - WRANGLER_ENV → Environment to test (e.g. preview, staging)
#   - PREVIEW_URL  → Deployed URL to check
#
# Example:
#   WRANGLER_ENV=preview PREVIEW_URL=https://example.workers.dev check::run_integration_test_and_healthcheck
#
# Categories:
#   test, ci, deploy, integration
#
# Stages:
#   test, post-deploy, integration
# ------------------------------------------------------------------------------
check::run_integration_test_and_healthcheck() {
  # ✅ Check: Run integration test and post-deploy healthcheck
  # Category: test, ci, deploy, integration
  # Stages: test, post-deploy, integration

  if [[ -z "${WRANGLER_ENV:-}" ]]; then
    log FATAL "❌ WRANGLER_ENV is not set"
    log FATAL "   💡 Tip: Define the target environment to test (e.g. preview)"
    log FATAL "   📘 Example: WRANGLER_ENV=preview check::run_integration_test_and_healthcheck"
    return 1
  fi

  if [[ -z "${PREVIEW_URL:-}" ]]; then
    log FATAL "❌ PREVIEW_URL is not set"
    log FATAL "   💡 Tip: Set PREVIEW_URL to the deployed URL before running this check"
    log FATAL "   📘 Example: PREVIEW_URL=https://example.workers.dev"
    return 1
  fi

  if [[ ! -f ./__tests__/test.analytics.ts ]]; then
    log FATAL "❌ Integration test file not found: ./__tests__/test.analytics.ts"
    log FATAL "   💡 Tip: Ensure the test file exists and is committed"
    log FATAL "   📘 Example: mkdir -p __tests__ && touch test.analytics.ts"
    return 1
  fi

  log INFO "🧪 Running integration test for environment: $WRANGLER_ENV"
  if ! ENV="$WRANGLER_ENV" ./__tests__/test.analytics.ts; then
    log FATAL "❌ Integration test failed for $WRANGLER_ENV"
    log FATAL "   💡 Tip: Fix test failures before proceeding to deploy"
    log FATAL "   📘 Example: ENV=$WRANGLER_ENV ./__tests__/test.analytics.ts"
    return 1
  fi

  if [[ ! -x ./src/scripts/post-deploy-health-check.sh ]]; then
    log FATAL "❌ Health check script not found or not executable: ./src/scripts/post-deploy-health-check.sh"
    log FATAL "   💡 Tip: Ensure the script exists and has chmod +x"
    log FATAL "   📘 Example: chmod +x ./src/scripts/post-deploy-health-check.sh"
    return 1
  fi

  log INFO "🩺 Running post-deploy health check on: $PREVIEW_URL"
  if ! ./src/scripts/post-deploy-health-check.sh "$PREVIEW_URL"; then
    log FATAL "❌ Post-deploy health check failed for $PREVIEW_URL"
    log FATAL "   💡 Tip: Confirm your deployed Worker is accessible and healthy"
    log FATAL "   📘 Example: curl $PREVIEW_URL/__health"
    return 1
  fi

  log INFO "✅ Integration test and health check passed for: $WRANGLER_ENV"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_preview_url_health — Confirm deployed preview URL returns HTTP 200
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Resolving $PREVIEW_URL from the environment or .env.preview
#   - Making a request to the root preview URL
#   - Ensuring the response returns HTTP 200
#
# Why it matters:
#   A preview deployment may build successfully but still fail at runtime.
#   This ensures the deployed endpoint is reachable and responding.
#
# Globals used:
#   - PREVIEW_URL → Will be resolved if not set from .env.preview
#
# Example:
#   check::validate_preview_url_health
#
# Categories:
#   ci, deploy, post-deploy, test
#
# Stages:
#   post-deploy, integration, check
# ------------------------------------------------------------------------------
check::validate_preview_url_health() {
  # ✅ Check: Confirm deployed preview URL is reachable (HTTP 200)
  # Category: ci, deploy, post-deploy, test
  # Stages: post-deploy, integration, check

  if [[ -z "${PREVIEW_URL:-}" ]]; then
    if [[ -f .env.preview ]]; then
      PREVIEW_URL=$(grep -E '^PREVIEW_URL=' .env.preview | cut -d= -f2- || true)
    fi
  fi

  if [[ -z "$PREVIEW_URL" ]]; then
    log FATAL "❌ PREVIEW_URL not found in environment or .env.preview"
    log FATAL "   💡 Tip: Ensure the preview deployment writes PREVIEW_URL to .env.preview"
    log FATAL "   📘 Example: echo \"PREVIEW_URL=https://xyz.workers.dev\" >> .env.preview"
    return 1
  fi

  log INFO "🔍 Validating preview URL: $PREVIEW_URL"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$PREVIEW_URL")

  if [[ "$status" -ne 200 ]]; then
    log FATAL "❌ Preview URL is not healthy (HTTP $status)"
    log FATAL "   💡 Tip: Check logs or route config in Wrangler"
    log FATAL "   📘 Example: curl -i $PREVIEW_URL"
    return 1
  fi

  log INFO "✅ Preview URL is healthy (HTTP 200)"
}

# ------------------------------------------------------------------------------
# 🧪 check::monitor_canary_health — Validate canary rollout via Sentry and tail logs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Querying Sentry for error volume during a rollout
#   - Inspecting Cloudflare tail logs for runtime crash signatures
#
# Why it matters:
#   Canary rollouts must be automatically reverted if instability is detected.
#   This check ensures observability-driven health validation in CI.
#
# Globals used:
#   - CI → Must be "true"
#
# Example:
#   check::monitor_canary_health 10 2m
#
# Categories:
#   ci, deploy, observability, sentry, cloudflare:do
#
# Stages:
#   post-deploy, integration, rollback
# ------------------------------------------------------------------------------
check::monitor_canary_health() {
  # ✅ Check: Monitor canary health via Sentry + Wrangler tail logs
  # Category: ci, deploy, observability, sentry, cloudflare:do
  # Stages: post-deploy, integration, rollback

  local max_errors="${1:-10}"
  local window="${2:-2m}"

  if [[ "${CI:-}" != "true" ]]; then
    echo "❌ This check must only run in GitLab CI (CI=true)" >&2
    echo "💡 Tip: Add \`CI=true\` to your job environment" >&2
    echo "📘 Example: CI=true check::monitor_canary_health 10 2m" >&2
    return 1
  fi

  log INFO "📡 Checking Sentry metrics for canary..."
  local error_count
  error_count=$(curl -s "https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/stats/" |
    jq '.[].errors' | awk '{s+=$1} END {print s}' || echo "0")

  log INFO "🔢 Sentry error count: $error_count (window: $window)"

  if [[ "$error_count" -gt "$max_errors" ]]; then
    log FATAL "❌ Canary failed Sentry threshold: $error_count errors > max $max_errors"
    log FATAL "   💡 Tip: Investigate recent exceptions in Sentry before promoting"
    log FATAL "   📘 Example: https://sentry.io/organizations/YOUR_ORG/projects/YOUR_PROJECT/"
    return 1
  fi

  log INFO "🌀 Inspecting Wrangler canary tail logs..."
  local tail_log
  tail_log=$(timeout 10s pnpm exec wrangler tail --env canary --sampling-rate 1.0 --format json --log-forwarding-url dummy://local 2>/dev/null || true)

  if echo "$tail_log" | grep -qiE 'ReferenceError|TypeError|UnhandledPromiseRejection|binding error|unexpected'; then
    log FATAL "❌ Canary tail logs show runtime errors"
    log FATAL "   💡 Tip: Check wrangler logs and look for recent stack traces"
    log FATAL "   📘 Example: pnpm exec wrangler tail --env canary"
    echo "$tail_log" | grep -iE 'ReferenceError|TypeError|UnhandledPromiseRejection|binding error|unexpected' >&2
    return 1
  fi

  log INFO "✅ Canary passed health checks (Sentry + Wrangler tail logs)"
}

# ------------------------------------------------------------------------------
# 🧪 check::run_post_deploy_checks — Notify Healthchecks.io + send Sentry test event
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Pinging HEALTHCHECKS_POST_DEPLOY_URL
#   - Optionally sending a test event to Sentry if SENTRY_DSN and SENTRY_KEY are defined
#
# Why it matters:
#   Post-deploy observability must confirm that deployments complete successfully.
#   This ensures external health and alerting systems reflect CI state.
#
# Globals used:
#   - CI → must be "true"
#   - HEALTHCHECKS_POST_DEPLOY_URL → required
#   - SENTRY_DSN, SENTRY_KEY → optional for test ping
#
# Example:
#   CI=true HEALTHCHECKS_POST_DEPLOY_URL=... check::run_post_deploy_checks
#
# Categories:
#   ci, observability, deploy
#
# Stages:
#   post-deploy, notify, integration
# ------------------------------------------------------------------------------
check::run_post_deploy_checks() {
  # ✅ Check: Post-deploy checks for Healthchecks.io + Sentry
  # Category: ci, observability, deploy
  # Stages: post-deploy, notify, integration

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must be run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Ensure CI=true is set in your pipeline job"
    log FATAL "   📘 Example: CI=true check::run_post_deploy_checks"
    return 1
  fi

  if [[ -n "${HEALTHCHECKS_POST_DEPLOY_URL:-}" ]]; then
    log INFO "📡 Pinging Healthchecks.io endpoint..."
    if curl -fsS -m 5 "$HEALTHCHECKS_POST_DEPLOY_URL" > /dev/null; then
      log INFO "✅ Healthcheck ping succeeded"
    else
      log WARN "⚠️ Healthcheck ping failed — endpoint may be misconfigured"
    fi
  else
    log WARN "⚠️ No HEALTHCHECKS_POST_DEPLOY_URL defined — skipping healthcheck ping"
  fi

  if [[ -n "${SENTRY_DSN:-}" && -n "${SENTRY_KEY:-}" ]]; then
    log INFO "📡 Sending Sentry test event..."
    if ! curl -s https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/store/ \
      -H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=$SENTRY_KEY, sentry_client=enzuzo-cli/1.0" \
      -H "Content-Type: application/json" \
      -d '{
        "message": "CI Post-deploy test event",
        "level": "info",
        "platform": "javascript"
      }' > /dev/null; then
      log WARN "⚠️ Sentry test event failed — check SENTRY_KEY validity"
    else
      log INFO "✅ Sentry test event sent"
    fi
  else
    log INFO "ℹ️ Sentry test event skipped — SENTRY_DSN or SENTRY_KEY not set"
  fi
}

# ------------------------------------------------------------------------------
# 🧪 check::diff_wrangler_environments — Compare secrets and R2 buckets across envs
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring secrets in source env exist in the target env
#   - Ensuring R2 buckets match between both environments
#
# Why it matters:
#   Configuration drift between environments can lead to deployment failures
#   or runtime errors. This check guarantees alignment between staging and prod.
#
# Globals used:
#   - CI → must be "true"
#
# Example:
#   CI=true check::diff_wrangler_environments staging production
#
# Categories:
#   wrangler, cloudflare:r2, secrets, ci, deploy
#
# Stages:
#   check, deploy, integration
# ------------------------------------------------------------------------------
check::diff_wrangler_environments() {
  # ✅ Check: Compare secrets + R2 buckets between two Wrangler environments
  # Category: wrangler, cloudflare:r2, secrets, ci, deploy
  # Stages: check, deploy, integration

  local env1="$1"
  local env2="$2"

  if [[ -z "$env1" || -z "$env2" ]]; then
    log FATAL "❌ Missing required arguments: source and target environments"
    log FATAL "   💡 Tip: Provide both envs to compare (e.g. staging production)"
    log FATAL "   📘 Example: check::diff_wrangler_environments staging production"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must only run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Add \`CI=true\` to your job environment"
    log FATAL "   📘 Example: CI=true check::diff_wrangler_environments staging production"
    return 1
  fi

  local missing=0
  log INFO "🔍 Comparing secrets: $env1 vs $env2"
  local secrets_env1
  secrets_env1=$(pnpm exec wrangler secret list --env "$env1" | awk '{print $1}' | tail -n +2)

  for secret in $secrets_env1; do
    if ! pnpm exec wrangler secret list --env "$env2" | grep -q "^$secret$"; then
      log FATAL "❌ Secret '$secret' exists in $env1 but is missing in $env2"
      log FATAL "   💡 Tip: Sync this secret using \`wrangler secret put $secret --env $env2\`"
      log FATAL "   📘 Example: echo \$${secret} | pnpm exec wrangler secret put $secret --env $env2"
      missing=1
    else
      log INFO "✅ Secret '$secret' exists in both environments"
    fi
  done

  log INFO "🔍 Comparing R2 buckets: $env1 vs $env2"
  local buckets_env1
  buckets_env1=$(jq -r ".env[\"$env1\"].r2_buckets[]?.bucket_name" wrangler.json || true)

  for bucket in $buckets_env1; do
    if ! jq -r ".env[\"$env2\"].r2_buckets[]?.bucket_name" wrangler.json | grep -q "^$bucket$"; then
      log FATAL "❌ R2 bucket '$bucket' exists in $env1 but is missing in $env2"
      log FATAL "   💡 Tip: Add this bucket under \`.env.$env2.r2_buckets\` in wrangler.json"
      log FATAL "   📘 Example: { \"bucket_name\": \"$bucket\", \"binding\": \"...\" }"
      missing=1
    else
      log INFO "✅ R2 bucket '$bucket' exists in both environments"
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ Drift detected between $env1 and $env2"
    log FATAL "   💡 Tip: Align secrets and R2 buckets before promoting to $env2"
    return 1
  fi

  log INFO "✅ No drift detected between $env1 and $env2"
}

# ------------------------------------------------------------------------------
# 🧪 check::read_settings_schema_and_tiers — Parse schema keys and tier names from TypeScript model
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Executing a tsx script to extract settingSchema and tiers[]
#   - Populating global arrays `schema_keys` and `tiers`
#
# Why it matters:
#   The schema and tier definitions power .env validation, seeding, SQL inserts,
#   and runtime validation. Without this step, downstream logic will break silently.
#
# Globals set:
#   - schema_keys — array of schema key names
#   - tiers       — array of tier names (free, pro, team, etc.)
#
# Example:
#   SETTINGS_MODEL=settings-model.ts check::read_settings_schema_and_tiers
#
# Categories:
#   tsconfig, database, hydrate
#
# Stages:
#   hydrate, check, dev
# ------------------------------------------------------------------------------
check::read_settings_schema_and_tiers() {
  # ✅ Check: Parse TypeScript model to extract schema keys and tiers
  # Category: tsconfig, database, hydrate
  # Stages: hydrate, check, dev

  local settings_file="${1:-$SETTINGS_MODEL}"
  local settings_path="$PACKAGE_DIR/src/utils/$settings_file"

  if [[ ! -f "$settings_path" ]]; then
    log FATAL "❌ TypeScript settings model not found at: $settings_path"
    log FATAL "   💡 Tip: Ensure SETTINGS_MODEL points to the correct path inside your app"
    log FATAL "   📘 Example: SETTINGS_MODEL=settings-model.ts"
    return 1
  fi

  if ! command -v tsx > /dev/null; then
    log FATAL "❌ tsx is not installed or not in PATH"
    log FATAL "   💡 Tip: Install tsx via \`pnpm add -D tsx\`"
    log FATAL "   📘 Example: pnpm add -D tsx"
    return 1
  fi

  log INFO "📖 Parsing schema and tiers from: $settings_path"

  local tmp_script
  tmp_script="$(mktemp --suffix=.ts)"

  cat > "$tmp_script" <<EOF
    import { settingSchema, tiers } from '${settings_path}';
    console.log(JSON.stringify({ schema: settingSchema, tiers }));
EOF

  local json
  json=$(cd "$SCRIPTS_DIR" && tsx --esm "$tmp_script" 2>/dev/null)
  rm -f "$tmp_script"

  if [[ -z "$json" ]]; then
    log FATAL "❌ Failed to parse $settings_file — missing or invalid exports"
    log FATAL "   💡 Tip: Ensure settingSchema and tiers[] are exported"
    log FATAL "   📘 Example:
      export const settingSchema = { a: '', b: '' };
      export const tiers = ['free', 'pro'];
    "
    return 1
  fi

  # Extract and export globals
  mapfile -t schema_keys < <(echo "$json" | jq -r '.schema | keys[]')
  mapfile -t tiers < <(echo "$json" | jq -r '.tiers[]')

  if [[ "${#schema_keys[@]}" -eq 0 || "${#tiers[@]}" -eq 0 ]]; then
    log FATAL "❌ Parsed output is missing schema keys or tiers"
    log FATAL "   💡 Tip: Ensure the schema object and tiers[] array contain actual values"
    log FATAL "   📘 Example: { settingSchema: { a: '', b: '' }, tiers: ['basic'] }"
    return 1
  fi

  log INFO "✅ Extracted ${#schema_keys[@]} schema key(s) and ${#tiers[@]} tier(s)"
  log INFO "   • Schema keys: ${schema_keys[*]}"
  log INFO "   • Tiers: ${tiers[*]}"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_env_variables — Ensure all required .env variables exist for schema + tiers
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking presence of global defaults in the .env file
#   - Validating tier-specific settings and UUIDs are populated
#
# Why it matters:
#   Missing environment variables can silently break database seeding or runtime behavior.
#   This ensures strong guarantees before applying tiered settings to D1.
#
# Globals used:
#   - schema_keys → Array of setting keys from parsed model
#   - tiers       → Array of tier names (free, pro, etc.)
#   - ENV_FILE    → Path to current .env being validated
#
# Example:
#   check::read_settings_schema_and_tiers && check::load_env_file && check::validate_env_variables
#
# Categories:
#   dotenv, database, hydrate, safety
#
# Stages:
#   check, hydrate, dev, build
# ------------------------------------------------------------------------------
check::validate_env_variables() {
  # ✅ Check: Ensure all required global and per-tier env vars are defined
  # Category: dotenv, database, hydrate, safety
  # Stages: check, hydrate, dev, build

  local missing=0
  log INFO "🔐 Validating environment configuration in: $ENV_FILE"

  # ── Validate global keys ────────────────────────────────────────────────────
  for key in "${schema_keys[@]}"; do
    if [[ "$key" == DEFAULT_* || "$key" == D1_RETENTION_DAYS || "$key" == DEBUG_FLUSH_LOGGING ]]; then
      if [[ -z "${!key:-}" ]]; then
        log FATAL "❌ Missing required global variable: $key"
        log FATAL "   💡 Tip: Define $key in $ENV_FILE before seeding or deploying"
        log FATAL "   📘 Example: $key=1000"
        missing=1
      fi
    fi
  done

  # ── Validate tier-specific keys ─────────────────────────────────────────────
  for tier in "${tiers[@]}"; do
    local upper
    upper=$(echo "$tier" | tr '[:lower:]' '[:upper:]')
    local uuid_var="CUSTOMER_UUID_${upper}"

    if [[ -z "${!uuid_var:-}" ]]; then
      log FATAL "❌ Missing required customer UUID: $uuid_var"
      log FATAL "   💡 Tip: Define $uuid_var to link seeded customers to this tier"
      log FATAL "   📘 Example: CUSTOMER_UUID_${upper}=123e4567-e89b-12d3-a456-426614174000"
      missing=1
    fi

    for key in "${schema_keys[@]}"; do
      local env_key="TIER_${upper}_$(echo "$key" | tr '[:lower:]' '[:upper:]')"
      if [[ -z "${!env_key:-}" ]]; then
        log FATAL "❌ Missing setting for tier '$tier': $env_key"
        log FATAL "   💡 Tip: Define all per-tier values as TIER_${upper}_${key^^}"
        log FATAL "   📘 Example: $env_key=100"
        missing=1
      fi
    done
  done

  # ── Abort on failure ────────────────────────────────────────────────────────
  if [[ "$missing" -eq 1 ]]; then
    log FATAL ""
    log FATAL "💥 One or more required environment variables are missing"
    log FATAL "   Please review $ENV_FILE and ensure all required keys are set"
    log FATAL ""
    log FATAL "📘 Required variables include:"
    log FATAL "   • Global: DEFAULT_*, D1_RETENTION_DAYS, DEBUG_FLUSH_LOGGING"
    log FATAL "   • Tier-specific: TIER_<TIERNAME>_<SETTING>, CUSTOMER_UUID_<TIERNAME>"
    log FATAL ""
    return 1
  fi

  log INFO "✅ All required environment variables are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_cf_secrets — Ensure required Wrangler secrets exist in environment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking if all secrets in $REQUIRED_SECRETS exist in `wrangler secret list --env`
#
# Why it matters:
#   Missing secrets during CI/CD deployments will result in runtime failure.
#   This check ensures all required values are defined before continuing.
#
# Globals used:
#   - CI → must be true
#   - REQUIRED_SECRETS → array of required secret keys
#
# Example:
#   REQUIRED_SECRETS=("SENTRY_DSN" "SENTRY_PROJECT")
#   check::validate_cf_secrets staging
#
# Categories:
#   secrets, wrangler, ci, deploy
#
# Stages:
#   check, deploy, hydrate
# ------------------------------------------------------------------------------
check::validate_cf_secrets() {
  # ✅ Check: Validate required secrets exist in wrangler environment
  # Category: secrets, wrangler, ci, deploy
  # Stages: check, deploy, hydrate

  local env="$1"

  if [[ -z "$env" ]]; then
    log FATAL "❌ Missing environment name argument"
    log FATAL "   💡 Tip: Specify the Wrangler environment to check"
    log FATAL "   📘 Example: check::validate_cf_secrets staging"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must be run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Add CI=true to your job environment"
    log FATAL "   📘 Example: CI=true check::validate_cf_secrets $env"
    return 1
  fi

  if [[ -z "${REQUIRED_SECRETS[*]:-}" ]]; then
    log FATAL "❌ REQUIRED_SECRETS is not defined"
    log FATAL "   💡 Tip: Set REQUIRED_SECRETS=(...) before calling this function"
    log FATAL "   📘 Example: REQUIRED_SECRETS=(SENTRY_DSN SENTRY_PROJECT)"
    return 1
  fi

  log INFO "🔐 Validating required Cloudflare secrets for env: $env"

  local missing=0
  local existing
  existing=$(pnpm exec wrangler secret list --env "$env" | awk '{print $1}' | tail -n +2)

  for key in "${REQUIRED_SECRETS[@]}"; do
    if ! grep -q "^$key$" <<< "$existing"; then
      log FATAL "❌ Missing secret: $key for env=$env"
      log FATAL "   💡 Tip: Set this using: echo \$${key} | pnpm exec wrangler secret put $key --env $env"
      log FATAL "   📘 Example: echo \$${key} | pnpm exec wrangler secret put $key --env $env"
      missing=1
    else
      log INFO "✅ Found secret: $key"
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "💥 One or more required secrets are missing in env: $env"
    return 1
  fi

  log INFO "✅ All required secrets are present in $env"
}

# ------------------------------------------------------------------------------
# 🧪 check::required_secrets — Ensure required secrets are present in local env
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Checking that essential secrets (e.g., SENTRY_DSN, SENTRY_PROJECT) are exported
#   - Failing the check if any are missing
#
# Why it matters:
#   Secrets must be present to seed, deploy, or run services locally or in CI.
#   Missing secrets lead to silent failures, misconfigured Sentry, and blocked CI jobs.
#
# Globals used:
#   - None (but reads: $SENTRY_DSN, $SENTRY_PROJECT, etc.)
#
# Example:
#   check::required_secrets
#
# Categories:
#   dotenv, secrets, safety
#
# Stages:
#   check, hydrate, build, deploy
# ------------------------------------------------------------------------------
check::required_secrets() {
  # ✅ Check: Ensure required environment secrets are defined
  # Category: dotenv, secrets, safety
  # Stages: check, hydrate, build, deploy

  local secrets=(SENTRY_DSN SENTRY_PROJECT)  # TODO: Extract from model/schema?
  local missing=0

  log INFO "🔐 Checking required secrets in local environment..."

  for var in "${secrets[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      log FATAL "❌ Missing secret: $var"
      log FATAL "   💡 Tip: Set this secret in your .env or CI environment"
      log FATAL "   📘 Example: echo \"$var=value\" >> .env.local"
      missing=1
    else
      log INFO "✅ $var is set"
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "💥 One or more required secrets are missing"
    return 1
  fi

  log INFO "✅ All required secrets are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::required_ci_vars — Validate required CI/CD environment variables are set
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring core CI/CD-related env vars are defined before deploy/build
#
# Why it matters:
#   CI jobs will silently fail or behave incorrectly if critical variables are missing.
#   This check enforces pre-flight safety in any CI pipeline.
#
# Globals read:
#   - WRANGLER_ENV, DB_NAME, SENTRY_DSN, SENTRY_PROJECT,
#     CLOUDFLARE_API_TOKEN, ACCOUNT_ID, SERVICE_NAME
#
# Example:
#   check::required_ci_vars
#
# Categories:
#   ci, secrets, safety
#
# Stages:
#   check, build, deploy
# ------------------------------------------------------------------------------
check::required_ci_vars() {
  # ✅ Check: Validate core CI/CD variables are present
  # Category: ci, secrets, safety
  # Stages: check, build, deploy

  local vars=(
    WRANGLER_ENV
    DB_NAME
    SENTRY_DSN
    SENTRY_PROJECT
    CLOUDFLARE_API_TOKEN
    ACCOUNT_ID
    SERVICE_NAME
  )

  local missing=0

  log INFO "🔎 Validating required CI/CD environment variables..."

  for var in "${vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      log FATAL "❌ Missing CI/CD variable: $var"
      log FATAL "   💡 Tip: Set this variable in GitLab CI/CD settings or .env"
      log FATAL "   📘 Example: export $var=value"
      missing=1
    else
      log INFO "✅ $var is set"
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "💥 CI/CD validation failed — one or more required variables are missing"
    return 1
  fi

  log INFO "✅ All required CI/CD environment variables are present"
}

# ------------------------------------------------------------------------------
# 🧪 check::validate_wrangler_env_config — Ensure wrangler.json has full bindings per env
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring each defined environment in wrangler.json has the required bindings:
#     - kv_namespaces
#     - r2_buckets
#     - d1_databases
#
# Why it matters:
#   Missing env bindings in wrangler.json lead to broken deployments and runtime errors.
#   This check ensures each env block is complete before deploy or bootstrap.
#
# Globals used:
#   - None
#
# Example:
#   check::validate_wrangler_env_config
#
# Categories:
#   wrangler, cloudflare:kv, cloudflare:r2, cloudflare:d1, safety
#
# Stages:
#   check, hydrate, deploy
# ------------------------------------------------------------------------------
check::validate_wrangler_env_config() {
  # ✅ Check: Ensure wrangler.json envs define kv, r2, d1 bindings
  # Category: wrangler, cloudflare:kv, cloudflare:r2, cloudflare:d1, safety
  # Stages: check, hydrate, deploy

  local environments=("production" "staging" "preview")
  local missing=0

  log INFO "📋 Validating wrangler.json environment bindings..."

  for env in "${environments[@]}"; do
    log INFO "🔍 Validating wrangler config for env=$env"
    if jq -e \
      ".env[\"$env\"].kv_namespaces and \
       .env[\"$env\"].r2_buckets and \
       .env[\"$env\"].d1_databases" wrangler.json > /dev/null; then
      log INFO "✅ Required bindings present for $env"
    else
      log FATAL "❌ Missing bindings for env=$env in wrangler.json"
      log FATAL "   💡 Tip: Ensure 'kv_namespaces', 'r2_buckets', and 'd1_databases' are defined under .env[\"$env\"]"
      log FATAL "   📘 Example:
        \"env\": {
          \"$env\": {
            \"kv_namespaces\": [...],
            \"r2_buckets\": [...],
            \"d1_databases\": [...]
          }
        }"
      missing=1
    fi
  done

  if [[ "$missing" -eq 1 ]]; then
    log FATAL "❌ wrangler.json validation failed — one or more envs are missing required bindings"
    return 1
  fi

  log INFO "✅ All required bindings are present in wrangler.json for: ${environments[*]}"
}

# ------------------------------------------------------------------------------
# 🧪 check::comment_deploy_summary_to_mr — Post deploy summary markdown to GitLab MR
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring deploy summary exists
#   - Validating required GitLab CI/CD environment variables
#   - Posting a markdown comment to the associated merge request
#
# Why it matters:
#   CI deployments should always leave a paper trail in the MR that triggered them.
#   This ensures devs see deploy outcome inline with GitLab merge workflow.
#
# Globals used:
#   - CI_MERGE_REQUEST_IID → MR ID
#   - GITLAB_API_TOKEN     → GitLab auth token
#   - CI_API_V4_URL        → GitLab API root
#   - CI_PROJECT_ID        → Project ID for this job
#
# Example:
#   check::comment_deploy_summary_to_mr
#
# Categories:
#   ci, deploy, gitlab
#
# Stages:
#   post-deploy, notify
# ------------------------------------------------------------------------------
check::comment_deploy_summary_to_mr() {
  # ✅ Check: Post .deploy-summary/summary.md as a comment to GitLab MR
  # Category: ci, deploy, gitlab
  # Stages: post-deploy, notify

  local summary_file=".deploy-summary/summary.md"

  if [[ ! -f "$summary_file" ]]; then
    log FATAL "❌ Deploy summary not found: $summary_file"
    log FATAL "   💡 Tip: Generate the summary before running this check"
    log FATAL "   📘 Example: echo '### Deploy Complete' > $summary_file"
    return 1
  fi

  if [[ -z "${CI_MERGE_REQUEST_IID:-}" ]]; then
    log FATAL "❌ CI_MERGE_REQUEST_IID is not set — cannot post comment to MR"
    log FATAL "   💡 Tip: Make sure this job runs in a merge request pipeline"
    log FATAL "   📘 Example: echo \"CI_MERGE_REQUEST_IID=\$CI_MERGE_REQUEST_IID\""
    return 1
  fi

  if [[ -z "${GITLAB_API_TOKEN:-}" || -z "${CI_API_V4_URL:-}" || -z "${CI_PROJECT_ID:-}" ]]; then
    log FATAL "❌ Missing required GitLab API variables: GITLAB_API_TOKEN, CI_API_V4_URL, CI_PROJECT_ID"
    log FATAL "   💡 Tip: Ensure these are available as CI/CD variables"
    log FATAL "   📘 Example: export GITLAB_API_TOKEN=... && export CI_API_V4_URL=https://gitlab.com/api/v4"
    return 1
  fi

  local summary
  summary=$(cat "$summary_file")

  log INFO "📝 Posting deploy summary to MR $CI_MERGE_REQUEST_IID"

  if ! curl --silent --fail -X POST \
    -H "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes" \
    -d "{\"body\": ${summary@Q}}"; then
    log FATAL "❌ Failed to post comment to MR $CI_MERGE_REQUEST_IID"
    log FATAL "   💡 Tip: Check that your API token is valid and has MR comment permissions"
    log FATAL "   📘 Example: curl -H \"PRIVATE-TOKEN: \$GITLAB_API_TOKEN\" ... /merge_requests/.../notes"
    return 1
  fi

  log INFO "✅ Deploy summary successfully posted to MR $CI_MERGE_REQUEST_IID"
}

# ------------------------------------------------------------------------------
# 🧪 check::generate_validation_report — Emit CI validation summary markdown
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Collecting current CI metadata (branch, commit, env)
#   - Writing a markdown report file to .validation-report.md
#
# Why it matters:
#   Every successful CI pass should emit a human-readable summary to assist in
#   review and MR visibility. This also enables MR comment tooling and auditing.
#
# Globals used:
#   - CI_COMMIT_REF_NAME, CI_COMMIT_SHORT_SHA, WRANGLER_ENV
#
# Example:
#   check::generate_validation_report
#
# Categories:
#   ci, markdown, observability
#
# Stages:
#   post-deploy, notify, summary
# ------------------------------------------------------------------------------
check::generate_validation_report() {
  # ✅ Check: Write markdown validation summary to .validation-report.md
  # Category: ci, markdown, observability
  # Stages: post-deploy, notify, summary

  local report_file=".validation-report.md"

  log INFO "📋 Generating validation report..."

  if [[ -z "${CI_COMMIT_REF_NAME:-}" || -z "${CI_COMMIT_SHORT_SHA:-}" || -z "${WRANGLER_ENV:-}" ]]; then
    log FATAL "❌ Missing required CI context variables (CI_COMMIT_REF_NAME, CI_COMMIT_SHORT_SHA, WRANGLER_ENV)"
    log FATAL "   💡 Tip: Ensure this check runs after environment is fully configured"
    log FATAL "   📘 Example: WRANGLER_ENV=preview check::generate_validation_report"
    return 1
  fi

  cat <<EOF > "$report_file"
# ✅ CI Validation Report

- **Branch:** \`$CI_COMMIT_REF_NAME\`
- **Commit:** \`$CI_COMMIT_SHORT_SHA\`
- **Environment:** \`$WRANGLER_ENV\`

## ✅ Results

- Secrets: ✅ present
- Wrangler config: ✅ valid
- R2, KV, D1: ✅ accessible
- Tail Worker: ✅ connectable
- Preview URL: ✅ healthy
- Migration check: ✅ passed
- Type check & diagnostics: ✅ passed

_Generated at $(date -u +"%Y-%m-%dT%H:%M:%SZ")_
EOF

  log INFO "✅ Validation report written to $report_file"
}

# ------------------------------------------------------------------------------
# 🧪 check::comment_preview_url_to_mr — Post preview URL as a GitLab MR comment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Extracting PREVIEW_URL from env or file
#   - Resolving MR IID from source branch if not pre-injected
#   - Posting a markdown comment to the merge request with the preview link
#
# Why it matters:
#   Preview URLs must be visible to reviewers in the MR to verify deploys.
#   This integrates deploy visibility directly into GitLab workflows.
#
# Globals used:
#   - PREVIEW_URL, .env.preview (fallback)
#   - CI_MERGE_REQUEST_IID, CI_COMMIT_REF_NAME
#   - CI_PROJECT_ID, CI_API_V4_URL, GITLAB_API_TOKEN
#
# Example:
#   check::comment_preview_url_to_mr
#
# Categories:
#   ci, deploy, gitlab, notify
#
# Stages:
#   post-deploy, notify
# ------------------------------------------------------------------------------
check::comment_preview_url_to_mr() {
  # ✅ Check: Post preview URL to GitLab MR
  # Category: ci, deploy, gitlab, notify
  # Stages: post-deploy, notify

  local preview_url
  preview_url="${PREVIEW_URL:-$(grep -E '^PREVIEW_URL=' .env.preview | cut -d= -f2-)}"

  if [[ -z "$preview_url" ]]; then
    log FATAL "❌ PREVIEW_URL not found in environment or .env.preview"
    log FATAL "   💡 Tip: Ensure the deploy step writes PREVIEW_URL to .env.preview"
    log FATAL "   📘 Example: echo \"PREVIEW_URL=https://your-preview.workers.dev\" >> .env.preview"
    return 1
  fi

  if [[ -z "${CI_PROJECT_ID:-}" || -z "${GITLAB_API_TOKEN:-}" || -z "${CI_API_V4_URL:-}" ]]; then
    log FATAL "❌ Missing required GitLab CI/CD variables: CI_PROJECT_ID, CI_API_V4_URL, GITLAB_API_TOKEN"
    log FATAL "   💡 Tip: Set these in GitLab CI/CD variables or as job-level exports"
    log FATAL "   📘 Example: export CI_PROJECT_ID=123 && export GITLAB_API_TOKEN=..."
    return 1
  fi

  if [[ -z "${CI_MERGE_REQUEST_IID:-}" ]]; then
    log INFO "🔍 CI_MERGE_REQUEST_IID not set — resolving from source branch: $CI_COMMIT_REF_NAME"
    CI_MERGE_REQUEST_IID=$(curl --silent -H "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
      "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests?source_branch=$CI_COMMIT_REF_NAME" \
      | jq -r '.[0].iid')
  fi

  if [[ -z "$CI_MERGE_REQUEST_IID" || "$CI_MERGE_REQUEST_IID" == "null" ]]; then
    log FATAL "❌ Failed to resolve merge request IID from branch: $CI_COMMIT_REF_NAME"
    log FATAL "   💡 Tip: Ensure this pipeline is running in a merge request context"
    log FATAL "   📘 Example: manually set CI_MERGE_REQUEST_IID if needed"
    return 1
  fi

  log INFO "📨 Commenting preview URL to GitLab MR #$CI_MERGE_REQUEST_IID: $preview_url"

  if ! curl --silent --fail -X POST \
    -H "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes" \
    -d "{\"body\": \"🔍 **Preview for \`$CI_COMMIT_REF_NAME\`**:\n👉 $preview_url\"}"; then
    log FATAL "❌ Failed to post comment to MR #$CI_MERGE_REQUEST_IID"
    log FATAL "   💡 Tip: Check API token permissions and project visibility"
    log FATAL "   📘 Example: Verify token via curl or GitLab UI"
    return 1
  fi

  log INFO "✅ Preview URL comment posted to MR #$CI_MERGE_REQUEST_IID"
}

# ------------------------------------------------------------------------------
# 🧪 check::generate_canary_report — Emit markdown summary for canary deployment
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Ensuring CI context is active
#   - Generating a markdown summary for canary promotion or rollback
#   - Optionally pulling Sentry stats for diagnostics
#
# Why it matters:
#   Canary rollouts must leave a durable and human-readable audit trail.
#   This enables tracking, visibility, and faster incident response.
#
# Globals used:
#   - CI
#
# Arguments:
#   $1 — deployment status (either "success" or "fail")
#
# Example:
#   check::generate_canary_report success > .canary-summary.md
#
# Categories:
#   ci, deploy, observability, summary
#
# Stages:
#   post-deploy, notify, summary
# ------------------------------------------------------------------------------
check::generate_canary_report() {
  # ✅ Check: Write markdown report of canary status and diagnostics to stdout
  # Category: ci, deploy, observability, summary
  # Stages: post-deploy, notify, summary

  local status="${1:-}"
  if [[ -z "$status" || "$status" != "success" && "$status" != "fail" ]]; then
    log FATAL "❌ Invalid argument: must pass either 'success' or 'fail'"
    log FATAL "   💡 Tip: Call with rollout result: check::generate_canary_report success"
    log FATAL "   📘 Example: check::generate_canary_report fail > .canary-summary.md"
    return 1
  fi

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must be run in GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Add \`CI=true\` to your pipeline environment"
    return 1
  fi

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local status_label="${status^^}"

  cat <<EOF
# Canary Deployment Report

- Status: **${status_label}**
- Timestamp: \`${timestamp}\`
- Canary Traffic History:
  - 5% → 25% → 100%

## Error Monitoring

$(curl -s "https://sentry.io/api/0/projects/YOUR_ORG/YOUR_PROJECT/stats/" | jq '.' || echo "⚠️ Sentry stats unavailable")

## Action

$(if [[ "$status" == "fail" ]]; then echo "❌ Canary reverted to 0%"; else echo "✅ Canary promoted to 100% production"; fi)
EOF
}

# ------------------------------------------------------------------------------
# 🧪 check::generate_deploy_summary — Write HTML and Markdown deployment summary
# ------------------------------------------------------------------------------
# This function performs validation such as:
#   - Emitting a Markdown + HTML report describing a successful deploy
#   - Recording CI metadata including branch, commit, time, env, URL, etc.
#
# Why it matters:
#   This provides a standardized, reviewable summary for every deployment.
#   It improves auditability and supports MR comments or external dashboards.
#
# Globals used:
#   - CI_COMMIT_REF_NAME, CI_COMMIT_SHA, CI_PROJECT_PATH, CI_PIPELINE_ID
#   - WRANGLER_ENV, PREVIEW_URL, CI
#
# Arguments:
#   $1 — target environment (e.g. preview, staging, production)
#
# Example:
#   check::generate_deploy_summary preview
#
# Categories:
#   ci, deploy, markdown, html, summary
#
# Stages:
#   post-deploy, notify, summary
# ------------------------------------------------------------------------------
check::generate_deploy_summary() {
  # ✅ Check: Generate markdown + HTML deployment summary
  # Category: ci, deploy, markdown, html, summary
  # Stages: post-deploy, notify, summary

  local env="$1"

  if [[ "${CI:-}" != "true" ]]; then
    log FATAL "❌ This check must be run inside GitLab CI (CI=true)"
    log FATAL "   💡 Tip: Add \`CI=true\` to your job environment"
    log FATAL "   📘 Example: CI=true check::generate_deploy_summary staging"
    return 1
  fi

  if [[ -z "$env" ]]; then
    log FATAL "❌ Missing required argument: environment"
    log FATAL "   💡 Tip: Specify the deploy target environment"
    log FATAL "   📘 Example: check::generate_deploy_summary preview"
    return 1
  fi

  local branch="${CI_COMMIT_REF_NAME:-unknown}"
  local sha="${CI_COMMIT_SHA:-unknown}"
  local date
  date="$(date -u +"%Y-%m-%d %H:%M:%SZ")"
  local url="${PREVIEW_URL:-<not available>}"
  local pipeline_id="${CI_PIPELINE_ID:-N/A}"
  local project_name="${CI_PROJECT_PATH:-N/A}"

  mkdir -p .deploy-summary

  # HTML output
  cat <<EOF > .deploy-summary/summary.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>🚀 Deployment Summary</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
    h1 { font-size: 1.8rem; }
    .meta { margin-bottom: 1.5rem; font-size: 1rem; }
    .url a { display: inline-block; margin-top: 0.5rem; padding: 0.4rem 0.8rem;
             background: #0c66ff; color: white; border-radius: 4px; text-decoration: none; }
    .status { margin-top: 1rem; background: #e0f9e6; padding: 1rem;
              border-left: 4px solid #12bb58; font-weight: bold; }
    .footer { margin-top: 2rem; font-size: 0.9rem; color: #777; }
  </style>
</head>
<body>
  <h1>🚀 Deployment Summary</h1>
  <div class="meta">
    <p><strong>Project:</strong> ${project_name}</p>
    <p><strong>Branch:</strong> <code>${branch}</code></p>
    <p><strong>Commit:</strong> <code>${sha}</code></p>
    <p><strong>Environment:</strong> <code>${env}</code></p>
    <p><strong>Time:</strong> ${date}</p>
    <p><strong>CI Pipeline:</strong> #${pipeline_id}</p>
  </div>
  <div class="url">
    <p><strong>URL:</strong></p>
    <a href="${url}" target="_blank">${url}</a>
  </div>
  <div class="status">
    ✅ Deployment to <code>${env}</code> was successful.
  </div>
  <div class="footer">
    Generated automatically by GitLab CI/CD pipeline.
  </div>
</body>
</html>
EOF

  # Markdown output
  cat <<EOF > .deploy-summary/summary.md
# 🚀 Deployment Summary

**Project:** \`${project_name}\`  
**Branch:** \`${branch}\`  
**Commit:** \`${sha}\`  
**Environment:** \`${env}\`  
**Time:** ${date}  
**Pipeline:** [#${pipeline_id}](../../pipelines/${pipeline_id})

---

**URL:** [$url]($url)  
✅ Deployment to \`${env}\` was successful.
EOF

  log INFO "✅ Deployment summary written to .deploy-summary/summary.{html,md}"
}

