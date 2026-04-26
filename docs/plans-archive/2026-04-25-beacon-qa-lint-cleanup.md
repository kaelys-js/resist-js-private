# `@/utils/beacon` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-25
**Package**: `@/utils/beacon` (`packages/shared/utils/beacon/src/`)
**Goal**: Make `pnpm -w run qa:lint packages/shared/utils/beacon` exit 0 by resolving every oxlint diagnostic at the source — no rule disable comments, no assertion weakening.

## Context

`pnpm -w run qa:lint packages/shared/utils/beacon` currently exits 1 with **49 oxlint errors across 9 files**. The mix is dominated by mechanical `curly` violations (43 of 49) plus a small tail of dead-code deletions, type-form rewrites, and one error-chain fix:

| Rule | Count | Files |
|------|-------|-------|
| `oxlint/curly` | 43 | beacon.ts (2), beacon-payload.ts (2), breadcrumbs.ts (11), beacon.test.ts (1), beacon-payload.test.ts (5), breadcrumbs.test.ts (14), integration.test.ts (7), env.d.ts (-) |
| `oxlint/no-unused-vars` | 5 | breadcrumbs.ts (4: `err`, `ERRORS`, `DEFAULT_SKIP_URLS`, `FetchBreadcrumbOptionsSchema`), beacon-payload.ts (1: `Str`) |
| `oxlint/consistent-type-definitions` | 2 | env.d.ts (`ImportMetaEnv`, `ImportMeta`) |
| `oxlint/preserve-caught-error` | 1 | breadcrumbs.ts:205 |

All fixes are mechanical or semantically equivalent. `breadcrumbs.ts:205` has a real subtle issue: it threads the post-`fromUnknownError(error)` `cause: AppError` into `new Error(..., { cause })`, dropping the original `error` chain — the fix is `cause: error` so the underlying caught value remains the chain root.

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
| `qa:lint packages/shared/utils/beacon` exit code | 1 |
| Total diagnostics | 49 |
| `oxlint/curly` (8 files) | 43 |
| `oxlint/no-unused-vars` (2 files) | 5 |
| `oxlint/consistent-type-definitions` (env.d.ts) | 2 |
| `oxlint/preserve-caught-error` (breadcrumbs.ts:205) | 1 |

---

## TASK 1 — Fix `env.d.ts` (2 diagnostics)

**Status**: [ ]

**Gap**: 2 `interface` declarations should be `type` aliases.

**Plan**:
- `interface ImportMetaEnv { DEV: boolean; }` → `type ImportMetaEnv = { DEV: boolean; };`
- `interface ImportMeta { readonly env: ImportMetaEnv; }` → `type ImportMeta = { readonly env: ImportMetaEnv; };`

**Files**:
- Edit: `packages/shared/utils/beacon/src/env.d.ts`

**Verification**: `pnpm -w run qa:lint packages/shared/utils/beacon/src/env.d.ts` reports 0 diagnostics.

---

## TASK 2 — Fix `beacon.ts` (2 curly)

**Status**: [ ]

**Gap**: Single-line `if` bodies at lines 47 and 51 missing braces.

**Plan**: Wrap each `if` body in `{ ... }`.

**Files**:
- Edit: `packages/shared/utils/beacon/src/beacon.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 3 — Fix `beacon-payload.ts` (3 diagnostics)

**Status**: [ ]

**Gap**: 1 unused type import `Str` at line 17, 2 single-line `if` bodies (lines 129, 133) missing braces.

**Plan**:
- Remove `Str,` from the named-type-import list at line 17.
- Wrap the two single-line `if` bodies (lines 129, 133) in braces.

**Files**:
- Edit: `packages/shared/utils/beacon/src/beacon-payload.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 4 — Fix `breadcrumbs.ts` (16 diagnostics)

**Status**: [ ]

**Gap**: 11 single-line ifs (curly), 4 unused declarations, 1 preserve-caught-error at line 205.

