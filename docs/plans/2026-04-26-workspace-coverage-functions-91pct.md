# Workspace Coverage Threshold Fix — Lift Functions Coverage from 86.19% to ≥91%

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: workspace-wide (`@/cli` excluded permanently from `vitest.config.ts` projects list; thresholds apply to all listed projects)
**Goal**: Make `pnpm -w run qa:test:coverage` exit 0 by lifting workspace-wide functions coverage from 86.19% to at least 91% (closing the 4.82-percentage-point gap → ~198 additional functions covered out of 566 currently uncovered).
**Architecture**: Per-site test additions targeting the highest-leverage uncovered files. Concentrated in `@/lint` (462 of 566 missing functions). No threshold changes — the user explicitly forbids weakening assertions. Tests added under existing `describe(...)` blocks in the corresponding `*-rules.test.ts` (or a new `<rule-id>.test.ts` sibling) to avoid the `oxlint/max-dependencies` cap that triggered the workspace-rules.test.ts split in the prior session.

## Context

`pnpm -w run qa:test:coverage` (alias: `vitest run --coverage` from the workspace root) runs the v8 coverage provider against all 22 vitest projects defined in `vitest.config.ts`. The thresholds at line 139 are `{ statements: 90, branches: 78, functions: 91, lines: 90 }`. Current state: statements 90.38% ✓, branches 80.31% ✓, lines 90.40% ✓, **functions 86.19% ✗** (3531 / 4097 covered, 566 missing). To reach the 91% threshold, exactly 198 additional functions must execute under tests.

Per-package breakdown of the 566-function gap (from `/tmp/coverage-by-pkg.js`):

| Pkg | Fn% | Missing | Notes |
|---|---|---|---|
| `@/lint` | 76.7% | 462 | dominant gap (81.7% of total) |
| `@/config/tooling/vscode` | 91.6% | 32 | already passes 91 threshold |
| `@storylyne/editor` | 92.6% | 37 | |
| `@/utils/core` | 93.7% | 20 | |
| `@/utils/devtools` | 94.9% | 4 | |
| `@/ui` | 97.4% | 9 | |
| `@/schemas/function` | 96.6% | 1 | |
| `@/locale` | 99.0% | 1 | |
| 14 others | 100% | 0 | |

Inside `@/lint` (top-density files):

| Missing | fns/total | File |
|---|---|---|
| 19 | 80/99 | `src/cli-helpers.ts` |
| 4 | 12/16 | `src/config/schema.ts` |
| 3 | 10/13 | `src/api.ts` |
| 3 | 1/4 | `src/framework/types.ts` |
| 3 | 0/3 | `src/rules/workspace/no-crlf.ts` |
| 2 each | (various) | 43 files (cache.ts, worker-pool.ts, names-valid.ts, _svelte-helpers.ts, _shared-inputs.ts, 38 workspace-rule files, etc.) |
| 1 each | (various) | ~370 files (mostly anon arrow callbacks inside `rule.check()` bodies that fire only on rare branches) |

V8 coverage counts every arrow callback and inline function as a separate "function" for accounting, so a single rule like `no-crlf.ts` with `rule.check(ctx)` containing `.filter(p => …)` and `.map(f => …)` reports 3 functions: the rule's check, the filter callback, the map callback. Tests that invoke `rule.check(emptyContext)` may hit only the outer function and miss the inline callbacks if the input Map is empty.

The plan execute under the active-plan binding contract: the Stop hook will refuse to end the turn until `pnpm -w run qa:test:coverage 2>&1 | grep -c 'does not meet global threshold'` returns 0.

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `pnpm -w run qa:test:coverage` exit code | 1 |
| Tests | 19,396 / 19,396 passing (335 files) |
| Statements | 90.38% (target 90, gap +0.38) |
| Branches | 80.31% (target 78, gap +2.31) |
| **Functions** | **86.19% (target 91, gap −4.81)** |
| Lines | 90.40% (target 90, gap +0.40) |
| Workspace `qa:lint` | exit 0 (verified) |

---

## TASK 1 — Cover `@/lint` cli-helpers.ts (19 functions)

**Status**: [ ]

**Gap**: `cli-helpers.ts` has 19 uncovered functions (80/99 = 80.8%). All 19 are anonymous arrow callbacks inside conditional branches (line numbers: 1086, 1270, 1374, 1375, 1378, 1381, 1395, 1482, 1557, 1649, 1694, 1695, 1702, 1768, 1770, …). Highest single-file leverage in the workspace.

