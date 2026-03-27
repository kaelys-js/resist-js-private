# @/lint Phase 10 — Port pnpm-workspace.yaml Validation Rules from Shell Scripts

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 9 rules from `check.pnpm-workspace.sh` to TypeScript workspace rules: glob validation (absolute, trailing slash, duplicates, test dirs, node_modules), schema declaration, and glob resolution checks.
**Architecture**: All 9 are WorkspaceRules with `scope: 'workspace'`. Rules 1-6 are pure text analysis of `pnpm-workspace.yaml`. Rules 7-9 parse globs, strip wildcards, and use `ctx.dirExists`/`ctx.getWorkspacePackages()` to verify base directories exist.
**Skipped**: `pnpm_workspace_file_present`, `pnpm_workspace_structure`, `pnpm_workspace_yaml_valid` (covered by `workspace/workspace-valid`), `pnpm_lockfile_validity` (covered by `workspace/require-lockfile`), `pnpm_workspace_glob_duplicates` (duplicate of `pnpm_workspace_no_duplicate_globs`).

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 2529 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 12 (no-crlf, no-empty-files, no-merge-conflicts, workspace-valid, no-untracked-artifacts, no-broken-symlinks, no-leftover-sqlite, require-git-repo, no-empty-directories, require-lockfile, no-lockfile-local-links, no-unpinned-git-deps) |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — New Rule: `workspace/no-absolute-workspace-globs`

### Task 1.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-absolute-workspace-globs.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. 4 tests. 2541 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags absolute glob starting with /` — mock workspace with `/apps/*`, expect 1 result with severity `error`
  - `passes for relative globs` — mock workspace with `packages/*`, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/no-absolute-workspace-globs.ts`:
  - Read `pnpm-workspace.yaml`, parse `packages:` entries
  - Flag any entry starting with `/`
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-absolute-workspace-globs.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — New Rule: `workspace/no-trailing-slash-globs`

### Task 2.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-trailing-slash-globs.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. 4 tests. 2541 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags glob ending with /` — mock workspace with `packages/*/`, expect 1 result with severity `error`
  - `passes for globs without trailing slash` — mock workspace with `packages/*`, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/no-trailing-slash-globs.ts`:
  - Read `pnpm-workspace.yaml`, parse `packages:` entries
  - Flag any entry ending with `/`
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-trailing-slash-globs.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — New Rule: `workspace/no-duplicate-workspace-globs`

### Task 3.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-duplicate-workspace-globs.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. 4 tests. 2541 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags duplicate glob entries` — mock workspace with `packages/*` twice, expect 1 result with severity `error`
  - `passes for unique globs` — mock workspace with `packages/*` and `apps/*`, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/no-duplicate-workspace-globs.ts`:
  - Read `pnpm-workspace.yaml`, parse `packages:` entries
  - Track seen entries, flag duplicates
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-duplicate-workspace-globs.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — New Rule: `workspace/no-test-dir-workspace-globs`

### Task 4.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-test-dir-workspace-globs.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. 4 tests. 2554 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags glob containing test/` — mock workspace with `test/*`, expect 1 result
  - `flags glob containing fixtures/` — mock workspace with `packages/fixtures/*`, expect 1 result
  - `passes for normal package globs` — mock workspace with `packages/*`, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/no-test-dir-workspace-globs.ts`:
  - Read `pnpm-workspace.yaml`, parse `packages:` entries
  - Flag any entry matching `(^|/)(test|tests|fixtures|examples)(/|$)`
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-test-dir-workspace-globs.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — New Rule: `workspace/no-node-modules-workspace-globs`

### Task 5.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-node-modules-workspace-globs.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. 4 tests. 2554 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags glob containing node_modules` — mock workspace with `apps/**/node_modules/*`, expect 1 result
  - `passes for clean globs` — mock workspace with `packages/*`, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/no-node-modules-workspace-globs.ts`:
  - Read `pnpm-workspace.yaml`, parse `packages:` entries
  - Flag any entry containing `node_modules`
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-node-modules-workspace-globs.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — New Rule: `workspace/require-workspace-schema`

### Task 6.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/require-workspace-schema.ts`. `fixable: false`, `scope: 'workspace'`, severity `warning`. 4 tests. 2554 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags missing schema comment` — mock workspace without schema line, expect 1 result with severity `warning`
  - `passes when schema comment present` — mock workspace with `# yaml-language-server: $schema=` line, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/require-workspace-schema.ts`:
  - Read `pnpm-workspace.yaml`, check for `# yaml-language-server: $schema=` line
  - Severity: `warning`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/require-workspace-schema.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — New Rule: `workspace/workspace-globs-resolve`

### Task 7.1: Tests + Implementation

