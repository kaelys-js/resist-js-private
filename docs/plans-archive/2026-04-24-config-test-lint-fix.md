# `@/test` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: `@/test` (`packages/shared/config/test/src/`)
**Goal**: Make `pnpm -w run qa:lint packages/shared/config/test` exit 0 by resolving every oxlint diagnostic at the source — no rule disable comments, no assertion weakening.
**Architecture**: All 34 diagnostics live in 5 test files under `harness/` and `presets/`. 33 are mechanical fixes (escape-case uppercasing, curly braces, async removal, catch rename, destructuring, `.at(-1)`). The 7 `no-process-exit` violations live in `process.test.ts` whose entire purpose is to test `createExitSpy` — calling `process.exit(N)` is the test's contract. User approved option (a): add `"no-process-exit": "off"` to the existing `*.test.ts` override in `.oxlintrc.json` (consistent with the prior `max-classes-per-file` precedent — vitest already catches accidental process.exit calls in tests as runtime crashes).

Each task is atomic: implement -> verify (`qa:lint <path>`) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `qa:lint packages/shared/config/test` exit code | 1 |
| Total diagnostics | 34 |
| `oxlint/escape-case` (ansi.test.ts × 11) | 11 |
| `oxlint/no-process-exit` (process.test.ts × 7) | 7 |
| `oxlint/curly` (async.test.ts × 7) | 7 |
| `oxlint/require-await` (http × 2, clock × 2) | 4 |
| `oxlint/prefer-destructuring` (playwright.test.ts × 2) | 2 |
| `oxlint/catch-error-name` (async.test.ts × 2) | 2 |
| `oxlint/prefer-at` (node.test.ts × 1) | 1 |

---

## TASK 1 — Disable `no-process-exit` for test files in oxlint config

**Status**: [ ]

**Gap**: `process.test.ts` tests `createExitSpy`, a utility whose role is to intercept `process.exit`. Each test must call `process.exit(N)` to verify the spy captures the call without terminating. The rule has no signal in tests since vitest catches genuine accidental exits as crashes.

**Plan**:
- Add `"no-process-exit": "off"` to the existing test-files override block at `.oxlintrc.json:540-565`, alongside `"max-classes-per-file": "off"` (added in the prior `@/locale` plan).

**Files**:
- Edit: `.oxlintrc.json`

**Verification**:
- After edit: `pnpm -w run qa:lint packages/shared/config/test` no longer reports `oxlint/no-process-exit` (7 fewer diagnostics).

---

## TASK 2 — Fix `ansi.test.ts` (11 diagnostics)

**Status**: [ ]

**Gap**: 11 instances of lowercase `` in test fixtures. Rule `oxlint/escape-case` requires uppercase hex ``.

**Plan**:
- Single `replace_all` Edit: lowercase `` → uppercase `` across the entire file. The 11 reported locations all use this exact escape; no other lowercase escapes exist.

**Files**:
- Edit: `packages/shared/config/test/src/harness/ansi.test.ts`

**Verification**:
- After edit: `pnpm -w run qa:lint packages/shared/config/test` reports 0 diagnostics for `ansi.test.ts`.

---

## TASK 3 — Fix `async.test.ts` (9 diagnostics)

**Status**: [ ]

**Gap**: 7 single-line ifs (curly) at lines 43, 79, 110, 149, 161, 264, 287; 2 catch parameters named `e` at lines 13 and 22 (catch-error-name expects `error`).

**Plan**:
- Wrap single-line ifs:
  - Line 43: `if (calls < 3) throw new Error('not yet');` → `if (calls < 3) { throw new Error('not yet'); }`
  - Line 79: `if (attempt === 1) throw new Error('transient');` → braces
  - Line 110: `if (attempt < 3) throw new Error('transient');` → braces
  - Line 149: `if (attempt < 3) throw new Error('transient');` → braces (different test, same pattern)
  - Line 161: variant `if (attempt < 2) throw new Error('transient');` → braces
  - Lines 264, 287: `if (prop === 'reason') return undefined;` → `if (prop === 'reason') { return undefined; }`
- Rename catch parameters and their internal references:
  - Lines 10-15: `catch (e: unknown) { return e as Error; }` → `catch (error: unknown) { return error as Error; }`
  - Lines 19-24: `catch (e: unknown) { return e; }` → `catch (error: unknown) { return error; }`

