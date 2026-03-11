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
