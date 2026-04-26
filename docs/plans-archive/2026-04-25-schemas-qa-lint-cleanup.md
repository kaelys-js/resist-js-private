# `@/schemas/*` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-25
**Package**: `packages/shared/schemas/` (workspace of `@/schemas/common`, `@/schemas/result`, `@/schemas/function`, `@/schemas/template-literal`, etc.)
**Goal**: Make `pnpm -w run qa:lint packages/shared/schemas` exit 0 by resolving every diagnostic at the source — no rule disable comments, no assertion weakening.

## Context

`pnpm -w run qa:lint packages/shared/schemas` exits 1 with **202 diagnostics across 5 files** (4 test files + `common/src/index.ts`).

| Rule | Count | File distribution |
|------|-------|-------------------|
| `oxlint/curly` | 132 | result.test.ts (85), function.test.ts (42), common/index.test.ts (5) |
| `oxlint/no-unused-vars` | 24 | common/index.test.ts (23 unused schema imports), common/index.ts (1: `parsed`) |
| `tsgo/TS2769` | 15 | function.test.ts — `r.data` from `arity()` returns `Result<v.CheckAction<FnType, Message>>`, but `Result<T>` wraps `T` with deep-readonly so the `issue.path` tuple becomes `readonly` and isn't structurally assignable to valibot's mutable `[IssuePathItem, ...]`. Fix at each call site by casting `r.data` away from readonly: `r.data as v.CheckAction<FnType, Message>`. |
| `oxlint/consistent-function-scoping` | 6 | function.test.ts (`foo`, `fn`, `asyncFn`, `syncFn`, `myFunc`, `myFn` — non-capturing functions inside `it`). Hoist each to module scope (named per its test purpose). |
| `oxlint/consistent-type-imports` | 5 | common/index.test.ts — five `typeof import('valibot')` inside `vi.mock('valibot', ...)`. Add `import type * as ValibotModule from 'valibot';` at top, replace each occurrence with `typeof ValibotModule`. |
| `oxlint/require-returns` | 3 | result.test.ts:50 (`makeAppError`), template-literal.test.ts:18 (`asSchema`) and :23 (`asParts`). |
| `oxlint/require-param` | 3 | Same three sites. |
| `oxlint/require-await` | 3 | function.test.ts:615, 621, 631 — `async () => 42`, `async () => 'bad'`, `async () => 'bad'` passed to `createWrapper(...)`. The wrapper's first arg signature is `(...args: unknown[]) => unknown` — a Promise-returning function is required for the async-validation tests. Replace each `async () => X` with `() => Promise.resolve(X)`-style? No — Promise.resolve in this rule pair triggered prefer-await-to-then in the result package. Use the same await-no-op pattern: `async () => { await Promise.resolve(); return X; }`. |
| `oxlint/numeric-separators-style` | 2 | common/index.test.ts:197, 205 — `65535` → `65_535`, `65536` → `65_536`. |
| `oxlint/no-negated-condition` | 2 | result.test.ts:585 (`cause: !cause.ok ? cause.error : undefined` → `cause: cause.ok ? undefined : cause.error`), :635 (`[!related.ok ? related.error : makeAppError()]` → `[related.ok ? makeAppError() : related.error]`). |
| `tsgo/TS2554` | 1 | function.test.ts:552 — `wrapper('a', 'b' as unknown)` calls a `(...args: unknown[]) => unknown` typed wrapper but TS narrows to zero args. Cast: `(wrapper as (...args: unknown[]) => unknown)('a', 'b' as unknown)`. |
| `tsgo/TS18046` | 1 | function.test.ts:792 — `r.output(5)` where `r.output` is typed as `unknown`. Cast: `(r.output as (x: number) => number)(5)`. |
| `oxlint/no-new` | 1 | common/index.ts:957 — `new RegExp(s);` as a side-effect-only statement. Assign to a discarded local: `const _re: RegExp = new RegExp(s);`. (The `_` prefix satisfies oxlint's unused-vars allow-pattern.) |
| `oxlint/no-extraneous-class` | 1 | function.test.ts:205 — `class Foo {}` is an "extraneous" empty class used as test fixture. Add an instance property to make it non-empty: `class Foo { static readonly _kind: 'fixture' = 'fixture'; }` — preserves `Function.prototype.toString().startsWith('class ')` semantics the test depends on. |
| `oxlint/new-cap` | 1 | common/index.ts:580 — `Intl.DateTimeFormat(undefined, { timeZone: s });` called without `new`. Wrap with `new` and assign to discarded local: `const _fmt: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, { timeZone: s });`. |

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
| `qa:lint packages/shared/schemas` exit code | 1 |
| Total diagnostics | 202 |
| `oxlint/curly` | 132 |
| `oxlint/no-unused-vars` | 24 |
| `tsgo/TS2769` | 15 |
| `oxlint/consistent-function-scoping` | 6 |
| `oxlint/consistent-type-imports` | 5 |
| `oxlint/require-returns` + `require-param` | 6 |
| `oxlint/require-await` | 3 |
| `oxlint/numeric-separators-style` | 2 |
| `oxlint/no-negated-condition` | 2 |
| `tsgo/TS2554` + `tsgo/TS18046` | 2 |
| `oxlint/no-new` + `no-extraneous-class` + `new-cap` | 3 |

---

## TASK 1 — Fix `common/src/index.ts` (3 source diagnostics)

**Status**: [ ]

**Gap**: 1 `new-cap` (line 580 — `Intl.DateTimeFormat(...)` called without `new`), 1 `no-unused-vars` (line 706 — `parsed` discard), 1 `no-new` (line 957 — `new RegExp(s);` as bare statement).

**Plan**:
- Line 580: change to `const _fmt: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, { timeZone: s });` (the construction throws on invalid timezone — that side effect is what the `try/catch` was relying on; the `_` prefix and explicit type satisfy `new-cap` and `no-unused-vars`).
- Line 706: replace `const parsed: unknown = JSON.parse(s);\n\n      return true;` with `JSON.parse(s);\n      return true;` (drop the unused binding entirely; bare `JSON.parse(s)` still throws on invalid input).
- Line 957: change `new RegExp(s);` to `const _re: RegExp = new RegExp(s);` for the same reason as line 580.

**Files**:
- Edit: `packages/shared/schemas/common/src/index.ts`

**Verification**: 0 diagnostics on file. Validation tests for `TimezoneSchema`, `JsonStringSchema`, `RegexPatternSchema` still pass (rejection on invalid input is preserved via the constructor/parser still throwing inside `try/catch`).

---

## TASK 2 — Fix `common/src/index.test.ts` (35 diagnostics)

**Status**: [ ]

**Gap**: 23 unused-vars (schema imports), 5 `consistent-type-imports` (`typeof import('valibot')`), 2 `numeric-separators-style`, 5 `curly`.

**Plan**:
- Remove these 23 unused names from the `from '@/schemas/common'` block at lines 10-89: `NonNegativeNumberSchema`, `NodeMajorVersionSchema`, `SummarySchema`, `ContentSchema`, `CommentSchema`, `ProductNameSchema`, `TimeOnlySchema`, `CronExpressionSchema`, `RelativeUrlSchema`, `HttpsUrlSchema`, `Ipv4Schema`, `HexColorSchema`, `MimeTypeSchema`, `Md5Schema`, `RegexPatternSchema` is used? Verify each before deletion via the same lint output (the truth source). The 23 names from the current diagnostic output are: `CommandSchema`, `CommentSchema`, `ContentSchema`, `CronExpressionSchema`, `DiscountPercentSchema`, `FilenameSchema`, `FilterOperatorSchema`, `HexColorSchema`, `HttpsUrlSchema`, `Ipv4Schema`, `Md5Schema`, `MimeTypeSchema`, `NodeMajorVersionSchema`, `NonNegativeNumberSchema`, `PaginationOffsetSchema`, `PhoneSchema`, `PlatformSchema`, `ProductNameSchema`, `QuantitySchema`, `RelativeUrlSchema`, `SummarySchema`, `TimeOnlySchema`, `UsernameSchema`.
- Add `import type * as ValibotModule from 'valibot';` near the top.
- Replace all 5 occurrences of `typeof import('valibot')` with `typeof ValibotModule` (sites at lines 831, 857, 883, 909, 935).
- Line 197: `65535` → `65_535`. Line 205: `65536` → `65_536`.
- Wrap the 5 single-line `if` bodies (`curly`) in braces.

**Files**:
- Edit: `packages/shared/schemas/common/src/index.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 3 — Fix `result/src/result.test.ts` (89 diagnostics)

**Status**: [ ]

**Gap**: 85 `curly`, 2 `no-negated-condition`, 1 `require-returns`, 1 `require-param`.

**Plan**:
- Line 50 (`makeAppError`): expand JSDoc to include `@param` and `@returns`.
- Line 585: `cause: !cause.ok ? cause.error : undefined` → `cause: cause.ok ? undefined : cause.error`.
- Line 635: `[!related.ok ? related.error : makeAppError()]` → `[related.ok ? makeAppError() : related.error]`.
- Wrap each of the 85 single-line `if` bodies in braces. Use `replace_all` on common patterns (`if (!result.ok) ... ;` → `if (!result.ok) { ... }`) where unambiguous; fall back to per-site Edits for unique lines.

**Files**:
- Edit: `packages/shared/schemas/result/src/result.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 4 — Fix `function/src/function.test.ts` (71 diagnostics)

**Status**: [ ]

**Gap**: 42 `curly`, 15 `tsgo/TS2769`, 6 `consistent-function-scoping`, 3 `require-await`, 1 `no-extraneous-class`, 1 `tsgo/TS2554`, 1 `tsgo/TS18046`. (Plus possibly require-param/require-returns spillover counted under common.)

**Plan**:
- Hoist 6 functions to module scope (above the first `describe`), renamed where helpful for context:
  - `function foo` (line 176) → module-level `function namedFooFn() {}`
  - `function fn` (line 211) → module-level `function classlikeStringFn() {}` (the test mutates its toString)
  - `async function asyncFn` (line 223) → module-level `async function namedAsyncFn() {}`
  - `function syncFn` (line 232) → module-level `function namedSyncFn() {}`
  - `function myFunc` (line 462) → module-level `function namedMyFunc() { return 1; }`
  - `myFn = (x: number) => x * 2` (line 787) → module-level `const namedMyFn = (x: number): number => x * 2;`
  Update each call site to reference the hoisted binding.
- Line 205 (`class Foo {}`): change to `class FooFixture { static readonly _kind: 'fixture' = 'fixture'; }` and update the call `expect(v.safeParse(schema, FooFixture).success)`.
- Lines 615, 621, 631 (`async () => …` arrows in `createWrapper`): replace each with `async () => { await Promise.resolve(); return …; }` (or for the throw case, `async () => { await Promise.resolve(); throw …; }`). The await-Promise.resolve no-op satisfies `require-await`.
- TS2769 sites (15 calls): each is `v.pipe(functionSchema(), r.data)`. Cast `r.data`: `v.pipe(functionSchema(), r.data as v.CheckAction<FnType, Message>)`. Add the necessary type imports if not present (`import type { FnType } from '@/schemas/function/types';` and `Message` if needed — verify before importing).
- Line 552 (TS2554): `wrapper('a', 'b' as unknown)` → `(wrapper as (...args: unknown[]) => unknown)('a', 'b' as unknown)`.
- Line 792 (TS18046): `r.output(5)` → `(r.output as (x: number) => number)(5)`.
- Wrap each of the 42 single-line `if` bodies in braces.

**Files**:
- Edit: `packages/shared/schemas/function/src/function.test.ts`

**Verification**: 0 diagnostics on file. All function tests still pass (verify hoisting doesn't break test-name semantics).

---

## TASK 5 — Fix `template-literal/src/template-literal.test.ts` (4 diagnostics)

**Status**: [ ]

**Gap**: 2 `require-param` + 2 `require-returns` on the two helper functions `asSchema` (line 18) and `asParts` (line 23).

**Plan**:
- Expand the JSDoc of each helper to add `@param` and `@returns` tags.

**Files**:
- Edit: `packages/shared/schemas/template-literal/src/template-literal.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 6 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No oxlint config changes (no rule disables this round).
- No new exports, no entry-point changes.

**Files**: None.

**Verification**: `git diff --name-only HEAD` lists exactly the 5 edited source files plus the plan doc.

---

## TASK 7 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/schemas` is unchanged.
- Config settings read check: `grep -rc 'config\.get(' packages/shared/schemas` is unchanged.
- Class instantiation check: no new classes.
- Dead code / unused export check: 23 unused-import deletions are confirmed dead (the linter found them).

**Verification**: All four counts match baselines (or improve via deletion).

---

## TASK 8 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint packages/shared/schemas` — must exit 0.
- Run: `pnpm -w exec vitest run --project schemas-common --project schemas-result --project schemas-function --project schemas-template-literal` (or equivalent — resolve test commands from each package's `package.json`).

**Verification**:
- `pnpm -w run qa:lint packages/shared/schemas; echo $?` outputs `0`.
- All tests pass (count ≥ baseline).

---

## TASK 9 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 5 edited source files match the spec above.
- Verify `pnpm -w run qa:lint packages/shared/schemas` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message: `fix(schemas): clear all qa:lint diagnostics` and lists the rules cleared (curly, no-unused-vars, TS2769, consistent-function-scoping, consistent-type-imports, require-returns, require-param, require-await, numeric-separators-style, no-negated-condition, TS2554, TS18046, no-new, no-extraneous-class, new-cap).

**Verification**:
- `pnpm -w run qa:lint packages/shared/schemas; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes `qa:lint` and `schemas`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix `common/src/index.ts` | -- |
| 2 | Fix `common/src/index.test.ts` | -- |
| 3 | Fix `result/src/result.test.ts` | -- |
| 4 | Fix `function/src/function.test.ts` | -- |
| 5 | Fix `template-literal/src/template-literal.test.ts` | -- |
| 6 | Register Rules + Config | 1-5 |
| 7 | Integration Verification | 6 |
| 8 | Full QA + Coverage | 7 |
| 9 | Final verification + commit | 8 |