**Plan**:
- Remove `err, ERRORS,` from the named-import on line 19 (keep the rest of the imports unchanged).
- Delete the unused `DEFAULT_SKIP_URLS` declaration at line 31 (and any leading JSDoc/blank line bound to it).
- Delete the unused `FetchBreadcrumbOptionsSchema` declaration at line 34 (and any leading JSDoc/blank line bound to it).
- Wrap each of the 11 single-line `if` bodies in braces (lines 50, 52, 54, 67, 69, 103, 107, 148, 165, 169 — verify exact lines from the diagnostic output before each edit).
- Line 205: `throw new Error(cause.message, { cause });` → `throw new Error(cause.message, { cause: error });` so the original caught `error` (line 192) stays as the chain root, not the post-conversion `AppError`.

**Files**:
- Edit: `packages/shared/utils/beacon/src/breadcrumbs.ts`

**Verification**: 0 diagnostics on file. `pnpm --filter @/utils/beacon run qa:test` still passes.

---

## TASK 5 — Fix `beacon.test.ts` (1 curly)

**Status**: [ ]

**Gap**: 1 single-line `if` body at line 199.

**Plan**: Wrap with braces.

**Files**:
- Edit: `packages/shared/utils/beacon/src/beacon.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 6 — Fix `beacon-payload.test.ts` (5 curly)

**Status**: [ ]

**Gap**: 5 single-line ifs at lines 206, 241, 260, 272, 282.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/beacon/src/beacon-payload.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 7 — Fix `breadcrumbs.test.ts` (14 curly)

**Status**: [ ]

**Gap**: 14 single-line ifs at lines 39, 66, 103, 127, 150, 169, 203, 229, 248, 268, 297, 324, 344, 366.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/beacon/src/breadcrumbs.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 8 — Fix `integration.test.ts` (7 curly)

**Status**: [ ]

**Gap**: 7 single-line ifs at lines 83, 125, 134, 161, 204, 231, 247.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/beacon/src/integration.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 9 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No oxlint config changes (no rule disables this round).
- No new exports, no entry-point changes.
- All deletions are dead code already proven unused by the linter.

**Files**:
- None.

**Verification**: `git diff --name-only HEAD` lists exactly the eight edited source files plus the plan doc.

---

## TASK 10 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/utils/beacon/src` is unchanged (no commands).
- Config settings read check: `grep -rc 'config\.get(' packages/shared/utils/beacon/src` is unchanged (no config reads).
- Class instantiation / feature-wired check: no new classes; the deleted `DEFAULT_SKIP_URLS` and `FetchBreadcrumbOptionsSchema` were never imported anywhere — confirm via repo-wide grep before deletion.
- Dead code / unused export check: 5 unused-var deletions reduce dead code; `git diff --stat` shows net deletions in import/declaration lines.

**Verification**: All four counts match baselines (or improve via deletion). Repo-wide grep confirms zero importers of the two deleted declarations.

---

## TASK 11 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint packages/shared/utils/beacon` — must exit 0.
- Run: `pnpm --filter @/utils/beacon run qa:test` (resolve the actual package name from `packages/shared/utils/beacon/package.json` first).

**Verification**:
- `pnpm -w run qa:lint packages/shared/utils/beacon; echo $?` outputs `0`.
- All package tests pass (count ≥ baseline).

---

## TASK 12 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all eight edited files match the spec above.
- Verify `pnpm -w run qa:lint packages/shared/utils/beacon` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message: `fix(beacon): clear all qa:lint diagnostics` and lists the rules cleared (curly, no-unused-vars, consistent-type-definitions, preserve-caught-error).

**Verification**:
- `pnpm -w run qa:lint packages/shared/utils/beacon; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes `qa:lint` and `beacon`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix `env.d.ts` | -- |
| 2 | Fix `beacon.ts` | -- |
| 3 | Fix `beacon-payload.ts` | -- |
| 4 | Fix `breadcrumbs.ts` | -- |
| 5 | Fix `beacon.test.ts` | -- |
| 6 | Fix `beacon-payload.test.ts` | -- |
| 7 | Fix `breadcrumbs.test.ts` | -- |
| 8 | Fix `integration.test.ts` | -- |
| 9 | Register Rules + Config | 1-8 |
| 10 | Integration Verification | 9 |
| 11 | Full QA + Coverage | 10 |
| 12 | Final verification + commit | 11 |
