# Function Schemas — Push Coverage From 0% Past All Thresholds

## Context

`qa:test:coverage` for `@/schemas/function` fails all 4 thresholds — the package has zero test files. 122 statements, 96 branches, 29 functions, 119 lines all at 0%. This plan adds a comprehensive test file covering schemas, pipe actions (args/returns/arity/implement), wrapper coordination, Result-aware return validation, async handling, and error modes.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/schemas/function` (`packages/shared/schemas/function/src/`)
**Goal**: Raise all coverage metrics past thresholds (S:80%, B:75%, F:80%, L:80%) with test-only changes. Currently all at 0%.
**Architecture**: Vitest + v8 coverage; Valibot schemas + pipe actions (`v.transform`, `v.check`); wrapper pattern with metadata symbol for double-wrap prevention; Result-aware return validation; throw/result error modes.

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
| Tests | 0 total (no test files) |
| Statements | 0% (0/122) |
| Branches | 0% (0/96) |
| Functions | 0% (0/29) |
| Lines | 0% (0/119) |
| Thresholds | S:80% B:75% F:80% L:80% |

### Per-file uncovered code

| File | Stmts | Branches | Functions | Key Code |
|------|-------|----------|-----------|----------|
| types.ts | 12 | 6 | 5 | ErrorModeSchema, FnTypeSchema (generic), ArityConstraintSchema, CallTimeOptionsSchema, WrapperMetaSchema |
| function.ts | 7 | 6 | 3 | functionSchema() with class rejection, isAsyncFunction(), AsyncFunction const |
| arity.ts | 27 | 22 | 2 | arity() exact/range/min/max branches, NonNegativeInteger validation, inner check action |
| wrapper-utils.ts | 48 | 38 | 8 | createWrapper, validateArgs (throw/result), validateReturn (Result-aware + throw/result), getWrapperMeta, isResult, async Promise path |
| args.ts | 9 | 4 | 1 | args() transform — existing wrapper vs new wrapper |
| returns.ts | 10 | 4 | 1 | returns() transform — existing wrapper vs new wrapper |
| implement.ts | 9 | 4 | 1 | implement() transform — existing wrapper vs no wrapper |

---

## TASK 1 — types.ts: Cover Schema Definitions

**Status**: [x]

**Gap**: 12 statements, 6 branches, 5 functions — all schema definitions untested.

**Plan**:

Tests in `src/function.test.ts` (new file):

- **ErrorModeSchema**: accept 'throw', accept 'result', reject 'invalid'
- **FnTypeSchema**: `FnTypeSchema()` returns schema, accepts function, rejects non-function (string, number, null)
- **ArityConstraintSchema**: accept number (2), accept range `{ min: 1, max: 3 }`, accept `{ min: 1 }`, accept `{ max: 3 }`, reject string
- **CallTimeOptionsSchema**: accept `{}`, accept `{ onError: 'throw' }`, accept `{ onError: 'result' }`, reject extra field (strictObject)
- **WrapperMetaSchema**: accept valid meta object with `__original` as function, `__onError` as 'throw', optional `__argsSchema`/`__returnsSchema`

**Files**:
- Create: `src/function.test.ts`

**Verification**: `pnpm --filter @/schemas/function run qa:test` — tests pass

---

## TASK 2 — function.ts: Cover functionSchema() and isAsyncFunction()

**Status**: [x]

**Gap**: 7 statements, 6 branches, 3 functions — functionSchema class rejection, isAsyncFunction.

**Plan**:

Tests in `src/function.test.ts`:

- **functionSchema() accepts**:
  - Arrow function: `() => {}`
  - Named function: `function foo() {}`
  - Async function: `async () => {}`
- **functionSchema() rejects**:
  - Non-function: string, number, null, undefined, object
  - Class constructor: `class Foo {}` — tests `str.startsWith('class ')` branch
  - Class without space: ensure `class{` pattern is also tested if possible
- **isAsyncFunction()**:
  - Returns true for `async () => {}`
  - Returns false for `() => {}`
  - Returns false for `function() {}`

**Files**:
- Edit: `src/function.test.ts`

**Verification**: `pnpm --filter @/schemas/function run qa:test` — tests pass

---

## TASK 3 — arity.ts: Cover All Arity Branches

**Status**: [x]

**Gap**: 27 statements, 22 branches, 2 functions — the most complex branching.

**Plan**:

Tests in `src/function.test.ts`:

- **arity(2) — exact**: returns ok, check action rejects `(a) => a` (length 1), accepts `(a, b) => a + b` (length 2)
- **arity({ min: 1, max: 3 }) — range**: accepts length 1, 2, 3; rejects length 0 and 4
- **arity({ min: 2 }) — min only**: accepts length 2+, rejects length 1
- **arity({ max: 2 }) — max only**: accepts length 0-2, rejects length 3
- **arity(-1) — invalid exact**: returns err with code `ERRORS.FUNCTION.INVALID_ARITY`
- **arity(1.5) — invalid float**: returns err (NonNegativeInteger rejects floats)
- **arity({ min: -1 }) — invalid min**: returns err
- **arity({ max: -1 }) — invalid max**: returns err
- **arity({}) — empty range**: accepts any length (no min/max constraints)
- **Message construction**: verify the description string for exact vs range

**Files**:
- Edit: `src/function.test.ts`

**Verification**: `pnpm --filter @/schemas/function run qa:test` — tests pass

---

## TASK 4 — wrapper-utils.ts: Cover createWrapper, validateArgs, validateReturn

**Status**: [x]

**Gap**: 48 statements, 38 branches, 8 functions — largest file, most branches.

**Plan**:

Tests in `src/function.test.ts`:

**getWrapperMeta**:
- Returns undefined for unwrapped function
- Returns WrapperMeta for wrapped function (after createWrapper)

**createWrapper — args validation**:
- **Args pass, no returns schema**: calls original, returns result
- **Args fail, onError='throw'**: throws Error with param validation message
- **Args fail, onError='result'**: returns err with `ERRORS.FUNCTION.PARAM_VALIDATION_FAILED`
- **validateArgs message ternary**: one test where `v.flatten().nested` is truthy (tuple schema with nested issues), one where it's falsy

**createWrapper — return validation (non-Result)**:
- **Return passes**: returns value unchanged
- **Return fails, onError='throw'**: throws Error
- **Return fails, onError='result'**: returns err with `ERRORS.FUNCTION.RETURN_VALIDATION_FAILED`

**createWrapper — return validation (Result-aware)**:
- **Ok Result with valid .data**: returns Result unchanged
- **Ok Result with invalid .data, throw**: throws Error
- **Ok Result with invalid .data, result**: returns err
- **Err Result**: passes through without validation (isResult true, !value.ok branch)

**createWrapper — async (Promise) return**:
- **Async function returns valid value**: resolves to validated value
- **Async function returns invalid value, throw**: rejects with Error

**createWrapper — no argsSchema, no returnsSchema**: passes through unchanged

**Wrapper metadata**:
- Wrapper has correct `.name` (`validated(fnName)`)
- Wrapper has WRAPPER_SYMBOL with correct meta

**Files**:
- Edit: `src/function.test.ts`

**Verification**: `pnpm --filter @/schemas/function run qa:test` — tests pass

---

## TASK 5 — args.ts + returns.ts + implement.ts: Cover Pipe Actions

**Status**: [x]

**Gap**: 28 statements, 12 branches, 3 functions — pipe actions with wrapper coordination.

**Plan**:

Tests in `src/function.test.ts`:

**args()**:
- **New wrapper (no prior returns)**: wraps function with args validation
- **Existing wrapper (returns already applied)**: coordinates via getWrapperMeta, creates unified wrapper
- **onError option**: passes through to wrapper

**returns()**:
- **New wrapper (no prior args)**: wraps function with return validation
- **Existing wrapper (args already applied)**: coordinates via getWrapperMeta

**args() + returns() in same pipe**:
- Both validations active in a single wrapper (not nested)
- Invalid args → error before fn called
- Invalid return → error after fn called
- Valid args + valid return → success

**implement()**:
- **With prior wrapper**: re-creates wrapper with new implementation
- **Without prior wrapper**: returns fn as-is
- **Full pipe**: `v.pipe(functionSchema(), args(...), returns(...), implement(fn))` — validates args, calls fn, validates return

**Files**:
- Edit: `src/function.test.ts`

**Verification**: `pnpm --filter @/schemas/function run qa:test` — tests pass

---

## TASK 6 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules or commands to register — test-only changes
- Verify test file matches vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/schemas/function run qa:test` discovers test file, no orphaned tests

---

## TASK 7 — Integration Verification

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

## TASK 8 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm --filter @/schemas/function run qa:test:coverage`
- Verify all 4 coverage thresholds pass (S >= 80%, B >= 75%, F >= 80%, L >= 80%)

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 9 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all test files exist and pass
- Verify coverage meets all thresholds (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions
- Commit with descriptive message

**Verification**:
- Test count >= 40
- All coverage metrics pass thresholds
- `pnpm --filter @/schemas/function run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | types.ts — schema definitions | -- |
| 2 | function.ts — functionSchema + isAsyncFunction | -- |
| 3 | arity.ts — all arity branches | -- |
| 4 | wrapper-utils.ts — createWrapper + validate helpers | -- |
| 5 | args.ts + returns.ts + implement.ts — pipe actions | 4 |
| 6 | Register rules + config | 1-5 |
| 7 | Integration verification | 6 |
| 8 | Full QA + Coverage | 7 |
| 9 | Final verification + commit | 8 |
