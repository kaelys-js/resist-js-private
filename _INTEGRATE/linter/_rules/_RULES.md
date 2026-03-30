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

--

# Lint Rules: Configuration Sync Validation

Category for the future linting tool that validates configuration files stay in sync across the monorepo.

## Rules Overview

| Rule ID | Description | Severity |
|---------|-------------|----------|
| `sync/turbo-tasks` | Turbo task references must exist | error |
| `sync/tsconfig-paths` | TSConfig path aliases must point to existing files | error |
| `sync/lefthook-scripts` | Lefthook pnpm commands must reference valid scripts | error |
| `sync/onboarding-steps` | Onboarding steps must be valid package.json scripts | error |
| `sync/workflow-scripts` | GitHub workflow pnpm commands must be valid scripts | error |
| `sync/filter-patterns` | Turbo/pnpm filter patterns must match folder structure | error |
| `sync/pnpm-workspace` | pnpm-workspace.yaml patterns must match actual packages | warning |

## Rule Definitions

### sync/turbo-tasks

**Purpose:** Ensure every `turbo X` call in package.json scripts references a task that exists in turbo.json.

**Files checked:**
- `package.json` scripts → `turbo.json` tasks

**Example violations:**
```json
// package.json
"ci": "turbo qa:checks ..."  // ❌ if qa:checks not in turbo.json tasks
```

**Fix:** Add missing task to turbo.json or correct the script name.

---

### sync/tsconfig-paths

**Purpose:** Ensure every path alias in tsconfig `paths` points to an existing file or directory.

**Files checked:**
- `tsconfig.json` or `packages/shared/config/tsconfig/base.json` paths

**Example violations:**
```json
// tsconfig.json
"paths": {
  "@/utils": ["./packages/shared/utils/src/index.ts"]  // ❌ if file doesn't exist
}
```

**Fix:** Update path alias to correct location or create the missing file.

---

### sync/lefthook-scripts

**Purpose:** Ensure every `pnpm X` command in lefthook.yml references a script that exists in package.json.

**Files checked:**
- `lefthook.yml` or `packages/shared/config/lefthook/base.yml` → `package.json` scripts

**Example violations:**
```yaml
# lefthook.yml
commit-msg:
  commands:
    validate:
      run: pnpm lint:commit --edit {1}  # ❌ if lint:commit not in package.json
```

**Fix:** Add missing script to package.json or remove from lefthook.

---

### sync/onboarding-steps

**Purpose:** Ensure every step in `tooling.onboarding.steps` (from resist.config.ts) is a valid package.json script.

**Files checked:**
- `resist.config.ts` tooling.onboarding.steps → `package.json` scripts

**Example violations:**
```typescript
// resist.config.ts
onboarding: {
  steps: ['i', 'setup:vscode', 'nonexistent-script']  // ❌ nonexistent-script
}
```

**Fix:** Remove invalid step or add the script to package.json.

---

### sync/workflow-scripts

**Purpose:** Ensure every `pnpm X` or `run: pnpm X` command in GitHub workflows references a valid package.json script.

**Files checked:**
- `.github/workflows/*.yml` → `package.json` scripts

**Example violations:**
```yaml
# .github/workflows/ci.yml
- run: pnpm lint  # ❌ if no 'lint' script exists (maybe it's 'qa:lint')
```

**Fix:** Update workflow to use correct script name.

---

### sync/filter-patterns

**Purpose:** Ensure `--filter=packages/...` patterns in scripts reference paths that exist or are valid globs.

**Files checked:**
- `package.json` scripts with `--filter=` patterns → filesystem

**Example violations:**
```json
// package.json
"dev:admin": "turbo dev --filter=packages/tools/admin --"  // ❌ if path doesn't exist
```

**Fix:** Create the missing package or correct the filter pattern.

---

### sync/pnpm-workspace

**Purpose:** Ensure pnpm-workspace.yaml patterns match actual package locations.

