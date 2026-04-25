# Generic Schemas — Push Coverage From 0% Past All Thresholds

## Context

`qa:test:coverage` for `@/schemas/generic` fails all 4 thresholds — the package has zero test files. 5 statements, 3 branches, 3 functions, 5 lines all at 0%. This is a tiny package with 2 source files: `generic.ts` (3 functions: `_toGenericSchema` cast, `generic()` factory, `isGenericSchema()` type guard) and `types.ts` (1 Valibot schema: `GenericSchemaMetaSchema`). This plan adds a test file covering all functions, branches, and the schema definition.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/schemas/generic` (`packages/shared/schemas/generic/src/`)
**Goal**: Raise all coverage metrics past thresholds (S:80%, B:75%, F:80%, L:80%) with test-only changes. Currently all at 0%.
**Architecture**: Vitest + v8 coverage; Valibot schemas (`v.strictObject`, `v.literal`); `Object.defineProperty` for non-enumerable metadata; type guard with 3-condition `&&` chain.

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
| Statements | 0% (0/5) |
| Branches | 0% (0/3) |
| Functions | 0% (0/3) |
| Lines | 0% (0/5) |
| Thresholds | S:80% B:75% F:80% L:80% |

### Per-file uncovered code

| File | Stmts | Branches | Functions | Key Code |
|------|-------|----------|-----------|----------|
| generic.ts | 4 | 3 | 3 | `_toGenericSchema()` cast (line 37), `generic()` factory with `Object.defineProperty` (lines 124-130), `isGenericSchema()` type guard with 3-condition `&&` chain (lines 155-157) |
| types.ts | 1 | 0 | 0 | `GenericSchemaMetaSchema` definition with `v.strictObject({ __isGenericSchema: v.literal(true) })` (lines 57-60) |

---

## TASK 1 — generic() + _toGenericSchema() + isGenericSchema(): Cover All Functions and Branches

**Status**: [x]

**Gap**: 4 statements, 3 branches, 3 functions in `generic.ts` — all untested.

**Plan**:

Tests in `src/generic.test.ts` (new file):

**`generic()` factory**:
- Creates a generic schema factory from a function, verify `result.__isGenericSchema` is `true`
- Returned function is callable — `const BoxSchema = generic(<T>(s: v.GenericSchema<T>) => v.object({ value: s }))` then `BoxSchema(v.string())` produces a valid schema
- Property `__isGenericSchema` is non-enumerable — `Object.keys(result)` does not include it
- Property `__isGenericSchema` is non-writable — verify `Object.getOwnPropertyDescriptor` returns `writable: false`

**`isGenericSchema()` type guard — all 3 branches**:
- Returns `true` for function created by `generic()` (all 3 conditions pass)
- Returns `false` for non-function: string `'hello'` (fails `typeof === 'function'`)
- Returns `false` for non-function: number `42` (fails `typeof === 'function'`)
- Returns `false` for non-function: `null` (fails `typeof === 'function'`)
- Returns `false` for non-function: plain object `{}` (fails `typeof === 'function'`)
- Returns `false` for plain function without property: `() => {}` (fails `'__isGenericSchema' in value`)
- Returns `false` for function with `__isGenericSchema = false` (fails `=== true`)

**`GenericSchemaMetaSchema`**:
- `v.safeParse(GenericSchemaMetaSchema, { __isGenericSchema: true })` succeeds
- `v.safeParse(GenericSchemaMetaSchema, { __isGenericSchema: false })` fails
- `v.safeParse(GenericSchemaMetaSchema, {})` fails
- `v.safeParse(GenericSchemaMetaSchema, { __isGenericSchema: true, extra: 1 })` fails (strictObject)

**Files**:
- Create: `src/generic.test.ts`

**Verification**: `pnpm --filter @/schemas/generic run qa:test` — tests pass

---

## TASK 2 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules or commands to register — test-only changes
- Verify test file matches vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/schemas/generic run qa:test` discovers test file, no orphaned tests

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
- Run: `pnpm --filter @/schemas/generic run qa:test:coverage`
- Verify all 4 coverage thresholds pass (S >= 80%, B >= 75%, F >= 80%, L >= 80%)

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 5 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all test files exist and pass
- Verify coverage meets all thresholds (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions
- Commit with descriptive message

**Verification**:
- Test count >= 10
- All coverage metrics pass thresholds
- `pnpm --filter @/schemas/generic run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | generic.ts + types.ts — all functions, branches, schema | -- |
| 2 | Register rules + config | 1 |
| 3 | Integration verification | 2 |
| 4 | Full QA + Coverage | 3 |
| 5 | Final verification + commit | 4 |
