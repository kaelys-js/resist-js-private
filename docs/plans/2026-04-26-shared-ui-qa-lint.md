# `packages/shared/ui` (`@/ui`) — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: `@/ui` (`packages/shared/ui/src/`)
**Goal**: Make `pnpm -w run qa:lint packages/shared/ui` exit 0 by resolving every diagnostic at the source — no rule disable comments, no assertion weakening.
**Architecture**: Mix of (a) per-file `.oxlintrc.json` rule overrides with existing precedent for `.d.ts` ambient declarations and Vite-tool-artefact test files, (b) one `globals` addition matching the established `Node`/`setImmediate` precedent, (c) one extension to `tools/svelte-check.ts` that mirrors an already-approved suppression in `tools/tsgo.ts`, and (d) mechanical code edits in test files.

Each task is atomic: implement → verify (`qa:lint <file>`) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `qa:lint packages/shared/ui` exit code | 1 |
| Total errors | 37 |
| Warnings | 2 (svelte-check/warning, a11y) |
| Files with diagnostics | 7 |

| Rule | Count |
|------|------:|
| `oxlint/no-shadow` | 11 |
| `oxlint/require-param` | 4 |
| `oxlint/array-type` | 4 |
| `oxlint/require-returns` | 3 |
| `oxlint/no-undef` (`KeyboardEvent`) | 3 |
| `oxlint/default` (Vite `?raw` imports) | 3 |
| `oxlint/no-nested-ternary` | 2 |
| `oxlint/consistent-function-scoping` | 2 |
| `oxlint/unknown` (svelte.d.ts parse) | 1 |
| `oxlint/prefer-spread` | 1 |
| `oxlint/no-useless-undefined` | 1 |
| `oxlint/no-array-sort` | 1 |
| `svelte-check/error` (svelte.d.ts parse) | 1 |

---

## TASK 1 — Add `KeyboardEvent` to top-level `globals` in `.oxlintrc.json`

**Status**: [ ]

**Gap**: `oxlint/no-undef` flags 3 sites in `sidebar/context.svelte.test.ts` (lines 127, 144, 162) where `KeyboardEvent` is used as a type annotation in a function signature. `KeyboardEvent` is a DOM global already available in jsdom test envs but missing from oxlint's globals list.

**Plan**:
- Add `"KeyboardEvent": "readonly"` to top-level `env`/`globals` in `.oxlintrc.json` matching the existing `Node`, `setImmediate` precedent.

**Files**:
- Edit: `.oxlintrc.json`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'no-undef'` returns 0.

---

## TASK 2 — Per-file override for `**/svelte.d.ts`

**Status**: [ ]

**Gap**: `packages/shared/ui/src/svelte.d.ts:24` declares `export var [key: string]: unknown;` — intentional non-standard ambient syntax that tsgo resolves correctly (allows arbitrary named exports from `<script module>` blocks). The existing tsgo suppression in `packages/shared/config/tooling/lint/src/tools/tsgo.ts:130-133` skips `TS1005` parse errors on this file. Two other tools — oxlint (`unknown` parse error) and svelte-check (`',' expected.`) — still flag it, contributing 1 oxlint error and 1 svelte-check error.

**Plan**:
- Add per-file override to `.oxlintrc.json` matching glob `**/svelte.d.ts`: disable `oxlint/unknown` (parse-error rule).

**Files**:
- Edit: `.oxlintrc.json`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'oxlint/unknown'` returns 0.

---

## TASK 3 — Extend `svelte-check.ts` to skip `svelte.d.ts` parse error

**Status**: [ ]

**Gap**: `packages/shared/config/tooling/lint/src/tools/svelte-check.ts` currently emits the same parse-error diagnostic for `svelte.d.ts` that `tsgo.ts` already suppresses. Mirror the existing tsgo suppression — same file, same root cause.

**Plan**:
- In the parse/transform step, skip diagnostics whose file path ends with `svelte.d.ts` AND whose message matches the parse-error pattern (matches `/',' expected\.|Expected .* but found/`).
- Mirror the approach in `tools/tsgo.ts:98` (`SVELTE_AMBIENT_PARSE_SUPPRESSION` regex).

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/tools/svelte-check.ts`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'svelte-check/error'` returns 0.

---

## TASK 4 — Per-file override for `**/lens-scaffolds.discovery.svelte.test.ts`

**Status**: [ ]

**Gap**: 3 `oxlint/default` errors at lines 15-17 of `lens-scaffolds.discovery.svelte.test.ts`. Each is `import x from './X/lens.ts?raw'` — Vite's `?raw` query returns the file as a string default-export at build/test time, but oxlint's static analysis doesn't recognize `?raw` and reports "no default export" (the underlying `lens.ts` files indeed export `meta`, not a default).

