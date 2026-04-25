# `@/utils/web-vitals` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-25
**Package**: `@/utils/web-vitals` (`packages/shared/utils/web-vitals/src/`)
**Goal**: Make `pnpm -w run qa:lint packages/shared/utils/web-vitals` exit 0 by resolving every diagnostic at the source — no rule disable comments, no assertion weakening.

## Context

`pnpm -w run qa:lint packages/shared/utils/web-vitals` exits 1 with **158 diagnostics across 17 files**.

| Rule | Count | Notes |
|------|-------|-------|
| `oxlint/curly` | 110 | Mechanical: wrap single-line `if` bodies. Distribution: vitals-diagnostics.ts (29), connection.svelte.test.ts (29), connection.svelte.ts (12), vitals-diagnostics.test.ts (11), vitals-payload.ts (9), vitals-panel-store.svelte.test.ts (7), vitals-logger.ts (5), vitals-panel-store.svelte.ts (4), vitals-beacon.ts (3), vitals-beacon.test.ts (1). |
| `oxlint/no-void` | 11 | All in production source: vitals-logger.ts (4: lines 107, 112, 118, 258), vitals-beacon.ts (3: lines 120, 186, 220), vitals-diagnostics.ts (4: lines 796, 814, 832, 853). All are `void <expr>` discards of intentional fire-and-forget calls (`console.log`, `flushVitals()`, `fromUnknownError(error)`). Replace with explicit statement-bodies (drop `void` keyword) since the expressions already return `void`/`undefined`/`Result<Void>` that's intentionally ignored. |
| `oxlint/no-console` | 9 | All in `vitals-logger.ts`. The repo's existing override at `.oxlintrc.json:580` already covers `**/perf/vitals-logger.ts`; we extend that override block to also match `**/web-vitals/vitals-logger.ts` (same file kind, different package path after the codebase reorg). |
| `oxlint/no-duplicate-imports` | 7 | Multiple imports from the same module. Distribution: vitals-panel-store.svelte.ts (3), vitals-payload.ts (3), vitals-diagnostics.ts (1: `@/schemas/result/result` line 15). Fix: collapse all imports of a module into a single statement (mixing value + type imports via `, type X` syntax). |
| `oxlint/prefer-destructuring` | 6 | All in `vitals-diagnostics.ts` (lines 360, 418, 453, 537, 629, 694). All `const x = arr[0]` → `const [x] = arr`. |
| `oxlint/no-unused-vars` | 6 | Delete: `ERRORS`, `err`, `VitalDiagnostics` (vitals-panel-store.svelte.ts line 19, 24); `NameSchema` (vitals-beacon.ts line 14); `VitalDiagnostics` (vitals-logger.ts line 19). |
| `oxlint/no-duplicates` | 3 | Counterpart of `no-duplicate-imports` (different rule name reporting same site). Resolved by the same import-merge fixes in `no-duplicate-imports`. |
| `oxlint/require-returns` | 1 | `unwrap` helper at `vitals-diagnostics.test.ts:31`. Add `@returns`. |
| `oxlint/require-param` | 1 | Same `unwrap` helper at `vitals-diagnostics.test.ts:31`. Add `@param`. |
| `oxlint/no-undef` | 1 | `Node` not defined at `vitals-diagnostics.test.ts:1334`. The `Node` global is in `lib.dom`; the linter's globals list for tests likely doesn't include it. Add a `globals` entry for `Node` in `.oxlintrc.json` (matches existing pattern for `Element`, `Document`, etc. if any) OR import via `node:` style isn't applicable. Best fix: add `Node` to the test-files override `globals` list. |
| `oxlint/no-shadow` | 1 | `mockConsoleLog` at `vitals-logger.test.ts:294` shadows the outer-scope declaration at line 23. Rename the inner one to `localConsoleSpy` (or remove and use the outer-scope binding if the test has access — verify before renaming). |
| `oxlint/consistent-type-imports` | 1 | `import('./perfume').AnalyticsTrackerFn` at `perfume.test.ts:18` — convert to `import type { AnalyticsTrackerFn } from './perfume';` at the top of the file. |
| `oxlint/consistent-type-definitions` | 1 | `interface ImportMeta` in `vite-env.d.ts:2`. Same Vite-augmentation issue we hit in beacon: `interface` is required for global declaration merging. Extend the existing `**/app.d.ts`, `**/env.d.ts` override at `.oxlintrc.json:625` to also match `**/vite-env.d.ts`. |

