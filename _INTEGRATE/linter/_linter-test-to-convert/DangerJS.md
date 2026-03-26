# Files you want to protect
PROTECTED_FILES="package.json .editorconfig .gitignore bunfig.toml biome.json .vscode/settings.json"

for file in $PROTECTED_FILES; do
  if git diff --cached --name-status | grep -E "^[AMDR].*\s+$file"; then
    echo "❌ ERROR: You modified or staged changes to a protected file: $file"
    echo "🔒 These files must only be modified via approved workflows."
    exit 1
  fi
done

if git diff --cached --name-only | grep -q 'bun.lockb'; then
  echo "🧶 bun.lockb modified — make sure 'bun install' was run."
fi

MAXSIZE=1048576
if git diff --cached --name-only | while read file; do
  if [ -f "$file" ] && [ $(stat -c%s "$file") -gt $MAXSIZE ]; then
    echo "❌ File $file exceeds 1MB."
    exit 1
  fi
done; then
  exit 1
fi

if git diff --cached | grep -E 'console\.log|debugger|TODO:'; then
  echo "⚠️ Debugging code or TODO found in commit."
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
  echo "🚫 You are committing directly to main! Use a feature branch."
  exit 1
fi

bun install --check || {
  echo "🛑 bun.lockb is out of sync with package.json. Run bun install.";
  exit 1;
}

git diff --cached --name-only | grep -E '\.(js|d.ts|map)$' | grep -v '^dist/' && {
  echo "🚫 Do not commit built files (js, d.ts, map). Use build output only in CI.";
  exit 1;
}

[ "$(git diff --cached --numstat | wc -l)" -gt 100 ] && {
  echo "🚫 Too many files changed. Break into smaller commits.";
  exit 1;
}

git diff --cached --name-only | grep -E '\.(mp4|mov|avi|exe|pdf)$' && {
  echo "🚫 Do not commit binary files.";
  exit 1;
}

git log origin/main..HEAD --oneline | grep "Merge" && {
  echo "🚫 Merge commits are not allowed. Rebase instead.";
  exit 1;
}

git diff --cached | grep -i 'TODO\|FIXME' && {
  echo "🚫 TODO/FIXME found in commit.";
  exit 1;
}

NEW_ROOT_ITEMS=$(git diff --cached --name-only | grep -E '^[^/]+/' | cut -d/ -f1 | sort -u)
for ITEM in $NEW_ROOT_ITEMS; do
  if ! grep -q "$ITEM" .gitallowedroots; then
    echo "🚫 Root-level item '$ITEM' is not allowed. Add it to .gitallowedroots if needed.";
    exit 1
  fi
done

git diff --cached --name-only | grep -q '__snapshots__' && ! git diff --cached --name-only | grep -q '\.ts$' && {
  echo "🚨 Snapshot updated without test/code change.";
  exit 1;
}

bun run schema:diff || {
  echo "🛑 DB schema drift detected.";
  exit 1;
}

[[ $(git diff --cached --name-only) =~ "CHANGELOG.md" ]] || {
  echo "🚫 CHANGELOG.md missing for release.";
  exit 1;
}

if ! bunx case-police; then
  echo "🚫 File casing mismatch detected.";
  exit 1;
fi


BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

if ! echo "$BRANCH_NAME" | grep -Eq '^(feature|bugfix|hotfix|chore|release)/[a-z0-9._-]+$'; then
  echo "🚫 Branch name '$BRANCH_NAME' is invalid."
  echo "✅ Expected format: feature/your-branch-name"
  exit 1
fi

# Detect added files/directories at the repo root
if git diff --cached --name-status | grep -E "^[AM].*\s+[^/]+$"; then
  echo "❌ ERROR: You added files/folders to the monorepo root."
  echo "🛠 Please move them into an appropriate workspace (apps/, packages/, etc)."
  exit 1
fi

if echo "$BRANCH_NAME" | grep -Eq '^(main|master|staging|prod)$'; then
  echo "🚫 Direct pushes to '$BRANCH_NAME' are forbidden. Use PRs.";
  exit 1
fi

if git diff --cached --name-only | grep -Eq '^(bunfig\.toml|\.env|\.editorconfig|README\.md|package\.json|tsconfig\.json)$'; then
  echo "🚫 Direct modification of core config files is restricted. Use pull requests with review."
  exit 1
fi