**Plan**:
- Add per-file override to `.oxlintrc.json` matching glob `**/*.discovery.svelte.test.ts` (or the more specific `**/lens-scaffolds.discovery.svelte.test.ts`): disable `import/default`. Justification: Vite tooling artefact, not a code defect.

**Files**:
- Edit: `.oxlintrc.json`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'oxlint/default'` returns 0.

---

## TASK 5 — Rename shadowed `unmount` in `sidebar/context.svelte.test.ts` (11 sites)

**Status**: [ ]

**Gap**: `import { mount, unmount } from 'svelte'` at the top of the file is shadowed by `const { sidebar, unmount } = mountHarness(...)` in 11 `it()` blocks (lines 76, 83, 91, 101, 112, 125, 138, 156, 172, 183, 192).

**Plan**:
- Rename the destructured local from `unmount` to `cleanup` (or similar) in all 11 sites; update the call sites within each `it()` block accordingly. The harness's `unmount` field stays — only the destructured local changes.

**Files**:
- Edit: `packages/shared/ui/src/sidebar/context.svelte.test.ts`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'no-shadow'` returns 0; `pnpm --filter @/ui run qa:test` for `context.svelte.test.ts` still passes.

---

## TASK 6 — Convert `T[]` → `Array<T>` for non-simple types (4 sites)

**Status**: [ ]

**Gap**: `oxlint/array-type` requires `Array<T>` for non-simple `T[]` patterns. 4 sites:
- `data-table/data-table.svelte.test.ts:27` — `ColumnDef<Row>[]`
- `data-table/data-table.svelte.test.ts:68` — `(string | symbol)[]`
- `data-table/data-table.svelte.test.ts:74` — `(string | symbol)[]`
- `lens/detect-accessibility-synthetic.test.ts:337` — `Record<string, string>[]`

**Plan**:
- Replace each per the rule help message.

**Files**:
- Edit: `packages/shared/ui/src/data-table/data-table.svelte.test.ts`
- Edit: `packages/shared/ui/src/lens/detect-accessibility-synthetic.test.ts`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'array-type'` returns 0.

---

## TASK 7 — Add JSDoc `@param` and `@returns` (7 sites total)

**Status**: [ ]

**Gap**: 4 `require-param` + 3 `require-returns` errors on test helpers:
- `lens/extract-props-internal.test.ts:252` — fn `singleField` missing both
- `lens/extract-props-exported.test.ts:74` — missing both
- `sidebar/context.svelte.test.ts:24` — `stubMatchMedia` missing `@param`
- `sidebar/context.svelte.test.ts:46` — `mountHarness` missing both

**Plan**:
- Add appropriate JSDoc tags at each site.

**Files**:
- Edit: `packages/shared/ui/src/lens/extract-props-internal.test.ts`
- Edit: `packages/shared/ui/src/lens/extract-props-exported.test.ts`
- Edit: `packages/shared/ui/src/sidebar/context.svelte.test.ts`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -cE 'require-param|require-returns'` returns 0.

---

## TASK 8 — Hoist non-capturing inner functions to outer scope (2 sites)

**Status**: [ ]

**Gap**: 2 `consistent-function-scoping` errors:
- `lens/extract-props-internal.test.ts:252` — `singleField` declared inside but captures nothing
- `sidebar/context.svelte.test.ts:190` — `open` declared inside but captures nothing

**Plan**:
- Move each declaration to the surrounding describe-block top scope.

**Files**:
- Edit: `packages/shared/ui/src/lens/extract-props-internal.test.ts`
- Edit: `packages/shared/ui/src/sidebar/context.svelte.test.ts`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'consistent-function-scoping'` returns 0.

---

## TASK 9 — Refactor nested ternary + array sort/spread in `lens-scaffolds.discovery.test.ts`

**Status**: [ ]

**Gap**: 4 mechanical errors all on or near line 37 and 41:
- `oxlint/prefer-spread` (line 37) — `arr.slice()` → `[...arr]`
- `oxlint/no-array-sort` (line 41) — `.sort()` → `.toSorted()`
- `oxlint/no-nested-ternary` (line 41, ×2) — refactor to if/else helper

**Plan**:
- Extract a named comparator helper (e.g. `function compareScaffolds(a, b)`) with explicit if/else branches; replace `.slice().sort(nestedTernary)` with `[...arr].toSorted(compareScaffolds)`.

**Files**:
- Edit: `packages/shared/ui/src/lens-scaffolds.discovery.test.ts`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -cE 'prefer-spread|no-array-sort|no-nested-ternary'` returns 0.

---

## TASK 10 — Drop useless `undefined` in `data-table.svelte.test.ts:55`