Each task is atomic: implement → verify (`qa:lint <file>`) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `qa:lint packages/shared/utils/web-vitals` exit code | 1 |
| Total diagnostics | 158 |
| `oxlint/curly` | 110 |
| `oxlint/no-void` | 11 |
| `oxlint/no-console` | 9 |
| `oxlint/no-duplicate-imports` + `no-duplicates` | 10 |
| `oxlint/prefer-destructuring` | 6 |
| `oxlint/no-unused-vars` | 6 |
| `oxlint/require-returns` + `require-param` | 2 |
| `oxlint/no-undef` | 1 |
| `oxlint/no-shadow` | 1 |
| `oxlint/consistent-type-imports` | 1 |
| `oxlint/consistent-type-definitions` | 1 |

---

## TASK 1 — Extend rule overrides (no-console, consistent-type-definitions, Node global)

**Status**: [ ]

**Gap**: Three rule patterns need extending to match the file-kind/path conventions in this package.

**Plan**:
1. `.oxlintrc.json` line ~580: in the `no-console: off` override block, add `**/web-vitals/vitals-logger.ts` (the file is functionally identical to the already-listed `**/perf/vitals-logger.ts` — vitals console output as the product surface).
2. `.oxlintrc.json` line ~625: in the `**/app.d.ts`, `**/env.d.ts` override block, add `**/vite-env.d.ts`. Same justification as the beacon plan: `interface ImportMeta` is required for Vite's global declaration merging; `type` aliases cannot merge with the lib's built-in `ImportMeta`.
3. `.oxlintrc.json` test-files override (line ~540): add `Node` to a `globals` map for that block. The test file uses `Node.prototype` to construct a non-Element prototype chain — `Node` is a DOM global the test environment provides via jsdom.

**Files**:
- Edit: `.oxlintrc.json`

**Verification**: After edits, the 9 `no-console`, 1 `consistent-type-definitions`, and 1 `no-undef` diagnostics disappear. `pnpm -w run qa:lint packages/shared/utils/web-vitals 2>&1 | grep -E 'no-console|consistent-type-definitions|no-undef'` returns no rows.

**Approval requirement**: All three matches are existing precedent — same rule, same file kind, identical justification to overrides already in `.oxlintrc.json`.

---

## TASK 2 — Fix `vitals-logger.ts` (5 curly + 4 no-void + 1 unused import + 1 duplicate-import)

**Status**: [ ]

**Gap**: 5 single-line `if` bodies missing braces (lines 107, 112, 118, 258 — and one more), 4 `void console.log(...)` discards (lines 107, 112, 118, 258), 1 unused `VitalDiagnostics` type import (line 19), 1 `no-duplicate-imports` (line 13: `@/schemas/common` imported on lines 12 + 13).

**Plan**:
- Merge the two `@/schemas/common` imports at lines 12-13:
  ```ts
  import type { Str, Num, Bool, Void } from '@/schemas/common';
  import { StrSchema, NumSchema } from '@/schemas/common';
  ```
  →
  ```ts
  import { StrSchema, NumSchema, type Str, type Num, type Bool, type Void } from '@/schemas/common';
  ```
