# `@/utils/result` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-25
**Package**: `@/utils/result` (`packages/shared/utils/result/src/`)
**Goal**: Make `pnpm -w run qa:lint packages/shared/utils/result` exit 0 by resolving every diagnostic at the source — no rule disable comments, no assertion weakening.

## Context

`pnpm -w run qa:lint packages/shared/utils/result` exits 1 with **54 oxlint errors across 6 of 10 files**.

| Rule | Count | Notes |
|------|-------|-------|
| `oxlint/curly` | 49 | Mechanical: wrap single-line `if` bodies. Distribution: error-utils.test.ts (15), combinators.test.ts (13), format.ts (9), combinators.ts (7), error-utils.ts (4), breadcrumbs.ts (1). |
| `oxlint/require-await` | 3 | `format.test.ts:339` — `it('...', async () => {...})` test body has no `await` (the wrapped `expect(...)` calls are sync). Drop the `async` keyword. `combinators.test.ts:310` and `:317` — async arrows passed to `fromAsyncThrowable`, whose signature requires `(...args) => Promise<T>`. The arrow bodies have no `await`, so swap each to a non-async arrow that returns `Promise.resolve(...)` / `Promise.reject(...)` directly. |
| `oxlint/prefer-native-coercion-functions` | 2 | `combinators.test.ts:43` and `:49` — arrows `(n) => String(n)` are equivalent to passing `String` directly. Replace with `String`. |

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
| `qa:lint packages/shared/utils/result` exit code | 1 |
| Total diagnostics | 54 |
| `oxlint/curly` | 49 |
| `oxlint/require-await` | 3 |
| `oxlint/prefer-native-coercion-functions` | 2 |

---

## TASK 1 — Fix `combinators.ts` (7 curly)

**Status**: [ ]

**Gap**: 7 single-line `if` bodies missing braces.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/result/src/combinators.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 2 — Fix `error-utils.ts` (4 curly)

**Status**: [ ]

**Gap**: 4 single-line `if` bodies missing braces.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/result/src/error-utils.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 3 — Fix `format.ts` (9 curly)

**Status**: [ ]

**Gap**: 9 single-line `if` bodies missing braces.

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/result/src/format.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 4 — Fix `breadcrumbs.ts` (1 curly)

**Status**: [ ]

**Gap**: 1 single-line `if` body missing braces.

**Plan**: Wrap with braces.

**Files**:
- Edit: `packages/shared/utils/result/src/breadcrumbs.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 5 — Fix `error-utils.test.ts` (15 curly)

**Status**: [ ]

**Gap**: 15 single-line `if` bodies missing braces (lines 83, 89, 102, 108, 118, 124, 157, 179, 192, 199, 209, 224, 230, 240, 246).

**Plan**: Wrap each `if` body in braces.

**Files**:
- Edit: `packages/shared/utils/result/src/error-utils.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 6 — Fix `combinators.test.ts` (13 curly + 2 native-coercion + 2 require-await)

**Status**: [ ]

**Gap**: 13 single-line `if` bodies, 2 `(n) => String(n)` arrows that should be `String` (lines 43, 49), 2 `async` arrows passed to `fromAsyncThrowable` whose bodies have no `await` (lines 310, 317).

**Plan**:
- Line 43: `map(okResult(42), (n) => String(n))` → `map(okResult(42), String)`.
- Line 49: `map(errResult<number>(), (n) => String(n))` → `map(errResult<number>(), String)`.
- Line 310: `fromAsyncThrowable(async (x: number) => x * 2, ...)` → `fromAsyncThrowable((x: number): Promise<number> => Promise.resolve(x * 2), ...)`. Preserves the `Promise<TReturn>` signature `fromAsyncThrowable` requires while satisfying `require-await`.
- Line 317: `fromAsyncThrowable(async () => { throw new Error('async kaboom'); }, ...)` → `fromAsyncThrowable((): Promise<never> => Promise.reject(new Error('async kaboom')), ...)`. Same constraint resolved via `Promise.reject`. Verify the test still asserts `result.ok === false` (it does — the rejection propagates through `fromAsyncThrowable`'s try/catch).
- Wrap each of the 13 single-line `if` bodies in braces.

**Files**:
- Edit: `packages/shared/utils/result/src/combinators.test.ts`

**Verification**: 0 diagnostics on file. `pnpm --filter @/utils/result run qa:test` still passes for these two `fromAsyncThrowable` tests.

---

## TASK 7 — Fix `format.test.ts` (1 require-await)

**Status**: [ ]

**Gap**: `it('defaults to 500 when httpStatus not set', async () => {...})` at line 339 — body has no `await`.

**Plan**: Drop the `async` keyword: `it('...', () => {...})`. Vitest accepts sync `it` callbacks.

**Files**:
- Edit: `packages/shared/utils/result/src/format.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 8 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No oxlint config changes (no rule disables this round).
- No new exports, no entry-point changes.

**Files**:
- None.

**Verification**: `git diff --name-only HEAD` lists exactly the 7 edited source files plus the plan doc.

---

## TASK 9 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/utils/result/src` is unchanged (no commands).
- Config settings read check: `grep -rc 'config\.get(' packages/shared/utils/result/src` is unchanged.
- Class instantiation check: no new classes.
- Dead code / unused export check: no deletions this round; nothing to verify.

**Verification**: All four counts match baselines.

---

## TASK 10 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint packages/shared/utils/result` — must exit 0.
- Run: `pnpm --filter @/utils/result run qa:test` (resolve actual package name from `package.json`).

**Verification**:
- `pnpm -w run qa:lint packages/shared/utils/result; echo $?` outputs `0`.
- All package tests pass (count ≥ baseline).

---

## TASK 11 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 7 edited source files match the spec above.
- Verify `pnpm -w run qa:lint packages/shared/utils/result` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message: `fix(result): clear all qa:lint diagnostics` and lists the rules cleared (curly, require-await, prefer-native-coercion-functions).

**Verification**:
- `pnpm -w run qa:lint packages/shared/utils/result; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes `qa:lint` and `result`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix `combinators.ts` | -- |
| 2 | Fix `error-utils.ts` | -- |
| 3 | Fix `format.ts` | -- |
| 4 | Fix `breadcrumbs.ts` | -- |
| 5 | Fix `error-utils.test.ts` | -- |
| 6 | Fix `combinators.test.ts` | -- |
| 7 | Fix `format.test.ts` | -- |
| 8 | Register Rules + Config | 1-7 |
| 9 | Integration Verification | 8 |
| 10 | Full QA + Coverage | 9 |
| 11 | Final verification + commit | 10 |
