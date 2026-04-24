# @/ui Phase 2 — qa:test:coverage Passing Thresholds

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: `@/ui` (`packages/shared/ui/src/`)
**Goal**: Raise `@/ui` `qa:test:coverage` from S:68.15% / B:60.51% / F:83.04% / L:68.05% to pass the global thresholds S≥80 / B≥75 / F≥80 / L≥80 (target S≥90 / B≥80 / F≥90 / L≥90) by adding branch-covering tests across lens helpers, analyser modules, and zero-coverage utility files. Zero assertion weakening, zero skipped errors, zero dismissed diagnostics, every if/else/try/catch/ternary/??/|| covered, every assertion uses exact values or exact error codes.

**Architecture**: `@/ui` participates in the root `vitest.config.ts` via two projects: `ui` (node env, excludes `*.svelte.test.ts`) and `ui-svelte` (jsdom + svelte plugin, only `*.svelte.test.ts`). Coverage is collected project-by-project and written to `coverage/coverage-final.json` at the workspace root; the global thresholds live on the root config and both projects inherit them via `extends: true`. Source is split into ~863 generated `src/<kebab-name>/lens.ts` scaffolds (all export a single `meta: LensMeta`), a set of lens analyser modules in `src/lens/*.ts` (detect-accessibility, extract-props, extract-variants, extract-deps, export-utils, lens-utils), and a long tail of small utility modules (chart-utils, sidebar/constants, carousel/context, lens-stats/types, render-*-config, plus `.svelte.ts` runes files). Tests are colocated as `*.test.ts` alongside source; runes files are tested in the `ui-svelte` project.

Each task is atomic: implement → verify (QA + tests) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests (ui + ui-svelte) | 271 total (271 pass) |
| Test files | 13 |
| Type-check | Passes |
| Statements | 68.15% (4230/6206) — FAIL (need 80) |
| Branches | 60.51% (2182/3606) — FAIL (need 75) |
| Functions | 83.04% (289/348) — PASS |
| Lines | 68.05% (4195/6164) — FAIL (need 80) |

### Largest uncovered contributors

| Area | Uncovered | Notes |
|------|-----------|-------|
| 863 × `src/*/lens.ts` scaffolds | ~889 stmts | Each file exports a single `meta: LensMeta`; never imported by any existing test. |
| `src/lens/detect-accessibility.ts` | 563 stmts | Large branch-heavy analyser. |
| `src/lens/extract-props.ts` | 323 stmts | Prop-shape extractor with many ternaries. |
| `src/lens/lens-utils.ts`, `src/lens/export-utils.ts`, `src/lens/extract-variants.ts`, `src/lens/extract-deps.ts` | ~250 stmts combined | Partial coverage; fillers needed. |
| `src/chart-utils.ts`, `src/sidebar/constants.ts`, `src/carousel/context.ts`, `src/lens-stats/types.ts`, `src/render-component-config.ts`, `src/render-snippet-config.ts` | ~60 stmts combined | At 0%. |
| `.svelte.ts` runes files (`hooks/is-mobile.svelte.ts`, `announce.svelte.ts`, `data-table.svelte.ts`, `sidebar/context.svelte.ts`) | ~66 stmts combined | Require `ui-svelte` jsdom env. |

---

## TASK 1 — Discovery coverage for all `src/*/lens.ts` scaffolds

**Status**: [ ]

**Gap**: 863 generated `src/<name>/lens.ts` modules (each exporting `meta: LensMeta`) are never imported by any test; every one contributes 1 uncovered statement and 2 uncovered branches, collectively suppressing statements by ~14 points and lines by ~14 points.

**Plan**:
- Enumerate all scaffolds via `import.meta.glob('../*/lens.ts', { eager: true })` at test-load time (keeps the test file compact and avoids 863 hand-written imports).
- For each module entry, assert exactly:
  - `module.meta` is an object.
  - `typeof module.meta.category === 'string'` and `meta.category.length > 0`.
  - `Array.isArray(meta.tags)` and `meta.tags.every((t) => typeof t === 'string' && t.length > 0)`.
  - `typeof meta.description === 'string'` and `meta.description.length > 0`.
