# @/lint Phase 9 — Port Git, Paths, and Lockfile Rules from Shell Scripts

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 5 rules from `check.git.sh`, `check.paths.sh`, and `check.pnpm-lock.sh` to TypeScript workspace rules: git repo check, empty directories, lockfile existence/validity, no local links, no unpinned git deps.
**Architecture**: All 5 are WorkspaceRules with `scope: 'workspace'`. Rules 1, 3, 4, 5 use `ctx.fileExists`/`ctx.readFile`. Rule 2 uses direct `node:fs` to find empty directories (since `allFiles()` only returns files).
**Skipped**: `check::lockfile_consistency` — runs `pnpm install --frozen-lockfile`, a runtime CI check not a static lint rule.

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
| Tests | 2507 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 7 (no-crlf, no-empty-files, no-merge-conflicts, workspace-valid, no-untracked-artifacts, no-broken-symlinks, no-leftover-sqlite) |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — New Rule: `workspace/require-git-repo`

### Task 1.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/require-git-repo.ts`. `fixable: false` (line 21), `scope: 'workspace'` (line 18), severity `error` (line 58). 4 tests. 2511 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `reports error when .git directory is missing` — mock no `.git` path, override `dirExists`/`fileExists` to return false for `.git`, expect 1 result with severity `error`
  - `passes when .git directory exists` — override `dirExists` to return true for `.git`, expect 0 results
  - `passes when .git is a file (worktree)` — override `fileExists` to return true for `.git`, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-missing-git.ts` (id: `workspace/require-git-repo`):
  - Check `ctx.dirExists(join(ctx.rootDir, '.git'))` OR `ctx.fileExists(join(ctx.rootDir, '.git'))`
  - If neither exists: error `Missing .git — project is not under Git version control`
  - Tip: `Run 'git init' in the root directory`
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/require-git-repo.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — New Rule: `workspace/no-empty-directories`

### Task 2.1: Tests + Implementation

**Status**: [ ]

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `has correct rule metadata` — check id, scope, fixable
  - `returns empty when no directories found` — mock context with files only, expect 0 results
  - Note: Full integration test requires real filesystem. We test metadata and guard paths.
- Create `rules/workspace/no-empty-directories.ts`:
  - Uses direct `node:fs` (`readdir`) to recursively walk directories from `ctx.rootDir`
  - Skips: `node_modules`, `.git`, `dist`, `build`, `.svelte-kit`, `.turbo`, `coverage`, `.next`, `.cache`
  - For each directory: check if it contains any files (not just subdirs)
  - If empty AND no `.gitkeep` file: warning `Empty directory missing .gitkeep: ${dir}`
  - Tip: `Add a .gitkeep file to preserve empty directories in Git`
  - Severity: `warning`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-empty-directories.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — New Rule: `workspace/require-lockfile`

### Task 3.1: Tests + Implementation

**Status**: [ ]

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `reports error when pnpm-lock.yaml is missing` — mock no lockfile, expect 1 result with severity `error`
  - `reports error when lockfile is empty` — mock empty content, expect 1 result
  - `reports error when lockfile has no lockfileVersion` — mock content without `lockfileVersion`, expect 1 result
  - `passes for valid lockfile` — mock content with `lockfileVersion:`, expect 0 results
  - `has correct rule metadata`
- Create `rules/workspace/require-lockfile.ts`:
  - Check `ctx.fileExists(join(ctx.rootDir, 'pnpm-lock.yaml'))`
  - If missing: error `Missing pnpm-lock.yaml — required for deterministic installs`
  - If exists: read content, check for `lockfileVersion` key
  - If empty or missing key: error `pnpm-lock.yaml appears malformed — missing lockfileVersion`
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/require-lockfile.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — New Rule: `workspace/no-lockfile-local-links`

### Task 4.1: Tests + Implementation

**Status**: [ ]

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags file: dependency in lockfile` — mock lockfile with `file:../lib` content, expect 1 result
  - `flags link: dependency in lockfile` — mock lockfile with `link:../utils` content, expect 1 result
  - `ignores clean lockfile` — mock lockfile without file:/link:, expect 0 results
  - `returns empty when lockfile missing` — no lockfile file, expect 0 results (skip gracefully)
  - `has correct rule metadata`
- Create `rules/workspace/no-lockfile-local-links.ts`:
  - Check `ctx.fileExists(join(ctx.rootDir, 'pnpm-lock.yaml'))` — return early if missing
  - Read content, scan lines for `file:` or `link:` patterns
  - Report each match with line number
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-lockfile-local-links.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — New Rule: `workspace/no-unpinned-git-deps`

### Task 5.1: Tests + Implementation

**Status**: [ ]

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags github.com dep with #main` — mock lockfile with `github.com/org/repo#main`, expect 1 result
  - `flags github.com dep with #master` — mock with `#master`, expect 1 result
  - `flags github.com dep with #next` — mock with `#next`, expect 1 result
  - `ignores github.com dep with SHA` — mock with `#a1b2c3d4e5f6`, expect 0 results
  - `returns empty when lockfile missing` — expect 0 results
  - `has correct rule metadata`
- Create `rules/workspace/no-unpinned-git-deps.ts`:
  - Check `ctx.fileExists(join(ctx.rootDir, 'pnpm-lock.yaml'))` — return early if missing
  - Read content, scan lines for `github.com.*#(main|master|next|canary|dev|develop)`
  - Report each match with line number
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-unpinned-git-deps.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — Register New Rules in Config

### Task 6.1: Add rules to .resist-lint.jsonc

**Status**: [ ]

**Plan**:
- Add to `.resist-lint.jsonc` under `"rules"`:
  ```jsonc
  "workspace/require-git-repo": "error",
  "workspace/no-empty-directories": "warn",
  "workspace/require-lockfile": "error",
  "workspace/no-lockfile-local-links": "error",
  "workspace/no-unpinned-git-deps": "error",
  ```
- Run QA to verify no regressions

**Files**: `.resist-lint.jsonc`

**Verification**: `pnpm --filter @/lint qa:type-check && pnpm -w run qa:test`

---

## TASK 7 — Full QA Pass

### Task 7.1: Run complete QA suite

**Status**: [ ]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:test`
- Fix any failures

**Verification**: All QA commands exit 0 for @/lint scope

### Task 7.2: Verify test coverage thresholds

**Status**: [ ]

**Plan**:
- Run: `pnpm --filter @/lint qa:test:coverage`
- Check thresholds: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%
- Check test count is at or above baseline (2507)

**Verification**: Coverage command exits 0, all thresholds met

---

## TASK 8 — Final Verification

### Task 8.1: Verify all changes against approved changelog

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
| 1.1 | require-git-repo (tests + impl) | — |
| 2.1 | no-empty-directories (tests + impl) | — |
| 3.1 | require-lockfile (tests + impl) | — |
| 4.1 | no-lockfile-local-links (tests + impl) | — |
| 5.1 | no-unpinned-git-deps (tests + impl) | — |
| 6.1 | Register rules in config | 1-5 |
| 7.1 | Full QA pass | 6.1 |
| 7.2 | Coverage verification | 7.1 |
| 8.1 | Final verification | 7.2 |
