# Workspace — Raise Coverage Thresholds + Targeted Fills

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: workspace-wide — covers packages/shared/ui, packages/products/storylyne, and packages/shared/utils (excluding packages/shared/utils/cli)
**Goal**: Raise the global vitest coverage thresholds from `S:80 B:75 F:80 L:80` to `S:90 B:78 F:91 L:90` (ratchet just-below current actuals + 1-2 pt safety buffer) and bring every package up to the new floor by writing targeted branch-covering tests where currently below.
**Architecture**: Coverage thresholds live on the root `vitest.config.ts` (single `coverage.thresholds` object inherited by every project via `extends: true`). Per-project test files are colocated `*.test.ts` / `*.svelte.test.ts`. The proposed thresholds are derived from the workspace-wide actual reading after the previously-committed `@/ui` work: S 91.23 / B 79.60 / F 92.67 / L 91.63 — so the new floors leave 1.23 / 1.60 / 1.67 / 1.63 pt of buffer respectively. Targeted fills focus on the three packages currently below the new floor: `shared/ui` (branches 75.19 — short 2.81), `products/storylyne` (S 87.78 / F 88.06 / L 87.67 — short 2.22 / 2.94 / 2.33), `shared/utils` (S 89.77 — short 0.23). All other packages already meet or exceed the new floor.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Workspace Actual | Current Threshold | Proposed Threshold | Buffer |
|--------|------------------|-------------------|--------------------|--------|
| Statements | 91.23% (34307/37601) | 80 | 90 | +1.23 |
| Branches | 79.60% (18525/23270) | 75 | 78 | +1.60 |
| Functions | 92.67% (3468/3742) | 80 | 91 | +1.67 |
| Lines | 91.63% (33589/36655) | 80 | 90 | +1.63 |
| Tests | 19100 / 19100 pass | -- | -- | -- |
| Test files | 326 | -- | -- | -- |

### Per-package vs proposed floor

| Package | S | B | F | L | Below-floor metric(s) |
|---------|---|---|---|---|------------------------|
| shared/ui | 90.36 | **75.19** | 95.94 | 90.31 | branches (need +2.81) |
| products/storylyne | **87.78** | 78.94 | **88.06** | **87.67** | S (+2.22), F (+2.94), L (+2.33) |
| shared/utils | **89.77** | 80.98 | 94.49 | 93.75 | S (+0.23) |
| shared/config | 91.67 | 79.12 | 91.94 | 91.72 | -- meets floor |
| shared/locale | 95.10 | 89.01 | 99.01 | 95.09 | -- meets floor |
| shared/schemas | 97.89 | 94.06 | 99.29 | 97.89 | -- meets floor |
| shared/secrets | 97.73 | 96.10 | 100.00 | 98.48 | -- meets floor |

---

## TASK 1 — Targeted branch fills for `shared/ui` (raise branches 75.19 -> >=78)

**Status**: [x] — branches 75.19 -> 79.14, statements 91.23 -> 92.44, lines 91.19 -> 92.41

**Gap**: `shared/ui` branch coverage sits at 75.19% — below the new 78 floor by 2.81 pt (~100 uncovered branches). Two analyser modules dominate the gap: `src/lens/detect-accessibility.ts` (472 uncovered branches) and `src/lens/extract-props.ts` (299 uncovered branches). These are large rule-scanner modules where each rule's regex ternary branches are individually testable but only via crafted source fixtures.

**Plan**:
- Open `coverage/coverage-final.json` and list every uncovered branch in `src/lens/detect-accessibility.ts` and `src/lens/extract-props.ts` with file:line.
- For each cluster of 5-10 related branches, author one synthetic fixture (raw Svelte string) that activates the failing-arm of the ternary and assert the resulting rule's `failingFiles` / `passingFiles` arrays exactly via `toEqual`.
- Prefer extending the existing `detect-accessibility-synthetic.test.ts` and creating a new `extract-props-internal.test.ts` to keep the fixtures grouped by analyser.
- Use `toEqual` / `toStrictEqual` for exact match — never `toBeTruthy` / `anything()`.

**Files**:
- Edit: `packages/shared/ui/src/lens/detect-accessibility-synthetic.test.ts`
- Create: `packages/shared/ui/src/lens/extract-props-internal.test.ts`

**Verification**: `pnpm --filter @/ui run qa:test:coverage` reports `shared/ui` branches >=78.0%; workspace branches stays >=78.0%.

---

## TASK 2 — Targeted fills for `products/storylyne` (raise S/F/L)

**Status**: [x] — S 88.75 -> 91.03, F 89.02 -> 92.41, L 88.65 -> 90.94 (all above floor)

**Gap**: `products/storylyne` is below the new floor on three metrics: S 87.78 (need +2.22), F 88.06 (+2.94), L 87.67 (+2.33). The gap is concentrated in editor-side modules (chart helpers, command-palette wiring, route-level loaders) that already have partial tests but miss conditional branches. No new modules need creating.

**Plan**:
- Identify per-file gaps via `coverage-final.json` filtered to `packages/products/storylyne/`. Sort by uncovered-statement count desc; pick the top files until reaching ~150 missed statements.
- For each file, list uncovered functions (zero-hit `f` entries) and uncovered statement clusters (>=5 consecutive uncovered lines).
- Author one targeted test per uncovered function with exact-value assertions on returned shape; for partial-coverage files, add `it()` cases that hit the specific branch (often a `if (config.X)` early-return or a `switch` default arm).
- Place new tests as colocated `*.test.ts` next to the source.