if git diff --cached --name-only --diff-filter=A | grep -Eq '^[^/]+/$'; then
  echo "🚫 Adding new top-level folders is restricted. Use apps/, packages/, or libs/"
  exit 1
fi

if git diff --cached --name-only | grep -E '[A-Z]{2,}' >/dev/null; then
  echo "🚫 Uppercase naming detected. Use kebab-case for files/folders."
  exit 1
fi

bun run ts-transformer:validate || {
  echo "🚫 Transformer validation failed. Fix before committing.";
  exit 1;
}

bun run validate-env || {
  echo "🚫 .env file is invalid against schema.";
  exit 1;
}

if git diff --cached | grep -E '\.(only|skip)\('; then
  echo "🚫 Found .only/.skip in test files. Remove them before committing.";
  exit 1;
fi

if git diff --cached bun.lockb | grep -vE '^@@|^index|^diff'; then
  echo "🚫 Direct edit of bun.lockb detected. Use \`bun install\` instead.";
  exit 1;
fi

protected_keys='scripts.build|scripts.deploy|license|type'

FILES=$(git diff --cached --name-only | grep 'package.json$' || true)

for file in $FILES; do
  if git diff --cached "$file" | grep -qE "\"($protected_keys)\""; then
    echo "🚫 Protected key modification in $file: scripts.build, scripts.deploy, license, or type."
    exit 1
  fi
done

BASE_CONFIG="./shared/config/lint/biome/biome.json"
MISSING=()

for dir in apps/* packages/* libs/*; do
  [ -d "$dir" ] || continue
  if [ ! -f "$dir/biome.json" ]; then
    MISSING+=("$dir")
    continue
  fi
  if ! grep -q "$BASE_CONFIG" "$dir/biome.json"; then
    echo "🚫 $dir/biome.json does not extend the base config."
    exit 1
  fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
  echo "🚫 Missing biome.json in:"
  for d in "${MISSING[@]}"; do echo "  - $d"; done
  exit 1
fi

madge --circular --extensions ts ./packages || {
  echo "🚫 Circular dependencies detected!";
  exit 1
}

if ! bunx c8 --check-coverage ...; then
  echo "🚫 Coverage threshold not met";
  exit 1;
fi

if (current.ops / baseline.ops < 0.9) {
  console.error(`🚫 Regression in ${bench.name}`);
  process.exit(1);
}

FILES=$(git diff --cached --name-only)

if echo "$FILES" | grep -q "^docs/" && echo "$FILES" | grep -q "^src/"; then
  echo "🚫 Docs and code must be updated in separate commits or branches."
  exit 1
fi

if git diff --cached --name-only | grep -q "^docs/en/" &&
   ! git diff --cached --name-only | grep -q "^docs/.*\.translated"; then
  echo "🚫 English docs were updated, but translations were not."
  exit 1
fi

if git diff --cached --name-only | grep -q "^src/" &&
   ! git diff --cached --name-only | grep -Eq "CHANGELOG.md|docs/"; then
  echo "🚫 Code changed without changelog or documentation update."
  exit 1
fi

cspell "**/*.md" || exit 1
markdown-link-check README.md || exit 1

git diff --cached tsconfig.base.json && echo "Don't modify this!" && exit 1

find src -name '*.ts' | while read src; do
  test_file=$(echo "$src" | sed 's|src|__tests__|' | sed 's|.ts$|.test.ts|')
  [ -f "$test_file" ] || echo "❌ Missing test: $test_file"
done

check_schema_drift() {
  echo "🔍 Checking for schema drift..."

  if [ ! -f ".schema.snapshot.json" ]; then
    echo "⚠️ No schema snapshot found. Run: bun run update:schema"
    return
  fi

  ACTUAL=$(bun --silent <<'EOF'
    import { schema } from "./src/schema.ts";
    import { writeFileSync } from "fs";

    const json = JSON.stringify(schema.toJSON?.() || schema, null, 2);
    console.log(json);
EOF
  )

  DIFF=$(diff -u <(echo "$ACTUAL") .schema.snapshot.json)
  if [ "$DIFF" ]; then
    echo "🚫 Schema drift detected:"
    echo "$DIFF"
    echo "💡 If intentional, run: bun run update:schema"
    exit 1
  else
    echo "✅ No schema drift."
  fi
}