- Assert the discovered count equals the on-disk count (derived once via `import.meta.glob`); guard against silent empties.

**Files**:
- Create: `src/lens-scaffolds.discovery.test.ts`

**Verification**: Statements for `packages/shared/ui/src/*/lens.ts` reaches 100% in the coverage report; the single new test file contains ≥863 `expect` calls (one per module × 4 checks). `pnpm --filter @/ui run qa:test` exits 0.

---

## TASK 2 — Exhaustive branch tests for `src/lens/detect-accessibility.ts`

**Status**: [ ]

**Gap**: 563 stmts uncovered in the largest analyser; every accessibility-heuristic branch (role match, aria-* presence, labelled-by chain, implicit-role fallback, tabindex parsing, disabled/hidden short-circuit) is currently at 0% branch coverage.

**Plan**:
- Read `src/lens/detect-accessibility.ts` top-to-bottom, enumerate every `if`/`else`, `switch` case, `?:`, `??`, `||`, and `try/catch`.
- For each branch, construct a minimal fixture input that hits only that branch; assert the returned accessibility record exactly (exact role string, exact warnings array, exact score).
- Negative paths: invalid role strings → exact error code from the module's own thrown errors; missing required nodes → exact `undefined` returns (never `toBeFalsy`).
- Use table-driven `it.each` where branches share a fixture skeleton; every row has an `expected` object asserted via `toEqual`.

**Files**:
- Create: `src/lens/detect-accessibility.test.ts`

**Verification**: `detect-accessibility.ts` file-level branch coverage ≥ 90%, statements ≥ 95%. No `toBeTruthy` / `toBeFalsy` / `anything()` in the new file (grep-verified).

---

## TASK 3 — Exhaustive branch tests for `src/lens/extract-props.ts`

**Status**: [ ]

**Gap**: 323 stmts uncovered; prop-shape extractor has many ternaries on AST node kinds and fallback `??` chains that are not currently exercised.

**Plan**:
- Read `extract-props.ts`; enumerate every node-kind branch (literal default, union, enum, array, tuple, callable, object-shorthand, rest, default-fn).
- For each branch, feed a minimal fabricated input and assert the produced prop descriptor exactly (name, type, optional flag, default expression).
- Cover every `??` fallback and every `||` default separately (one test per operator).
- Cover the error branches with `expect(() => …).toThrow()` matching the exact message or error code.

**Files**:
- Create: `src/lens/extract-props.test.ts`

**Verification**: `pnpm --filter @/ui run qa:test:coverage` exits 0. In `coverage/coverage-final.json`, the entry for `packages/shared/ui/src/lens/extract-props.ts` reports branch coverage ≥ 90% and statement coverage ≥ 95%. The new file `packages/shared/ui/src/lens/extract-props.test.ts` contains ≥ 30 `it(` blocks (grep `grep -c '^\s*it(' packages/shared/ui/src/lens/extract-props.test.ts`).

---

## TASK 4 — Branch fillers for remaining lens analysers

**Status**: [ ]

**Gap**: `src/lens/lens-utils.ts`, `src/lens/export-utils.ts`, `src/lens/extract-variants.ts`, and `src/lens/extract-deps.ts` each have partial coverage with specific branches at 0% (default arg paths, empty-input short-circuits, union-type alternates, import-kind switches). Combined ~250 uncovered statements.

**Plan**:
- For each module, read the source, list uncovered branches (using the per-file hit map in `coverage/coverage-final.json`), and author one `it(...)` per uncovered branch with an exact-value assertion.
- Prefer `toStrictEqual` over `toEqual` where the shape includes `undefined` keys to distinguish missing-vs-set.
- Every thrown-error branch asserts an exact `Error` subtype and exact message (or exact `code` property).