**Files**:
- Create: `packages/products/storylyne/editor/src/test-mocks/app-navigation.test.ts`
- Create: `packages/products/storylyne/editor/src/test-mocks/app-state.test.ts`
- Create: `packages/products/storylyne/editor/src/routes/(app)/(testing)/test-error/test-error-routes.server.test.ts`
- Edit: `packages/products/storylyne/editor/src/lib/server/simulator/ios-pool.test.ts`
- Edit: `packages/products/storylyne/editor/src/lib/server/simulator/android-pool.test.ts`
- Edit: `packages/products/storylyne/editor/src/lib/stores/lens-notifications.svelte.test.ts`
- Edit: `packages/products/storylyne/editor/src/lib/stores/editor-state.test.ts`
- Edit: `packages/products/storylyne/editor/src/lib/stores/keyboard-shortcuts-store.svelte.test.ts`

**Verification**: `pnpm --filter @/products/storylyne/* run qa:test:coverage` reports S>=90, F>=91, L>=90 for the storylyne package.

---

## TASK 3 — Single-branch fill for `shared/utils` (raise S 89.77 -> >=90)

**Status**: [x] — S 89.69 -> 90.3 (above floor)

**Gap**: `shared/utils` statements at 89.77% — short 0.23 pt of the 90 floor. This is a 14-statement gap; usually one or two uncovered functions in result-helpers / format-helpers. Trivial to close.

**Plan**:
- Filter `coverage-final.json` to `packages/shared/utils/` (excluding `cli/`). List uncovered statements grouped by file.
- For the top 1-2 files contributing the gap, write targeted `*.test.ts` cases hitting each missed branch with exact-value assertions.

**Files**:
- Edit: `packages/shared/utils/core/src/string.test.ts`
- Edit: `packages/shared/utils/core/src/git.test.ts`
- Edit: `packages/shared/utils/core/src/environment.test.ts`
- Edit: `packages/shared/utils/core/src/process.test.ts`

**Verification**: `pnpm --filter @/utils/* run qa:test:coverage` reports S>=90 for the utils package.

---

## TASK 4 — Register Rules + Config (raise root vitest thresholds)

**Status**: [x]

**Plan**:
- Edit `vitest.config.ts` line 139: change `thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 }` to `thresholds: { statements: 90, branches: 78, functions: 91, lines: 90 }`.
- Verify no other vitest config files override this (per-project configs use `extends: true` and inherit; double-check via grep).
- No barrel-file edits required (this is config-only; no new exports).

**Files**:
- Edit: `vitest.config.ts`

**Verification**: `grep -nE "thresholds.*statements" vitest.config.ts` shows the new numbers; no other `coverage.thresholds` block exists in any other config file.

---

## TASK 5 — Integration Verification

**Status**: [x] — git diff shows only test files + vitest.config.ts + plan doc

**Plan**:
- Command registration check: N/A — this plan registers no CLI commands. Verify with `grep -c 'registerCommand' packages/**/src/**/*.ts` equals baseline (unchanged).
- Config settings read check: N/A — no new `config.get(...)` keys introduced. Verify count of `config.get(` calls equals baseline.
- Class instantiation / feature-wired check: N/A — no new classes or features; this plan is config + tests only. Every test file is auto-discovered by vitest's existing `include` globs (`**/*.test.ts`, `**/*.svelte.test.ts`), so no manual wiring required.
- Dead code / unused export check: `git diff --name-only HEAD -- 'packages/**/src/**/*.ts' ':!**/*.test.ts' ':!**/*.svelte.test.ts'` should print only `vitest.config.ts` (the threshold edit) — proving structurally that no source modules were modified, so no orphaned exports could exist.
- Grep audit: `grep -rE 'registerCommand|config\.get\(' packages/**/src` count equals baseline (unchanged).

**Verification**:
- `git diff --name-only HEAD` lists only test files + `vitest.config.ts`.
- `grep -rE 'registerCommand|config\.get\(' packages/**/src | wc -l` equals baseline number.
- `pnpm -w exec vitest list` enumerates every new test file.
- No source-file diffs outside `vitest.config.ts`.

---

## TASK 6 — Full QA + Coverage

**Status**: [x] — S 92.03 / B 80.48 / F 93.51 / L 92.43 (all above floor); 19335/19335 tests pass

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:test`
- Run: `pnpm -w run qa:test:coverage`
- Verify global thresholds pass: S>=90, B>=78, F>=91, L>=90.
- Verify test count >= 19100 (baseline) + new tests from TASKs 1-3.

**Verification**: Every pnpm command exits 0. Coverage summary shows all four metrics green (above the new floor). Per-package floors also met (re-run the per-package node script from baseline analysis to confirm `shared/ui`, `products/storylyne`, `shared/utils` are now >=floor on every metric).

---

## TASK 7 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify every new `*.test.ts` / `*.svelte.test.ts` file from TASKs 1-3 exists and is picked up by vitest.
- Verify `vitest.config.ts` shows the new thresholds.
- Verify all four global coverage metrics pass at the new thresholds.
- Verify `git diff --name-only HEAD` shows only test files + `vitest.config.ts` + this plan doc.
- Verify per-package coverage summary script confirms every package meets the new floor.
- Commit with a message citing baseline -> final coverage numbers and listing the threshold change.

**Verification**:
- All new test files listed in `git status` are committed.
- `vitest.config.ts` line 139 reflects new thresholds.
- All four global metrics >= new floor.
- Per-package coverage script confirms every package >= floor on every metric.
- `pnpm -w run qa:test:coverage` exits 0 with no threshold errors.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Targeted branch fills for shared/ui | -- |
| 2 | Targeted fills for products/storylyne | -- |
| 3 | Single-branch fill for shared/utils | -- |
| 4 | Register rules + config (raise thresholds) | 1, 2, 3 |
| 5 | Integration verification | 4 |
| 6 | Full QA + Coverage | 5 |
| 7 | Final verification + commit | 6 |