**Status**: [ ]

**Gap**: 1 `oxlint/no-useless-undefined` error.

**Plan**:
- Remove the `undefined` literal per rule help (or replace with `null` if a value is required).

**Files**:
- Edit: `packages/shared/ui/src/data-table/data-table.svelte.test.ts`

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'no-useless-undefined'` returns 0.

---

## TASK 11 — Resolve 2 svelte-check a11y warnings

**Status**: [ ]

**Gap**: 2 svelte-check warnings — `noninteractive element cannot have nonnegative tabIndex value` (a11y_no_noninteractive_tabindex). Currently warnings only — do not fail qa:lint — but per user's "Every single diagnostic must be resolved" directive, fix at source.

**Plan**:
- Identify the 2 sites (one is `lens-section/LensSection.svelte` per the lint output trail).
- Either remove the `tabindex` attribute, change the element to an interactive one (`<button>`), or add an appropriate ARIA role (`role="button"` + matching keyboard handlers).

**Files**:
- Edit: TBD (read svelte-check warnings in detail to enumerate)

**Verification**: `pnpm -w run qa:lint packages/shared/ui 2>&1 | grep -c 'svelte-check/warning'` returns 0.

---

## TASK 12 — Register Rules + Config

**Status**: [ ]

**Plan**:
- TASKS 1, 2, 4 already cover the only `.oxlintrc.json` changes (one global addition, two per-file overrides).
- TASK 3 covers the only `tools/svelte-check.ts` change (mirror of existing tsgo suppression).
- No new exports.
- Confirm no orphaned changes via `git diff --name-only HEAD` — should list:
  - `.oxlintrc.json`
  - `packages/shared/config/tooling/lint/src/tools/svelte-check.ts`
  - `packages/shared/ui/src/sidebar/context.svelte.test.ts`
  - `packages/shared/ui/src/data-table/data-table.svelte.test.ts`
  - `packages/shared/ui/src/lens/detect-accessibility-synthetic.test.ts`
  - `packages/shared/ui/src/lens/extract-props-internal.test.ts`
  - `packages/shared/ui/src/lens/extract-props-exported.test.ts`
  - `packages/shared/ui/src/lens-scaffolds.discovery.test.ts`
  - one or two `.svelte` files for a11y warnings (TASK 11)

**Verification**: `git diff --name-only HEAD | sort` matches the expected set.

---

## TASK 13 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/ui/src` — should be unchanged from baseline (this is a UI library; registerCommand isn't expected here, but record the count).
- Config settings read check: `grep -rc 'config\.get(' packages/shared/ui/src` — unchanged.
- Class instantiation check: no new classes introduced — confirm with `git diff --stat`.
- Dead code / unused export check: only test files and one ambient `.d.ts` touched — confirm no production source files modified except a11y target(s) in TASK 11.

**Verification**: All four counts match baseline (within tolerances for the a11y `.svelte` edit if a tabindex prop was removed).

---

## TASK 14 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint packages/shared/ui` — exit 0.
- Run: `pnpm --filter @/ui run qa:test` (test count ≥ baseline).

**Verification**:
- `qa:lint packages/shared/ui` exits 0 with 0 errors and 0 warnings.
- All `@/ui` tests pass.

---

## TASK 15 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all touched files match the spec (15 in TASK 12 enumeration).
- Verify `qa:lint packages/shared/ui` exit 0.
- Verify clean tree after commit.
- Commit message: `fix(ui): clear all qa:lint diagnostics` listing rules cleared and per-file override justifications.

**Verification**:
- `pnpm -w run qa:lint packages/shared/ui` exit 0.
- `git status --short` empty.
- Commit message includes `qa:lint` + `ui`.
- Test count ≥ baseline.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Add `KeyboardEvent` to globals | -- |
| 2 | Per-file override for svelte.d.ts (oxlint) | -- |
| 3 | Extend svelte-check.ts to skip svelte.d.ts parse error | -- |
| 4 | Per-file override for `*.discovery.svelte.test.ts` | -- |
| 5 | Rename shadowed `unmount` (11 sites) | -- |
| 6 | `T[]` → `Array<T>` (4 sites) | -- |
| 7 | JSDoc `@param`/`@returns` (7 sites) | -- |
| 8 | Hoist inner functions (2 sites) | -- |
| 9 | Refactor nested ternary + sort/spread | -- |
| 10 | Drop useless undefined | -- |
| 11 | Resolve 2 svelte-check a11y warnings | -- |
| 12 | Register Rules + Config audit | 1-11 |
| 13 | Integration Verification | 12 |
| 14 | Full QA + Coverage | 13 |
| 15 | Final verification + commit | 14 |
