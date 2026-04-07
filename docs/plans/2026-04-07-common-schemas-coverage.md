# Common Schemas — Push Branch & Function Coverage Past All Thresholds

## Context

`qa:test:coverage` for `@/schemas/common` fails 2 of 4 thresholds — branches 50% (need 75%), functions 53.33% (need 80%). Statements and lines already pass at 94.28%. The package has 1 large source file (`index.ts` — 3500+ lines) with 128 existing tests. The gaps are: 7 uncovered functions (5 `v.custom()` validators + 1 `v.check()` callback + 1 missing from count) and 5 uncovered branches. This plan adds targeted tests for the 6 untested schemas with runtime validation logic.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/schemas/common` (`packages/shared/schemas/common/src/`)
**Goal**: Raise branch and function coverage past thresholds (B:75%, F:80%) with test-only changes. Currently B:50% (5/10), F:53.33% (8/15).
**Architecture**: Vitest + v8 coverage; Valibot schemas with `v.custom()` validators (instanceof/typeof checks), `v.check()` callbacks (try/catch, string checks), branded types via `v.brand()`.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric     | Value                             |
| ---------- | --------------------------------- |
| Tests      | 128 total (128 pass, 1 test file) |
| Statements | 94.28% (198/210) — passing        |
| Branches   | 50% (5/10) — need 75%             |
| Functions  | 53.33% (8/15) — need 80%          |
| Lines      | 94.28% (198/210) — passing        |
| Thresholds | S:80% B:75% F:80% L:80%           |

### Per-file uncovered code

| Schema                 | Line      | Type     | Key Code                                               |
| ---------------------- | --------- | -------- | ------------------------------------------------------ |
| RelativePathSchema     | 1540      | v.check  | `(s) => !s.startsWith('/')` — both true/false branches |
| AbortSignalSchema      | 3225-3226 | v.custom | `val instanceof AbortSignal` — true/false branches     |
| InterruptHandlerSchema | 3249-3250 | v.custom | `typeof val === 'function'` — true/false branches      |
| CleanupCallbackSchema  | 3274-3275 | v.custom | `typeof input === 'function'` — true/false branches    |
| ConsoleLogFnSchema     | 3438-3439 | v.custom | `typeof val === 'function'` — true/false branches      |
| TeardownFnSchema       | 3491-3492 | v.custom | `typeof val === 'function'` — true/false branches      |

---

## TASK 1 — Cover All 6 Untested Schemas with Runtime Validators

**Status**: [x]

**Gap**: 6 schemas with runtime validation functions (v.check/v.custom callbacks) are untested — accounts for 7 uncovered functions and 5 uncovered branches.

**Plan**:

Tests in `src/index.test.ts` (extend existing file):

**RelativePathSchema (v.check — `!s.startsWith('/')`)**:

- Accept `'src/index.ts'` — relative path, v.check returns true
- Accept `'./local'` — relative with dot prefix
- Reject `'/absolute/path'` — starts with `/`, v.check returns false
- Reject `''` — empty string fails minLength(1)

**AbortSignalSchema (v.custom — `val instanceof AbortSignal`)**:

- Accept `new AbortController().signal` — is an AbortSignal instance
- Reject `{}` — plain object, not an AbortSignal
- Reject `'string'` — not an AbortSignal

**InterruptHandlerSchema (v.custom — `typeof val === 'function'`)**:

- Accept `(signal: string) => {}` — is a function
- Reject `'not a function'` — string, not a function
- Reject `42` — number, not a function

**CleanupCallbackSchema (v.custom — `typeof input === 'function'`)**:

- Accept `() => {}` — is a function
- Reject `null` — not a function
- Reject `{}` — object, not a function

**ConsoleLogFnSchema (v.custom — `typeof val === 'function'`)**:

- Accept `console.log` — is a function
- Accept `() => {}` — any function qualifies
- Reject `'not a function'` — string

**TeardownFnSchema (v.custom — `typeof val === 'function'`)**:

- Accept `() => {}` — is a function
- Reject `undefined` — not a function
- Reject `123` — number, not a function

**Files**:

- Edit: `src/index.test.ts`

**Verification**: `pnpm --filter @/schemas/common run qa:test` — new tests pass

---

## TASK 2 — Register Rules + Config

**Status**: [x]

**Plan**:

- No new rules or commands to register — test-only changes
- Verify test file matches vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/schemas/common run qa:test` discovers test file, no orphaned tests

---

## TASK 3 — Integration Verification

**Status**: [x]

**Plan**:

- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: N/A — no new config settings
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: No new exports introduced, verify export count unchanged from baseline

**Verification**:

- `git diff --name-only` returns no production `.ts` files (only `.test.ts`)
- Export count unchanged from baseline

---

## TASK 4 — Full QA + Coverage

**Status**: [x]

**Plan**:

- Run: `pnpm -w run qa:format:check`
- Run: `pnpm --filter @/schemas/common run qa:test:coverage`
- Verify all 4 coverage thresholds pass (S >= 80%, B >= 75%, F >= 80%, L >= 80%)

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 5 — Final Verification + Commit

**Status**: [x]

**Plan**:

- Verify all test files exist and pass
- Verify coverage meets all thresholds (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions — existing 128 tests still pass
- Commit with descriptive message

**Verification**:

- Test count >= 140 (baseline 128 + ~12 new)
- All coverage metrics pass thresholds
- `pnpm --filter @/schemas/common run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description                                          | Depends On |
| ---- | ---------------------------------------------------- | ---------- |
| 1    | Cover all 6 untested schemas with runtime validators | --         |
| 2    | Register rules + config                              | 1          |
| 3    | Integration verification                             | 2          |
| 4    | Full QA + Coverage                                   | 3          |
| 5    | Final verification + commit                          | 4          |