- Delete `type VitalDiagnostics` from the import on line 19 (keep `formatThresholds`, `VitalDiagnosticsSchema`).
- Drop the `void` operator from the four `void console.log(...)` calls — `console.log` already returns `undefined` so the bare statement is identical.
- Wrap the curly-violating `if` bodies in braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-logger.ts`

**Verification**: 0 diagnostics on file (after TASK 1 has handled `no-console`).

---

## TASK 3 — Fix `vitals-beacon.ts` (3 curly + 3 no-void + 1 unused import)

**Status**: [ ]

**Gap**: 3 single-line `if` bodies, 3 `void <expr>` discards (lines 120, 186, 220 — the line-120 one is `void flushVitals()` which kicks off a fire-and-forget Promise), 1 unused `NameSchema` import (line 14).

**Plan**:
- Remove `NameSchema,` from the import statement on line 14.
- Wrap 3 `if` bodies in braces.
- For each `void flushVitals()` / `void <expr>` site:
  - If the expression returns a Promise (e.g. `flushVitals()`), replace `void X()` with `X().catch((): Void => undefined);` — explicit promise-rejection silencer that clearly documents the fire-and-forget intent.
  - For non-Promise returns (the `void fromUnknownError(...)` style), drop `void` and let the bare statement form be the discard.
  - Inspect each of the 3 sites before applying — verify return type.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-beacon.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 4 — Fix `vitals-diagnostics.ts` (29 curly + 4 no-void + 6 prefer-destructuring + 1 duplicate-import + 1 no-duplicates)

**Status**: [ ]

**Gap**: 29 single-line ifs, 4 `void fromUnknownError(error)` calls in `catch` blocks (lines 796, 814, 832, 853), 6 `arr[0]`-style accesses to convert to array destructuring (lines 360, 418, 453, 537, 629, 694), 2 import-duplication issues at lines 13-15.

**Plan**:
- Merge the imports at lines 12-15:
  ```ts
  import type { Str, Num, Bool, Void, OptionalStr } from '@/schemas/common';
  import { StrSchema, NumSchema } from '@/schemas/common';
  import type { AppError } from '@/schemas/result/result';
  import { ok, okUnchecked, err, ERRORS, type Result } from '@/schemas/result/result';
  ```
  →
  ```ts
  import {
    StrSchema,
    NumSchema,
    type Str,
    type Num,
    type Bool,
    type Void,
    type OptionalStr,
  } from '@/schemas/common';
  import {
    ok,
    okUnchecked,
    err,
    ERRORS,
    type AppError,
    type Result,
  } from '@/schemas/result/result';
  ```
- Drop `void` operator from the 4 catch-block `void fromUnknownError(error)` calls — the function returns an `AppError` value that's intentionally being discarded; bare statement form is fine.
- For each prefer-destructuring site, change `const source = arr[0]` to `const [source] = arr` (one line each).
- Wrap each of the 29 single-line `if` bodies in braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-diagnostics.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 5 — Fix `vitals-payload.ts` (9 curly + 3 duplicate-imports/no-duplicates)

**Status**: [ ]

**Gap**: 9 single-line ifs + 3 import duplications (`@/schemas/common` on lines 18-20).

**Plan**:
- Merge the three `@/schemas/common` imports (lines 18-20) into one statement using the `, type X` form for type imports.
- Wrap 9 single-line `if` bodies in braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-payload.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 6 — Fix `vitals-panel-store.svelte.ts` (4 curly + 3 duplicate-imports + 3 unused-vars)

**Status**: [ ]

**Gap**: 4 single-line ifs, 3 import duplications (`@/schemas/common` on lines 16-18), 3 unused (`ERRORS`, `err` from line 19; `VitalDiagnostics` on line 24).

**Plan**:
- Merge the three `@/schemas/common` imports (lines 16-18) into one statement.
- Remove `ERRORS, err,` from line 19 (keep `okUnchecked`, `type Result`).
- Remove `type VitalDiagnostics` from the import on line 24 (keep `VitalDiagnosticsSchema`).
- Wrap 4 single-line `if` bodies in braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-panel-store.svelte.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 7 — Fix `connection.svelte.ts` (12 curly)

**Status**: [ ]

**Gap**: 12 single-line ifs.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/connection.svelte.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 8 — Fix `connection.svelte.test.ts` (29 curly)

**Status**: [ ]

**Gap**: 29 single-line ifs.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/connection.svelte.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 9 — Fix `vitals-diagnostics.test.ts` (11 curly + 1 require-param + 1 require-returns)

**Status**: [ ]

**Gap**: 11 single-line ifs, 1 missing `@param`/`@returns` on `unwrap` helper at line 31. (TASK 1 covers `no-undef` for `Node` here.)

**Plan**:
- Expand the `unwrap` JSDoc to include `@param` and `@returns`:
  ```
  /**
   * Unwraps a Result for test assertions, returning the data or null on error.
   *
   * @param result - A Result-shaped object.
   * @returns The result data on success, or null on error / missing data.
   */
  ```
- Wrap 11 single-line `if` bodies in braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-diagnostics.test.ts`

