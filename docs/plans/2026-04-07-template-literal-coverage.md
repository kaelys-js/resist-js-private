# Template Literal Schemas — Push Coverage Past All Thresholds

## Context

`qa:test:coverage` for `@/schemas/template-literal` fails 3 of 4 thresholds — statements 60.1% (need 80%), branches 50.39% (need 75%), lines 60.1% (need 80%). Functions at 100%. The main gap is in `regex.ts`: 6 untested schema types in `schemaToRegex()`, 11 untested pipe actions in `_introspectPipe()`, and several edge-case branches. This plan adds tests to the existing `template-literal.test.ts` to cover every uncovered branch.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/schemas/template-literal` (`packages/shared/schemas/template-literal/src/`)
**Goal**: Raise S, B, L coverage past thresholds (S:80%, B:75%, F:80%, L:80%) with test-only changes. Currently S:60.1%, B:50.39%, F:100%, L:60.1%.
**Architecture**: Vitest + v8 coverage; Valibot schemas with custom `BaseSchema` implementation; regex generation from schema types; pipe introspection for tighter regex patterns; Result pattern (`ok()`/`err()`).

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
| Tests | 32 total (32 pass, 1 test file) |
| Statements | 60.1% — need 80% |
| Branches | 50.39% — need 75% |
| Functions | 100% — passing |
| Lines | 60.1% — need 80% |
| Thresholds | S:80% B:75% F:80% L:80% |

### Per-file uncovered code

| File | Key Gaps |
|------|----------|
| regex.ts (502 lines) | 6 schema types in `schemaToRegex()`: bigint, null, undefined, enum, optional, nullish. 11 pipe actions in `_introspectPipe()`: email, ulid, cuid2, nanoid, ipv4, hexadecimal, octal, decimal, slug, starts_with, ends_with. Edge cases: skip conditions (non-object/null/no-type in pipe loop), length-only branch, minLen-only, maxLen-only, hasUserRegex suppression, default SchemaWithPipe fallback, buildExpects 'unknown' fallback. |
| template-literal.ts (161 lines) | Mostly covered. Minor: `buildRegex` error propagation, `buildExpects` error propagation. |
| types.ts (202 lines) | `_toTemplateLiteralSchema()` — implicitly covered via `templateLiteral()` calls. |
| infer.ts (181 lines) | Pure types, ZERO runtime code — no coverage impact. |

---

## TASK 1 — schemaToRegex(): Cover 6 Untested Schema Types

**Status**: [x]

**Gap**: `bigint`, `null`, `undefined`, `enum`, `optional`, `nullish` branches in `schemaToRegex()` (regex.ts lines 296-392) — 0% covered. ~40 statements + ~20 branches.

**Plan**:

Tests in `src/template-literal.test.ts` (extend existing file), new `describe('schemaToRegex — additional schema types')`:

- **bigint**: `templateLiteral(['big_', v.bigint()])` — accepts `'big_42'`, `'big_-7'`, rejects `'big_3.14'`. Verify regex contains `BIGINT_PATTERN` (`-?\d+`).
- **null**: `templateLiteral(['val_', v.null_()])` — accepts `'val_null'`, rejects `'val_undefined'`.
- **undefined**: `templateLiteral(['val_', v.undefined_()])` — accepts `'val_undefined'`, rejects `'val_null'`.
- **enum**: `templateLiteral(['status_', v.enum_(MyEnum)])` with `enum MyEnum { A = 'active', I = 'inactive' }` — accepts `'status_active'`, `'status_inactive'`, rejects `'status_pending'`.
- **optional**: `templateLiteral(['opt_', v.optional(v.number())])` — accepts `'opt_42'`, `'opt_undefined'`, rejects `'opt_null'`.
- **nullish**: `templateLiteral(['ns_', v.nullish(v.number())])` — accepts `'ns_42'`, `'ns_null'`, `'ns_undefined'`, rejects `'ns_abc'`.

**Files**:
- Edit: `src/template-literal.test.ts`

**Verification**: `pnpm --filter @/schemas/template-literal run qa:test` — new tests pass

---

## TASK 2 — _introspectPipe(): Cover 11 Untested Pipe Actions

**Status**: [x]

**Gap**: `email`, `ulid`, `cuid2`, `nanoid`, `ipv4`, `hexadecimal`, `octal`, `decimal`, `slug`, `starts_with`, `ends_with` branches in `_introspectPipe()` (regex.ts lines 133-230) — 0% covered. ~50 statements + ~20 branches.

**Plan**:

Tests in `src/template-literal.test.ts`, new `describe('_introspectPipe — additional pipe actions')`:

- **email**: `v.pipe(v.string(), v.email())` — accepts `'user_test@example.com'`, rejects `'user_notanemail'`.
- **ulid**: `v.pipe(v.string(), v.ulid())` — accepts valid ULID (`01ARZ3NDEKTSV4RRFFQ69G5FAV`), rejects lowercase.
- **cuid2**: `v.pipe(v.string(), v.cuid2())` — accepts `'clh3am8jg0000lf08e8s2hqzq'`-style string, rejects uppercase start.
- **nanoid**: `v.pipe(v.string(), v.nanoid())` — accepts `'V1StGXR8_Z5jdHi6B-myT'`, rejects special chars.
- **ipv4**: `v.pipe(v.string(), v.ipv4())` — accepts `'192.168.1.1'`, rejects `'999.999.999.999'`.
- **hexadecimal**: `v.pipe(v.string(), v.hexadecimal())` — accepts `'deadBEEF'`, rejects `'xyz'`.
- **octal**: `v.pipe(v.string(), v.octal())` — accepts `'01234567'`, rejects `'089'`.
- **decimal**: `v.pipe(v.string(), v.decimal())` — accepts `'-3.14'`, rejects `'abc'`.
- **slug**: `v.pipe(v.string(), v.slug())` — accepts `'my-cool-slug'`, rejects `'My Slug!'`.
- **starts_with**: `v.pipe(v.string(), v.startsWith('prefix_'))` — accepts `'prefix_hello'`, rejects `'hello_prefix'`.
- **ends_with**: `v.pipe(v.string(), v.endsWith('_suffix'))` — accepts `'hello_suffix'`, rejects `'suffix_hello'`.

Each test wraps the piped schema in `templateLiteral(asParts(['key_', pipedSchema]))` and uses `v.is()` to validate accept/reject.

**Files**:
- Edit: `src/template-literal.test.ts`

**Verification**: `pnpm --filter @/schemas/template-literal run qa:test` — new tests pass

---

## TASK 3 — Edge Cases: Skip Conditions, Length Branches, buildExpects Fallback

**Status**: [x]

**Gap**: Pipe loop skip conditions (regex.ts line 111), length-only via `v.length()` (line 194-203), minLen-only pattern (line 247-249 with `maxLen === undefined`), maxLen-only pattern, `hasUserRegex` suppressing length constraints (line 246), default `SchemaWithPipe` fallback (lines 406-424), `buildExpects` 'unknown' fallback (line 495). ~20 statements + ~15 branches.

**Plan**:

Tests in `src/template-literal.test.ts`, new `describe('edge cases')`:

- **v.length() exact**: `v.pipe(v.string(), v.length(5))` — accepts 5-char string, rejects 4-char and 6-char. Verifies `{5,5}` quantifier.
- **minLength only (no maxLength)**: `v.pipe(v.string(), v.minLength(3))` — accepts 3+ chars, rejects 2 chars. Verifies `{3,}` quantifier.
- **maxLength only (no minLength)**: `v.pipe(v.string(), v.maxLength(5))` — accepts 0-5 chars, rejects 6 chars. Verifies `{0,5}` quantifier.
- **regex + length (hasUserRegex suppresses length)**: `v.pipe(v.string(), v.regex(/^[A-Z]+$/), v.minLength(2))` — the regex takes precedence, length constraint is NOT applied. Accepts `'A'` (1 char, matches regex but would fail minLength — but hasUserRegex=true skips length application).
- **default SchemaWithPipe fallback**: construct a `v.pipe(v.string(), v.trim())` — `trim` is not a recognized action type, so pattern falls through to `schemaToRegex(v.string())` via the default branch's pipe introspection path. Verify it still works.
- **buildExpects 'unknown' fallback**: use a schema part that has no `expects` property — create a minimal object `{ type: 'custom' }` cast as `TemplateLiteralPart`. Verify expects string contains `'unknown'`.
- **Pipe loop skip: non-object action**: This is covered implicitly when the first element of a pipe (the base schema) is sliced off and only actions remain — if pipe contains mixed types.

**Files**:
- Edit: `src/template-literal.test.ts`

**Verification**: `pnpm --filter @/schemas/template-literal run qa:test` — new tests pass

---

## TASK 4 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules or commands to register — test-only changes
- Verify test file matches vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/schemas/template-literal run qa:test` discovers test file, no orphaned tests

---

## TASK 5 — Integration Verification

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

## TASK 6 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm --filter @/schemas/template-literal run qa:test:coverage`
- Verify all 4 coverage thresholds pass (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- If any threshold still fails, identify remaining uncovered lines and add targeted tests

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 7 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all test files exist and pass
- Verify coverage meets all thresholds (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions — existing 32 tests still pass
- Commit with descriptive message

**Verification**:
- Test count >= 55 (baseline 32 + ~23 new)
- All coverage metrics pass thresholds
- `pnpm --filter @/schemas/template-literal run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | schemaToRegex — 6 untested schema types | -- |
| 2 | _introspectPipe — 11 untested pipe actions | -- |
| 3 | Edge cases — skip conditions, length branches, fallbacks | -- |
| 4 | Register rules + config | 1-3 |
| 5 | Integration verification | 4 |
| 6 | Full QA + Coverage | 5 |
| 7 | Final verification + commit | 6 |