**Plan**:
- Read each uncovered line in `cli-helpers.ts` and identify the parent function and triggering condition.
- Group callbacks by parent function (e.g. all callbacks inside `runLinter`'s help-flag branch).
- Add 5–8 new test cases to `cli-helpers.test.ts`, `cli-helpers-mocked.test.ts`, or `cli-run-linter-{1,2,3,stdin}.test.ts` (whichever already mocks the closest dependencies) that drive these branches:
  - Help / list-rules / format / locale / stdin paths
  - `--diff head` / `--diff staged` mode (currently uncovered git plumbing)
  - `--severity-override` re-classification path
  - Rule-options parse error path
  - File-collection error path (ENOENT, EACCES)
- After each batch, re-run `pnpm --filter @/lint exec vitest run --project lint --coverage` and verify the file's function-coverage rises.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers-mocked.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-run-linter-1.test.ts`
- Test: `packages/shared/config/tooling/lint/src/cli-helpers.test.ts`

**Verification**:
- `pnpm --filter @/lint exec vitest run --project lint --coverage 2>&1 | grep cli-helpers.ts` shows function coverage ≥ 95%.
- Workspace `pnpm -w run qa:test:coverage` total functions coverage rises by ≥ 0.45pp (19/4097).
- `pnpm --filter @/lint run qa:test 2>&1 | grep "Tests"` pass count ≥ baseline + 5.

---

## TASK 2 — Cover `@/lint` framework + config + api (13 functions)

**Status**: [ ]

**Gap**: Three core files in `@/lint` have 10 combined uncovered functions: `config/schema.ts` (4: validateConfig error paths, JSON-Schema-edge-case helpers), `api.ts` (3: `lintSource()` empty-rules path, programmatic-API error pathway, `_runLintCore` rule-filter no-match branch), `framework/types.ts` (3: callable utilities like `createResult` overloads, `NO_OP_FIX` consumer, `isFixable` predicate). `framework/cache.ts` (2) and `framework/worker-pool.ts` (2) round out the cluster.

**Plan**:
- For each of the 5 files, list the uncovered function names + line numbers via `node /tmp/coverage-uncovered-fns.js <file>` (a small helper to be written that filters `coverage-final.json`).
- Add direct unit tests next to each helper:
  - `config/schema.test.ts` — drive `validateConfig` with a config that has unknown rule IDs, conflicting severities, malformed glob arrays.
  - `api.test.ts` — call `lintSource({ ruleIds: [], paths: [], sources: [] })` (empty everything), trigger ConfigPath-not-found error, exercise programmatic-API stdin path.
  - `framework/types.test.ts` — direct tests for `createResult`, `NO_OP_FIX`, fixability predicates.
  - `framework/cache.test.ts` — tests for cache hit/miss + invalidation.
  - `framework/worker-pool.test.ts` — tests for `WorkerPool` task-scheduling edge cases.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/config/schema.test.ts` (or create if missing)
- Edit: `packages/shared/config/tooling/lint/src/api.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/types.test.ts` (create if missing)
- Edit: `packages/shared/config/tooling/lint/src/framework/cache.test.ts` (create if missing)
- Edit: `packages/shared/config/tooling/lint/src/framework/worker-pool.test.ts` (create if missing)
- Test: `packages/shared/config/tooling/lint/src/api.test.ts`

**Verification**:
- `pnpm --filter @/lint exec vitest run --project lint --coverage 2>&1 | grep -E 'cli-helpers|schema\.ts|api\.ts|types\.ts|cache\.ts|worker-pool\.ts'` shows each file's function coverage ≥ 95%.
- Workspace functions coverage rises by ≥ 0.31pp (13/4097).

---

## TASK 3 — Cover `@/lint` workspace rule branches (200+ functions across ~80 files)

**Status**: [ ]

**Gap**: ~440 of `@/lint`'s 462 uncovered functions are anonymous callbacks inside `rule.check(ctx)` bodies — the `.filter()`, `.map()`, `.find()`, `.some()` callbacks that fire only on rare paths. Average ~2 per rule across ~80 rule files (`rules/workspace/*.ts`, `rules/svelte5/*.ts`, `rules/plans/*.ts`, etc.). To reach 91% workspace-wide, ~185 of these need tests.

**Plan**:
- For each rule file with 2+ missing functions (top 50 by missing count), find the existing test in `*-rules.test.ts` and add 1 test case per uncovered branch using the rule's existing `mockContext()` helper. Branch examples:
  - `no-crlf.ts` (3 missing): test files with CRLF, with mixed line endings, with no `.gitattributes`.
  - `enforce-peer-dependency-consistency.ts` (2 missing): peer dep mismatch + missing peer.
  - `no-empty-directories.ts` (2 missing): empty dir under `packages/`, empty dir under `node_modules/` (skip).
  - `require-license.ts` (2 missing): missing license, license SPDX mismatch.
  - …(50 similar)
- Tests live in the same split test files (`workspace-rules-1/2/3/4.test.ts`) under existing `describe('rule-id', ...)` blocks. No new top-level imports added (avoids the `max-dependencies` cap).
- After each 10-rule batch, re-run `pnpm --filter @/lint exec vitest run --project lint --coverage` and update the rolling missing-function count.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/workspace-rules-{1,2,3,4}.test.ts` (the four splits from the prior session)
- Edit: `packages/shared/config/tooling/lint/src/rules/svelte5/svelte5-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/svelte5-config/svelte5-config-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/plans-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/hygiene/hygiene-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/primitives-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/vscode/vscode-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/testing/testing-rules.test.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/workspace/workspace-rules-1.test.ts`

**Verification**:
- Workspace functions coverage rises by ≥ 4.5pp from 86.19 to ≥ 90.7% after this task.
- `pnpm --filter @/lint exec vitest run --project lint --coverage 2>&1 | tail -10 | grep -E 'Functions'` shows package functions coverage ≥ 92%.
- All 5,315 lint package tests still passing (test count rises by ≥ 80).

---

## TASK 4 — Cover `@storylyne/editor` (37 functions)

**Status**: [ ]

**Gap**: 37 missing functions in `packages/products/storylyne/editor/src/`, mostly callbacks in route `+page.svelte`/`+layout.svelte` files and lib utilities. Function coverage 92.6%.

**Plan**:
- Run `node /tmp/coverage-by-file.js storylyne/editor` to enumerate the worst-covered files.
- For each, identify whether it's a route file (test via `*.server.test.ts`) or a lib file (test via co-located `*.test.ts`).
- Add tests under the existing `storylyne-editor` and `storylyne-editor-server` vitest projects.

**Files**:
- Edit: `packages/products/storylyne/editor/src/lib/**/*.test.ts` (likely 10–15 sites)
- Edit: `packages/products/storylyne/editor/src/routes/**/*.server.test.ts` (likely 5–8 sites)
- Test: `packages/products/storylyne/editor/src/lib/stores/lens-notifications.svelte.test.ts`

**Verification**:
- Workspace functions coverage rises by ≥ 0.9pp (37/4097).
- `pnpm --filter @storylyne/editor run qa:test 2>&1 | grep "Tests"` pass count ≥ 1498 + 20.

---

## TASK 5 — Cover `@/config/tooling/vscode` (32 functions)

**Status**: [ ]

**Gap**: 32 missing functions in `packages/shared/config/tooling/vscode/src/` — VS Code extension scaffolding callbacks not exercised by the existing scripts test suite.

**Plan**:
- Enumerate uncovered lines via the helper script.
- Add tests under the existing `config-tooling-vscode` vitest project (mocks vscode API via `src/__mocks__/vscode.ts`).
- Focus on command-handler invocation paths and configuration-read paths.

**Files**:
- Edit: `packages/shared/config/tooling/vscode/src/**/*.test.ts` (likely 3–5 sites)
- Test: `packages/shared/config/tooling/vscode/src/extension.test.ts`

**Verification**:
- Workspace functions coverage rises by ≥ 0.78pp (32/4097).
- `pnpm --filter @/config/tooling/vscode run qa:test 2>&1 | grep "Tests"` pass count ≥ baseline + 8.

---

## TASK 6 — Cover `@/utils/core` + `@/ui` + `@/utils/devtools` + `@/schemas/function` + `@/locale` (35 functions)

**Status**: [ ]

**Gap**: Five smaller packages each have 1–20 uncovered functions:
- `@/utils/core`: 20 missing (93.7%)
- `@/ui`: 9 missing (97.4%)
- `@/utils/devtools`: 4 missing (94.9%)
- `@/schemas/function`: 1 missing (96.6%)
- `@/locale`: 1 missing (99.0%)

**Plan**:
- For each package, enumerate uncovered files via the helper script.
- Add targeted tests in the existing test files.
- `@/utils/core` is the largest — likely error-path callbacks in result helpers, logger, env utilities.

**Files**:
- Edit: `packages/shared/utils/core/src/**/*.test.ts`
- Edit: `packages/shared/ui/src/**/*.test.ts`
- Edit: `packages/shared/utils/devtools/src/**/*.test.ts`
- Edit: `packages/shared/schemas/function/src/**/*.test.ts`
- Edit: `packages/shared/locale/src/**/*.test.ts`
- Test: `packages/shared/utils/core/src/index.test.ts`

**Verification**:
- Workspace functions coverage rises by ≥ 0.85pp (35/4097).
- All 5 packages' test suites still pass.

---

## TASK 7 — Register Rules + Config

**Status**: [ ]

**Plan**:
- This is a coverage-fill phase; no new lint rules or config rules are added.
- Verify no `vitest.config.ts` projects-array changes (each new test file must live under an existing project root).
- Verify any newly-created `*.test.ts` files match an existing project's `include` pattern.

**Files**:
- Read-only audit: `vitest.config.ts`

**Verification**:
- `git diff --name-only HEAD -- 'vitest.config.ts' '.oxlintrc.json'` is empty.
- `git diff --name-only HEAD` shows changes only inside `packages/**/src/**/*.test.ts` (and possibly a couple of source files for testability tweaks).

---

## TASK 8 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: workspace has no slash-commands; `grep -rc 'registerCommand' packages/products/storylyne/editor/src` count is unchanged from baseline.
- Config settings read check: `grep -rc 'config\.get(' packages/products/storylyne/editor/src` is unchanged from baseline (no new settings added by coverage-fill).
- Class instantiation check: `grep -rn '^export class\|^class ' packages/shared/config/tooling/lint/src | wc -l` is unchanged.
- Dead code / unused export check: `pnpm -w run qa:lint 2>&1 | grep -cE '^  ✗ '` returns 0 (no new orphans).
- Test-file location check: every new `*.test.ts` lives under an existing vitest project root.

**Files**:
- No edits expected; this task is read-only verification.

**Verification**:
- All five `grep`/`wc` checks above produce expected counts.
- `pnpm -w run qa:lint 2>&1 | grep -cE '^  ✗ '` returns 0.
- `pnpm -w exec vitest list 2>&1 | grep -c '\.test\.ts'` count rose from baseline by the number of new test files added in TASKS 1–6.

---

## TASK 9 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint`
- Run: `pnpm -w run qa:test:coverage`
- Verify all four exit 0.

**Verification**:
- `pnpm -w run qa:format:check` exits 0.
- `pnpm -w run qa:lint` exits 0.
- `pnpm -w run qa:test:coverage` exits 0.
- `pnpm -w run qa:test:coverage 2>&1 | grep -c 'does not meet global threshold'` returns 0.
- `pnpm -w run qa:test:coverage 2>&1 | grep -E 'Functions|Statements|Branches|Lines' | grep '%'` shows all four metrics ≥ their thresholds (90/78/91/90).

---

## TASK 10 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify coverage thresholds: `pnpm -w run qa:test:coverage` exit 0, no `does not meet global threshold` lines.
- Verify all per-package tests still passing.
- Verify no regressions in workspace lint.
- Commit with message: `feat(tests): lift workspace functions coverage to ≥91% via targeted gap-fills`.

**Verification**:
- `pnpm -w run qa:test:coverage` exit 0
- `git log -1 --format=%s` matches the commit message
- `git status --short` empty after commit
- `pnpm -w run qa:lint` re-run still exit 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Cover @/lint cli-helpers.ts (19 fns) | -- |
| 2 | Cover @/lint framework + config + api (13 fns) | -- |
| 3 | Cover @/lint workspace rule branches (~185 fns) | 1, 2 |
| 4 | Cover @storylyne/editor (37 fns) | -- |
| 5 | Cover @/config/tooling/vscode (32 fns) | -- |
| 6 | Cover smaller packages (35 fns) | -- |
| 7 | Register Rules + Config audit | 1–6 |
| 8 | Integration Verification | 7 |
| 9 | Full QA + Coverage | 8 |
| 10 | Final Verification + Commit | 9 |