**Files checked:**
- `pnpm-workspace.yaml` packages patterns → filesystem

**Severity:** warning (patterns are globs, may be intentionally broad)

---

## Implementation Notes

### Data Sources

Each rule needs to read from specific files:

```typescript
interface SyncRuleContext {
  // Parsed files
  packageJson: PackageJson;
  turboJson: TurboJson;
  tsconfigBase: TSConfig;
  lefthookBase: LefthookConfig;
  resistConfig: ResistConfig;
  workflowFiles: Map<string, WorkflowConfig>;

  // Filesystem helpers
  fileExists: (path: string) => boolean;
  globMatch: (pattern: string) => string[];
}
```

### Rule Interface

```typescript
interface SyncLintRule {
  id: string;
  severity: 'error' | 'warning';

  // Return violations found
  check(ctx: SyncRuleContext): SyncViolation[];
}

interface SyncViolation {
  rule: string;
  message: string;
  file: string;
  line?: number;
  fix?: string;  // Suggested fix
}
```

### Output Format

```
$ pnpm lint --category sync

sync/turbo-tasks
  ✗ package.json:55 - Script 'ci' references turbo task 'qa:checks' which doesn't exist
  ✗ package.json:56 - Script 'ci:local' references turbo task 'qa:checks' which doesn't exist

sync/lefthook-scripts
  ✗ lefthook.yml:6 - Hook 'commit-msg.validate' references 'pnpm lint:commit' but script doesn't exist

sync/workflow-scripts
  ✗ .github/workflows/ci.yml:33 - Step references 'pnpm lint' but script doesn't exist
  ✗ .github/workflows/ci.yml:34 - Step references 'pnpm format:check' but script doesn't exist

────────────────────────────────────────
5 errors, 0 warnings in category 'sync'
```

## Current Sync Issues Found

These issues exist in the codebase and would be caught by these rules:

### turbo.json.hbs ↔ package.json.hbs

| package.json script | Current turbo task | Should be |
|---------------------|-------------------|-----------|
| `qa:sync-check` | `qa:lint` | `qa:sync-check` |
| `qa:type-check` | `type-check` | `qa:type-check` |
| `qa:test` | `test` | `qa:test` |
| `qa:test:unit` | `test:unit` | `qa:test:unit` |
| `qa:test:e2e` | `test:e2e` | `qa:test:e2e` |
| `qa:test:coverage` | `test:coverage` | `qa:test:coverage` |
| `qa:benchmark` | `bench` | `qa:benchmark` |

### GitHub CI workflow issues

- Uses `pnpm lint` but package.json has no `lint` script
- Uses `pnpm format:check` but package.json has no `format:check` script
- Uses `pnpm type-check` but package.json has `qa:type-check`
- Uses `pnpm test` but package.json has `qa:test`
- Uses `pnpm test:e2e` but package.json has `qa:test:e2e`

### lefthook.yml issues

- `commit-msg.validate` references `pnpm lint:commit` which doesn't exist in package.json

--

API
RevenueCat/LemonSqueezy
Svelte Components
Null
Vitest & Testing & Benchmarkes & Coverage
Commenting
Typescript/Javascript
Capacitor
Electron
Observability
Security
Architecture
Cloudflare Workers
Cloudflare D1 + Drizzle
Cloudflare Queues
Cloduflare Cron Workers
Cloudflare R2
Cloudflare Queues
Tailwind
SVG
SEO
Web Vitals
Structured Data
Sitemaps
HTML
Aria/Accessibility (HTML, Svelte Components, Astro Components)
Protected Files/Paths
Boundaries
Markdown
Mise
Lefthook
.gitlab/.github/docs/.vscode/.devcontainer/.coder: Only allowed filetypes
Playwright
Vitest
pnpm/bun/yarn/node
Handlebars
No vitest.config other than worspace root

...Other categories?

* Commenter (checks)
- When important files or paths are changed
- When dependencies change
- Benchmark regressions