**Files**:
- Edit: `packages/shared/config/test/src/harness/async.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/config/test` reports 0 diagnostics for `async.test.ts`.

---

## TASK 4 — Fix `http.test.ts` and `clock.test.ts` (4 diagnostics)

**Status**: [ ]

**Gap**: 4 `it('...', async () => { ... })` test bodies with no `await` inside. Rule `oxlint/require-await` flags the redundant `async`.

**Plan**:
- `clock.test.ts:27` `it('pins time to provided Date', async () => {` → `() => {`
- `clock.test.ts:37` `it('pins time to provided numeric timestamp', async () => {` → `() => {`
- `http.test.ts:49` `it('preserves caller-provided Content-Type (exact casing)', async () => {` → `() => {`
- `http.test.ts:57` `it('preserves caller-provided content-type (lowercase)', async () => {` → `() => {`

**Files**:
- Edit: `packages/shared/config/test/src/harness/clock.test.ts`
- Edit: `packages/shared/config/test/src/harness/http.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/config/test` reports 0 diagnostics for `http.test.ts` or `clock.test.ts`.

---

## TASK 5 — Fix `playwright.test.ts` and `node.test.ts` (3 diagnostics)

**Status**: [ ]

**Gap**: 2 `prefer-destructuring` in `playwright.test.ts` and 1 `prefer-at` in `node.test.ts`.

**Plan**:
- `playwright.test.ts:54` and `:60` (same pattern; use replace_all): `const command: string = (cfg.webServer as { command: string }).command;` → `const { command } = cfg.webServer as { command: string };` (drops the explicit type annotation since destructuring infers `string` from the cast).
- `node.test.ts:50`: `expect(excl?.[excl.length - 1]).toBe('src/legacy/**');` → `expect(excl?.at(-1)).toBe('src/legacy/**');`

**Files**:
- Edit: `packages/shared/config/test/src/presets/playwright.test.ts`
- Edit: `packages/shared/config/test/src/presets/node.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/config/test` reports 0 diagnostics for `playwright.test.ts` or `node.test.ts`.

---

## TASK 6 — Register Rules + Config

**Status**: [ ]

**Plan**:
- TASK 1 modifies `.oxlintrc.json` (already part of the test-files override array — no separate registration needed).
- TASKS 2-5 only edit existing test files — no new exports, no entry-point changes, no rule files.

**Files**:
- None — no registration surface for this change.

**Verification**:
- `git diff --name-only HEAD` lists only `.oxlintrc.json`, the six edited `*.test.ts` files, and this plan doc.

---

## TASK 7 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -c registerCommand packages/shared/config/test/src` is unchanged (no new commands).
- Config settings read check: `grep -c "config\.get(" packages/shared/config/test/src` is unchanged.
- Class instantiation / feature-wired check: no new classes; this plan only edits existing test bodies.
- Dead code / unused export check: `git diff --stat` should show only line-edits in test files plus 1 line added to `.oxlintrc.json`.

**Verification**:
- All four counts above match baselines.
- `git diff --name-only HEAD` shows exactly: `.oxlintrc.json`, `ansi.test.ts`, `async.test.ts`, `clock.test.ts`, `http.test.ts`, `node.test.ts`, `playwright.test.ts`, plan doc.

---

## TASK 8 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint packages/shared/config/test` — must exit 0.
- Run: `pnpm -r --filter @/test run qa:test` — every test still passes.

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/test; echo $?` outputs `0`.
- `pnpm -r --filter @/test run qa:test 2>&1 | tail -5` shows all tests passed.

---

## TASK 9 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all six edited files match the spec above.
- Verify `pnpm -w run qa:lint packages/shared/config/test` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message states "fix(test): clear all qa:lint diagnostics" and lists the rules cleared.

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/test; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes the literal phrase `qa:lint` and `test`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Disable `no-process-exit` for test files | -- |
| 2 | Fix `ansi.test.ts` | -- |
| 3 | Fix `async.test.ts` | -- |
| 4 | Fix `http.test.ts` and `clock.test.ts` | -- |
| 5 | Fix `playwright.test.ts` and `node.test.ts` | -- |
| 6 | Register Rules + Config | 1-5 |
| 7 | Integration Verification | 6 |
| 8 | Full QA + Coverage | 7 |
| 9 | Final verification + commit | 8 |
