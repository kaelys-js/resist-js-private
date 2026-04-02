# @/lint Phase 48 — Configuration Sync Validation Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Implement 7 workspace rules that validate configuration files stay in sync across the monorepo — turbo tasks, tsconfig paths, lefthook scripts, onboarding steps, workflow scripts, filter patterns, and pnpm workspace patterns.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`, `fileExists()`, `dirExists()`, `getWorkspacePackages()`).

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
| Tests | 4831 total |
| Sync rules | 0 |

---

## TASK 1 — sync/turbo-tasks

**Status**: [x]

**Gap**: No rule validates that turbo task references in package.json scripts actually exist in turbo.json.

**Plan**:
- Parse root package.json scripts for `turbo <task>` invocations
- Extract task names from turbo commands
- Cross-reference against turbo.json tasks keys
- Error when a referenced task doesn't exist
- Write tests: valid refs pass, missing task errors, no turbo calls passes

**Files**:
- Create: `src/rules/workspace/sync-turbo-tasks.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, lint passes

---

## TASK 2 — sync/tsconfig-paths

**Status**: [x]

**Gap**: No rule validates that tsconfig path alias targets point to existing files.

**Plan**:
- Parse root tsconfig.json paths entries
- For each alias, resolve target path(s) relative to repo root
- Skip wildcard-only targets (globs can't be statically verified)
- Error when a non-wildcard target file/dir doesn't exist
- Write tests: valid paths pass, missing target errors, wildcard skipped

**Files**:
- Create: `src/rules/workspace/sync-tsconfig-paths.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, lint passes

---

## TASK 3 — sync/lefthook-scripts

**Status**: [x]

**Gap**: No rule validates that pnpm commands in lefthook config reference valid package.json scripts.

**Plan**:
- Search for lefthook.yml, lefthook.yaml, or packages/shared/config/lefthook/base.yml
- Parse YAML for command `run:` fields containing `pnpm` commands
- Extract script names from `pnpm run X` or `pnpm X` patterns
- Cross-reference against root package.json scripts
- Return empty if no lefthook config found
- Write tests: valid scripts pass, missing script errors, no config returns empty

**Files**:
- Create: `src/rules/workspace/sync-lefthook-scripts.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, lint passes

---

## TASK 4 — sync/onboarding-steps

**Status**: [x]

**Gap**: No rule validates that onboarding steps reference valid package.json scripts.

**Plan**:
- Search for resist.config.ts at repo root
- Parse for tooling.onboarding.steps array (regex extraction from TS source)
- Cross-reference each step against root package.json scripts
- Return empty if no resist.config.ts found
- Write tests: valid steps pass, missing step errors, no config returns empty

**Files**:
- Create: `src/rules/workspace/sync-onboarding-steps.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, lint passes

---

## TASK 5 — sync/workflow-scripts

**Status**: [x]

**Gap**: No rule validates that pnpm commands in GitHub workflows reference valid package.json scripts.

**Plan**:
- Scan .github/workflows/*.yml files
- Parse YAML for `run:` steps containing `pnpm` commands
- Extract script names from `pnpm run X` or `pnpm X` patterns
- Cross-reference against root package.json scripts
- Return empty if no .github/workflows/ directory
- Write tests: valid scripts pass, missing script errors, no workflows returns empty

**Files**:
- Create: `src/rules/workspace/sync-workflow-scripts.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, lint passes

---

## TASK 6 — sync/filter-patterns

**Status**: [x]

**Gap**: No rule validates that --filter= patterns in scripts reference existing paths.

**Plan**:
- Parse root package.json scripts for --filter= or --filter patterns
- Extract path portion (strip ! negation, strip quotes)
- For literal paths (not globs), verify they exist on disk
- Error on missing paths
- Write tests: valid paths pass, missing path errors, glob patterns skipped

**Files**:
- Create: `src/rules/workspace/sync-filter-patterns.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, lint passes

---

## TASK 7 — sync/pnpm-workspace

**Status**: [x]

**Gap**: No rule validates that pnpm-workspace.yaml patterns match actual directories.

**Plan**:
- Parse pnpm-workspace.yaml packages patterns
- For non-glob patterns, verify directory exists
- For glob patterns, verify at least one directory matches
- Warning severity
- Write tests: valid patterns pass, no-match warns, missing file returns empty

**Files**:
- Create: `src/rules/workspace/sync-pnpm-workspace.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, lint passes

---

## TASK 8 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add all 7 rules to `.resist-lint.jsonc`:
  - `sync/turbo-tasks`: `"error"`
  - `sync/tsconfig-paths`: `"error"`
  - `sync/lefthook-scripts`: `"error"`
  - `sync/onboarding-steps`: `"error"`
  - `sync/workflow-scripts`: `"error"`
  - `sync/filter-patterns`: `"error"`
  - `sync/pnpm-workspace`: `"warn"`

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All rules appear in config

---

## TASK 9 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 10 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 7 rule files exist
- Verify all 7 rules registered in `.resist-lint.jsonc`
- Verify test count ≥ 4831 + new tests
- Commit with descriptive message

**Verification**:
- All 7 `.ts` files exist in `src/rules/workspace/`
- All 7 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | sync/turbo-tasks | — |
| 2 | sync/tsconfig-paths | — |
| 3 | sync/lefthook-scripts | — |
| 4 | sync/onboarding-steps | — |
| 5 | sync/workflow-scripts | — |
| 6 | sync/filter-patterns | — |
| 7 | sync/pnpm-workspace | — |
| 8 | Register rules in config | 1-7 |
| 9 | Full QA + Coverage | 8 |
| 10 | Final verification + commit | 9 |