check_source_map_stacktrace() {
  echo "🔍 Verifying source map stack trace..."

  TMP_FILE=$(mktemp)
  cat <<'EOF' > "$TMP_FILE"
    import { join } from 'path';

    function throwError() {
      throw new Error("Test Source Map Error");
    }

    try {
      throwError();
    } catch (err) {
      const lines = err.stack?.toString().split("\n") || [];
      const mapped = lines.find((l) => l.includes(".ts") && !l.includes("node_modules"));
      if (!mapped) {
        console.error("🚫 Stack trace did not map back to .ts source.");
        process.exit(1);
      } else {
        console.log("✅ Stack trace maps correctly:", mapped.trim());
      }
    }
EOF

  bun --enable-source-maps "$TMP_FILE" || exit 1
  rm -f "$TMP_FILE"
}

# Prevent direct RFC commits outside PR flow
if git diff --cached --name-only | grep -qE '^rfcs/.*\.md'; then
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$branch" == "main" || "$branch" == "master" ]]; then
    echo "🚫 Do not push RFCs directly to $branch. Use a PR."
    exit 1
  fi
fi

rfcrc_path="./shared/schemas/rfcrc/.rfcrc"
tmp_rfc_check="$(mktemp)"

# Ensure yq and jq are available
command -v yq >/dev/null || { echo "❌ 'yq' is required"; exit 1; }
command -v jq >/dev/null || { echo "❌ 'jq' is required"; exit 1; }

# Load .rfcrc
rfcrc=$(yq -o=json eval "$rfcrc_path")
RFC_DIR=$(echo "$rfcrc" | jq -r '.rfcDirectory')
FILENAME_REGEX=$(echo "$rfcrc" | jq -r '.enforceFilenameFormat')
REQUIRED_FIELDS=($(echo "$rfcrc" | jq -r '.requiredFields[]'))
REQUIRED_SECTIONS=($(echo "$rfcrc" | jq -r '.blockMissingSections[]'))
STATUS_ENUM=($(echo "$rfcrc" | jq -r '.statusEnum[]'))
TAG_PREFIXES=($(echo "$rfcrc" | jq -r '.tagPrefixAllowed[]'))

# Get changed files
changed_files=$(git diff --cached --name-only --diff-filter=AM | grep "^$RFC_DIR/.*\.md$" || true)
if [ -z "$changed_files" ]; then
  exit 0
fi

echo "🔍 Validating RFCs against .rfcrc..."

error=0
for file in $changed_files; do
  echo "→ Checking $file"

  # Validate filename
  if ! [[ "$file" =~ ^$RFC_DIR/[0-9]{4}-[0-9]{2}-[0-9]{2}-.+\.md$ ]]; then
    echo "  ❌ Filename does not match required format ($FILENAME_REGEX)"
    error=1
  fi

  # Extract frontmatter
  frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')
  if [ -z "$frontmatter" ]; then
    echo "  ❌ Missing frontmatter block"
    error=1
    continue
  fi

  # Save to tmp for validation
  echo "$frontmatter" > "$tmp_rfc_check"

  # Validate YAML syntax
  if ! yq eval "$tmp_rfc_check" >/dev/null 2>&1; then
    echo "  ❌ Invalid frontmatter YAML"
    error=1
    continue
  fi

  # Check required fields
  for field in "${REQUIRED_FIELDS[@]}"; do
    if ! yq eval ".$field" "$tmp_rfc_check" | grep -qv 'null'; then
      echo "  ❌ Missing required frontmatter field: $field"
      error=1
    fi
  done

  # Check status value
  status=$(yq eval ".status" "$tmp_rfc_check")
  if [[ ! " ${STATUS_ENUM[*]} " =~ " $status " ]]; then
    echo "  ❌ Invalid status: $status (allowed: ${STATUS_ENUM[*]})"
    error=1
  fi

  # Check tags prefixes
  tags=($(yq eval '.tags[]' "$tmp_rfc_check" 2>/dev/null || echo ""))
  for tag in "${tags[@]}"; do
    if [[ ! " ${TAG_PREFIXES[*]} " =~ "$(echo "$tag" | grep -o '^[^:]*:')" ]]; then
      echo "  ❌ Invalid tag prefix: $tag"
      error=1
    fi
  done

  # Check required sections exist
  for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -q "^## $section" "$file"; then
      echo "  ❌ Missing required section: ## $section"
      error=1
    fi
  done
done

rm -f "$tmp_rfc_check"

if [ "$error" -eq 1 ]; then
  echo "🚫 One or more RFC files failed validation. Push aborted."
  exit 1
fi

echo "✅ RFC validation passed."
exit 0