**Status**: [ ]

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags glob whose base directory does not exist` — mock workspace with `nonexistent/*`, override dirExists to return false for `nonexistent`, expect 1 result
  - `passes when base directory exists` — mock workspace with `packages/*`, override dirExists to return true for `packages`, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/workspace-globs-resolve.ts`:
  - Read `pnpm-workspace.yaml`, parse `packages:` entries
  - For each glob, strip trailing `/*` or `/**` to get base directory
  - Check `ctx.dirExists(join(ctx.rootDir, baseDir))`
  - If base directory doesn't exist: error
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/workspace-globs-resolve.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 8 — New Rule: `workspace/workspace-packages-exist`

### Task 8.1: Tests + Implementation

**Status**: [ ]

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags glob with no matching packages` — mock workspace with `empty/*`, mock getWorkspacePackages returning packages under `packages/`, expect 1 result
  - `passes when packages match glob` — mock workspace with `packages/*`, mock getWorkspacePackages returning package under `packages/lib`, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/workspace-packages-exist.ts`:
  - Read `pnpm-workspace.yaml`, parse `packages:` entries
  - Get workspace packages via `ctx.getWorkspacePackages()`
  - For each glob, strip `/*` to get prefix, check if any package dir starts with that prefix
  - If no packages match: error
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/workspace-packages-exist.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 9 — New Rule: `workspace/workspace-paths-exist`

### Task 9.1: Tests + Implementation

**Status**: [ ]

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `flags glob whose parent directory does not exist` — mock workspace with `missing/*`, override dirExists to return false for `missing`, expect 1 result
  - `passes when parent directory exists` — mock workspace with `packages/*`, override dirExists to return true for `packages`, expect 0 results
  - `returns empty when workspace file missing` — no file, expect 0 results
- Create `rules/workspace/workspace-paths-exist.ts`:
  - Read `pnpm-workspace.yaml`, parse `packages:` entries
  - For each glob, strip wildcard suffix to get parent directory
  - Check `ctx.dirExists(join(ctx.rootDir, parentDir))`
  - If parent doesn't exist: error
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'pnpm']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/workspace-paths-exist.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 10 — Register New Rules in Config

### Task 10.1: Add rules to .resist-lint.jsonc

**Status**: [ ]

**Plan**:
- Add to `.resist-lint.jsonc` under `"rules"`:
  ```jsonc
  "workspace/no-absolute-workspace-globs": "error",
  "workspace/no-duplicate-workspace-globs": "error",
  "workspace/no-node-modules-workspace-globs": "error",
  "workspace/no-test-dir-workspace-globs": "error",
  "workspace/no-trailing-slash-globs": "error",
  "workspace/require-workspace-schema": "warn",
  "workspace/workspace-globs-resolve": "error",
  "workspace/workspace-packages-exist": "error",
  "workspace/workspace-paths-exist": "error",
  ```
- Run QA to verify no regressions

**Files**: `.resist-lint.jsonc`

**Verification**: `pnpm --filter @/lint qa:type-check && pnpm -w run qa:test`

---

## TASK 11 — Full QA Pass

### Task 11.1: Run complete QA suite

**Status**: [ ]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:test`
- Fix any failures

**Verification**: All QA commands exit 0 for @/lint scope

### Task 11.2: Verify test coverage thresholds

**Status**: [ ]

**Plan**:
- Run: `pnpm --filter @/lint qa:test:coverage`
- Check thresholds: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%
- Check test count is at or above baseline (2529)

**Verification**: Coverage command exits 0, all thresholds met

---

## TASK 12 — Final Verification

### Task 12.1: Verify all changes against approved changelog

**Status**: [ ]

**Plan**:
- Verify each new rule exists, has `fixable: false`, correct severity
- Verify each new rule has tests
- Verify each new rule is registered in `.resist-lint.jsonc`
- Run final QA
- Fix any issues found during verification

**Verification**: All tests pass, all changelog items verified

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1.1 | no-absolute-workspace-globs (tests + impl) | — |
| 2.1 | no-trailing-slash-globs (tests + impl) | — |
| 3.1 | no-duplicate-workspace-globs (tests + impl) | — |
| 4.1 | no-test-dir-workspace-globs (tests + impl) | — |
| 5.1 | no-node-modules-workspace-globs (tests + impl) | — |
| 6.1 | require-workspace-schema (tests + impl) | — |
| 7.1 | workspace-globs-resolve (tests + impl) | — |
| 8.1 | workspace-packages-exist (tests + impl) | — |
| 9.1 | workspace-paths-exist (tests + impl) | — |
| 10.1 | Register rules in config | 1-9 |
| 11.1 | Full QA pass | 10.1 |
| 11.2 | Coverage verification | 11.1 |
| 12.1 | Final verification | 11.2 |