**Files**:
- Create: `src/lens/lens-utils.test.ts`
- Create: `src/lens/export-utils.test.ts`
- Create: `src/lens/extract-variants.test.ts`
- Create: `src/lens/extract-deps.test.ts`

**Verification**: `pnpm --filter @/ui run qa:test:coverage` exits 0. In `coverage/coverage-final.json`, each of `packages/shared/ui/src/lens/lens-utils.ts`, `export-utils.ts`, `extract-variants.ts`, and `extract-deps.ts` reports branch coverage ≥ 85% and statement coverage ≥ 95%. All four new test files (`lens-utils.test.ts`, `export-utils.test.ts`, `extract-variants.test.ts`, `extract-deps.test.ts`) exist under `packages/shared/ui/src/lens/` and collectively contain ≥ 40 `it(` blocks.

---

## TASK 5 — Tests for zero-coverage utility modules

**Status**: [ ]

**Gap**: A long tail of small modules sits at 0% coverage: `src/chart-utils.ts`, `src/sidebar/constants.ts`, `src/carousel/context.ts`, `src/lens-stats/types.ts`, `src/render-component-config.ts`, `src/render-snippet-config.ts`, plus four `.svelte.ts` runes files (`src/hooks/is-mobile.svelte.ts`, `src/announce.svelte.ts`, `src/data-table.svelte.ts`, `src/sidebar/context.svelte.ts`).

**Plan**:
- For each non-runes utility: write a colocated `*.test.ts` that imports every exported binding and asserts its exact value / exact frozen shape (constants) or exercises every function branch (contexts, config builders).
- For each `.svelte.ts` runes file: write a `*.svelte.test.ts` in the `ui-svelte` project (jsdom env already set up) that mounts the rune inside `$effect.root(() => …)` or uses `createRoot` helper pattern used elsewhere in `@/ui`; exercise each derived/effect branch with exact value assertions.
- If a rune truly cannot run outside a component context, add the file to `vitest.config.ts` `coverage.exclude` under the `ui` project ONLY for that path, and document the reason inline in this plan before editing.

**Files**:
- Create: `src/chart-utils.test.ts`
- Create: `src/sidebar/constants.test.ts`
- Create: `src/carousel/context.test.ts`
- Create: `src/lens-stats/types.test.ts`
- Create: `src/render-component-config.test.ts`
- Create: `src/render-snippet-config.test.ts`
- Create: `src/hooks/is-mobile.svelte.test.ts`
- Create: `src/announce.svelte.test.ts`
- Create: `src/data-table.svelte.test.ts`
- Create: `src/sidebar/context.svelte.test.ts`

**Verification**: `pnpm --filter @/ui run qa:test:coverage` exits 0. In `coverage/coverage-final.json`, each of `packages/shared/ui/src/chart-utils.ts`, `src/sidebar/constants.ts`, `src/carousel/context.ts`, `src/lens-stats/types.ts`, `src/render-component-config.ts`, `src/render-snippet-config.ts`, `src/hooks/is-mobile.svelte.ts`, `src/announce.svelte.ts`, `src/data-table.svelte.ts`, `src/sidebar/context.svelte.ts` reports statement coverage ≥ 90%. All 10 new `*.test.ts` / `*.svelte.test.ts` files exist at the paths listed above. `git diff --name-only HEAD -- vitest.config.ts` prints no output unless a documented TASK 5 exception was applied.

---

## TASK 6 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Confirm the `ui` and `ui-svelte` projects in `vitest.config.ts` discover all new `*.test.ts` and `*.svelte.test.ts` files (no new projects needed; the existing `include` globs already match colocated tests).
- Confirm `packages/shared/ui/package.json` already has `qa:test` / `qa:test:coverage` scripts — no edits required.
- Verify no production source file outside `packages/shared/ui/src/` was modified except (if absolutely necessary per TASK 5 note) `vitest.config.ts` coverage-exclude for a runes file that cannot execute outside a component.
- Confirm no new exports were added to any source module — tests only import existing exported surface.