**Verification**: 0 diagnostics on file (combined with TASK 1's `no-undef` resolution).

---

## TASK 10 — Fix `vitals-panel-store.svelte.test.ts` (7 curly)

**Status**: [ ]

**Gap**: 7 single-line ifs.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-panel-store.svelte.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 11 — Fix `vitals-beacon.test.ts` (1 curly)

**Status**: [ ]

**Gap**: 1 single-line `if` body.

**Plan**: Wrap with braces.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-beacon.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 12 — Fix `vitals-logger.test.ts` (1 no-shadow)

**Status**: [ ]

**Gap**: Inner `mockConsoleLog` at line 294 shadows outer-scope binding at line 23.

**Plan**: Rename the inner declaration to `localConsoleSpy` (or `innerConsoleSpy`) and update the references within that `it` block. Verify the test still asserts what it intended.

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/vitals-logger.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 13 — Fix `perfume.test.ts` (1 consistent-type-imports)

**Status**: [ ]

**Gap**: `type AnalyticsTrackerFn = import('./perfume').AnalyticsTrackerFn;` at line 18 uses dynamic `import()` type expression.

**Plan**: Move the type alias to a real top-of-file `import type { AnalyticsTrackerFn } from './perfume';` (placed before the `const { setupPerfume } = await import('./perfume');` line — TS supports static type imports independent of runtime async loading).

**Files**:
- Edit: `packages/shared/utils/web-vitals/src/perfume.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 14 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Only one config file is touched (`.oxlintrc.json`, in TASK 1).
- No new exports, no entry-point changes.

**Files**:
- None additional.

**Verification**: `git diff --name-only HEAD` lists exactly the 12 edited source files plus `.oxlintrc.json` plus the plan doc.

---

## TASK 15 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/utils/web-vitals/src` is unchanged.
- Config settings read check: `grep -rc 'config\.get(' packages/shared/utils/web-vitals/src` is unchanged.
- Class instantiation check: no new classes.
- Dead code / unused export check: 6 unused-var deletions. Repo-wide grep confirms zero importers of the deleted bindings before deletion.

**Verification**: All four counts match baselines (or improve via deletion).

---

## TASK 16 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint packages/shared/utils/web-vitals` — must exit 0.
- Run: `pnpm --filter @/utils/web-vitals run qa:test` (resolve actual package name from `package.json`).

**Verification**:
- `pnpm -w run qa:lint packages/shared/utils/web-vitals; echo $?` outputs `0`.
- All package tests pass (count ≥ baseline).

---

## TASK 17 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 12 edited source files match the spec above.
- Verify `pnpm -w run qa:lint packages/shared/utils/web-vitals` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message: `fix(web-vitals): clear all qa:lint diagnostics` and lists the rules cleared (curly, no-void, no-console override, no-duplicate-imports, no-duplicates, prefer-destructuring, no-unused-vars, require-returns, require-param, no-undef, no-shadow, consistent-type-imports, consistent-type-definitions).

**Verification**:
- `pnpm -w run qa:lint packages/shared/utils/web-vitals; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes `qa:lint` and `web-vitals`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Extend rule overrides | -- |
| 2 | Fix `vitals-logger.ts` | 1 |
| 3 | Fix `vitals-beacon.ts` | -- |
| 4 | Fix `vitals-diagnostics.ts` | -- |
| 5 | Fix `vitals-payload.ts` | -- |
| 6 | Fix `vitals-panel-store.svelte.ts` | -- |
| 7 | Fix `connection.svelte.ts` | -- |
| 8 | Fix `connection.svelte.test.ts` | -- |
| 9 | Fix `vitals-diagnostics.test.ts` | 1 |
| 10 | Fix `vitals-panel-store.svelte.test.ts` | -- |
| 11 | Fix `vitals-beacon.test.ts` | -- |
| 12 | Fix `vitals-logger.test.ts` | -- |
| 13 | Fix `perfume.test.ts` | -- |
| 14 | Register Rules + Config | 1-13 |
| 15 | Integration Verification | 14 |
| 16 | Full QA + Coverage | 15 |
| 17 | Final verification + commit | 16 |