**Files**:
- Edit: `vitest.config.ts` (only if unavoidable per TASK 5 documented exception; otherwise read-only verify)

**Verification**:
- `pnpm -w exec vitest list --project ui` and `--project ui-svelte` each enumerate every new test file.
- `git diff --name-only HEAD -- 'packages/shared/ui/src/**/*.ts' ':!**/*.test.ts' ':!**/*.svelte.test.ts'` prints nothing.

---

## TASK 7 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: N/A — `@/ui` exports no CLI commands; `grep -c 'registerCommand' packages/shared/ui/src` returns 0 (unchanged).
- Config settings read check: N/A — no new `config.get` keys added; `grep -nE 'config\.get\(' packages/shared/ui/src` count equals baseline.
- Class instantiation / feature-wired check: N/A — no new classes or features introduced. Every function under test is already exported via existing barrel files; tests import by relative path, so no new wiring required.
- Dead code / unused export check: `git diff -U0 -- 'packages/shared/ui/src/**/*.ts' ':!**/*.test.ts' ':!**/*.svelte.test.ts'` is empty → structurally impossible for tests to introduce orphaned source exports.
- Grep audit: baseline test-file count for `@/ui` = 13; post-plan count ≥ 13 + (1 discovery + 6 lens tests + 6 util tests + 4 runes tests) = ≥ 30 test files. Every new `*.test.ts` pairs with an existing source module of the same basename OR is the single discovery file.

**Verification**:
- `git diff --name-only HEAD -- 'packages/shared/ui/src/**/*.ts' ':!**/*.test.ts' ':!**/*.svelte.test.ts'` prints nothing (or only the single documented TASK 5 exception).
- `grep -rE 'registerCommand|config\.get\(' packages/shared/ui/src` count equals baseline (unchanged).
- Every new test file has a matching source file by basename, or is the `lens-scaffolds.discovery.test.ts` catch-all.
- No orphaned exports: structurally guaranteed because the plan is test-only in `src/`.

---

## TASK 8 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/ui run qa:test`
- Run: `pnpm --filter @/ui run qa:test:coverage`
- Verify all four thresholds pass: S ≥ 80, B ≥ 75, F ≥ 80, L ≥ 80.
- Target: S ≥ 90, B ≥ 80, F ≥ 90, L ≥ 90.

**Verification**: Every pnpm command exits 0. Coverage report shows all four metrics green for `packages/shared/ui/src/**`.

---

## TASK 9 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify every new `*.test.ts` / `*.svelte.test.ts` file exists and is picked up by the relevant vitest project.
- Verify coverage now passes all four thresholds (previously failing S / B / L).
- Verify only test files (and, if applicable, the single documented `vitest.config.ts` exception from TASK 5) changed — via `git diff --name-only HEAD`.
- Verify no regressions in other projects: `pnpm -w exec vitest run` exits 0.
- Commit with message citing baseline → final coverage numbers.

**Verification**:
- Verify new test-file count for `packages/shared/ui/src` is ≥ 17 additions (baseline 13 → ≥ 30).
- Verify all four coverage metrics pass thresholds.
- Verify `pnpm --filter @/ui run qa:test:coverage` exits 0.
- Verify no regressions in the existing 1400+ tests across other projects.
- Verify `git diff --name-only HEAD` shows only new `*.test.ts` files, new `*.svelte.test.ts` files, the plan doc, and at most one documented `vitest.config.ts` line.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Lens scaffolds discovery test | -- |
| 2 | `detect-accessibility.ts` branch tests | -- |
| 3 | `extract-props.ts` branch tests | -- |
| 4 | Lens analyser branch fillers | -- |
| 5 | Zero-coverage utility tests (+ runes) | -- |
| 6 | Register rules + config | 1-5 |
| 7 | Integration verification | 6 |
| 8 | Full QA + Coverage | 7 |
| 9 | Final verification + commit | 8 |
