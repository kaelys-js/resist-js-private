# `@/locale` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: `@/locale` (`packages/shared/locale/src/`)
**Goal**: Make `pnpm -w run qa:lint packages/shared/locale` exit 0 by resolving every oxlint diagnostic at the source — no rule disable comments, no assertion weakening.
**Architecture**: All 40 diagnostics live in 5 test files. Most are mechanical (curly braces, JSDoc, numeric separators, import dedup, modern array methods). Two architectural calls (already approved by user): (a) add `max-classes-per-file: "off"` to the existing `*.test.ts` override block in `.oxlintrc.json` — test files legitimately mock `Intl.Locale`/`Intl.DateTimeFormat` constructors and need many fake classes per file; (b) add a no-op method to two `class { constructor() { throw } }` mocks to satisfy `no-extraneous-class` while keeping `typeof Intl.Locale` shape.

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
| `qa:lint packages/shared/locale` exit code | 1 |
| Total diagnostics | 40 |
| `oxlint/curly` (template.test.ts) | 22 |
| `oxlint/no-duplicate-imports` (template.test.ts × 3, svelte.svelte.test.ts × 1) | 4 |
| `oxlint/max-classes-per-file` (direction × 9, template × 3, og × 2) | 3 |
| `oxlint/require-param` (svelte.svelte.test.ts) | 3 |
| `oxlint/require-returns` (svelte.svelte.test.ts) | 3 |
| `oxlint/no-extraneous-class` (direction.test.ts) | 2 |
| `oxlint/numeric-separators-style` (format × 1, template × 1) | 2 |
| `oxlint/no-useless-undefined` (format.test.ts) | 1 |
| `oxlint/prefer-spread` (template.test.ts) | 1 |
| `oxlint/no-array-reverse` (template.test.ts) | 1 |
| Tests in `@/locale` | last known passing |

---

## TASK 1 — Relax `max-classes-per-file` for test files in oxlint config

**Status**: [x]

**Gap**: `direction.test.ts` mocks `Intl.Locale` 9 times (one fake class per branch under test). `template.test.ts` mocks `Intl.DateTimeFormat` 3 times. `og.test.ts` mocks `Intl.Locale` 2 times. The rule's `max: 1` is correct for production code but fights the per-test mock pattern. Test files already have a dedicated override block at `.oxlintrc.json:540-564`.

**Plan**:
- Add `"max-classes-per-file": "off"` inside the test-files override at `.oxlintrc.json:540-564`.
- Place it next to the other test-only relaxations (e.g. after `"new-cap": "off"`).

**Files**:
- Edit: `.oxlintrc.json`

**Verification**:
- After edit: `pnpm -w run qa:lint packages/shared/locale 2>&1` no longer reports `oxlint/max-classes-per-file` (3 fewer diagnostics).

---

## TASK 2 — Fix `template.test.ts` (28 diagnostics)

**Status**: [x]

**Gap**: 22 single-line `if (!result.ok) return;` and `if (!buildResult.ok) return;` (curly), 3 split value+type imports (no-duplicate-imports), 1 `value.split('').reverse().join('')` (prefer-spread + no-array-reverse), 1 `50000` (numeric-separators-style).

**Plan**:
- Replace all `if (!result.ok) return;` with `if (!result.ok) { return; }` (replace_all, single Edit). 16 occurrences expected.
- Replace all `if (!buildResult.ok) return;` with `if (!buildResult.ok) { return; }` (replace_all, single Edit). 6 occurrences expected.
- Merge imports at lines 3-4, 5-6, 8-9 of `template.test.ts`:
  - `import { StrSchema, NumSchema } from '@/schemas/common';` + `import type { Str } from '@/schemas/common';` → `import { StrSchema, NumSchema, type Str } from '@/schemas/common';`
  - `import { ERRORS, ok, err } from '@/schemas/result/result';` + `import type { Result } from '@/schemas/result/result';` → `import { ERRORS, ok, err, type Result } from '@/schemas/result/result';`
  - `import { messageTemplate, renderMessage, buildLocale } from './template';` + `import type { FormatterMap } from './template';` → `import { messageTemplate, renderMessage, buildLocale, type FormatterMap } from './template';`
- Line 1809: `value.split('').reverse().join('')` → `[...value].toReversed().join('')` (kills both `prefer-spread` and `no-array-reverse`; `[...value]` correctly iterates code points; `toReversed()` is non-mutating and the test does not re-read `value`).
- Line 2258: `{ n: 50000 }` → `{ n: 50_000 }`.

**Files**:
- Edit: `packages/shared/locale/src/template.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/locale` reports 0 diagnostics for `template.test.ts`.

---

## TASK 3 — Fix `svelte.svelte.test.ts` (7 diagnostics)

**Status**: [x]

**Gap**: 1 split value+type import for `./registry` (no-duplicate-imports). 3 helper functions (`wrapRegistry`, `fakeErr`, `fakeOk`) missing `@param`/`@returns` JSDoc tags.

**Plan**:
- Merge `import { createLocaleRegistry } from './registry';` + `import type { LocaleRegistry } from './registry';` → `import { createLocaleRegistry, type LocaleRegistry } from './registry';`.
- Add `@param base`, `@param overrides`, `@returns` tags to `wrapRegistry` JSDoc (currently has body description only).
- Add `@param code`, `@param message`, `@returns` tags to `fakeErr` JSDoc.
- Add `@param data`, `@returns` tag to `fakeOk` JSDoc.

**Files**:
- Edit: `packages/shared/locale/src/svelte.svelte.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/locale` reports 0 diagnostics for `svelte.svelte.test.ts`.

---

## TASK 4 — Fix `direction.test.ts` (2 diagnostics)

**Status**: [x]

**Gap**: Lines 297 and 414 — `class { constructor() { throw new Error(...) } }` flagged by `no-extraneous-class` ("only a constructor"). Cannot replace with a function: the class is cast to `typeof Intl.Locale` (a constructor type) and instantiated with `new`. Refactor approach: add a no-op method so the class has more than just a constructor.

**Plan**:
- At `direction.test.ts:297-301`: add a `_unused(): void {}` method to the class body (after the throwing constructor). Method is never invoked — purely satisfies the rule.
- At `direction.test.ts:414-418`: same — add `_unused(): void {}` to the `forceStaticLookup` helper's `FakeLocale`.

**Files**:
- Edit: `packages/shared/locale/src/direction.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/locale` reports 0 `no-extraneous-class` diagnostics.

---

## TASK 5 — Fix `format.test.ts` (2 diagnostics)

**Status**: [x]

**Gap**: Line 919 — `of: () => undefined` (no-useless-undefined). Line 1146 — `3.14159` (numeric-separators-style).

**Plan**:
- Line 919: replace the arrow `of: () => undefined` with the method-shorthand form `of(): undefined { return; }`. Same return type (`undefined`); `return;` returns undefined; `no-useless-undefined` does not flag bare `return;`.
- Line 1146: `formatUnit(3.14159, ...)` → `formatUnit(3.141_59, ...)` (oxlint default groups fractional digits in 3s from the decimal point).

**Files**:
- Edit: `packages/shared/locale/src/format.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/locale` reports 0 diagnostics for `format.test.ts`.

---

## TASK 6 — Register Rules + Config

**Status**: [x]

**Plan**:
- TASK 1 modifies `.oxlintrc.json` (already part of the test-files override array — no separate registration needed).
- TASKS 2-5 only edit existing test files — no new exports, no entry-point changes, no rule files.

**Files**:
- None — no registration surface for this change.

**Verification**:
- `git diff --name-only HEAD` lists only `.oxlintrc.json`, the four `*.test.ts` files, and this plan doc.

---

## TASK 7 — Integration Verification

**Status**: [x]

**Plan**:
- Command registration check: `grep -c registerCommand packages/shared/locale/src` is unchanged (no new commands).
- Config settings read check: `grep -c "config\.get(" packages/shared/locale/src` is unchanged.
- Class instantiation / feature-wired check: each fake class added in TASK 4 is referenced by an existing `globalThis.Intl = { ...RealIntl, Locale: FakeLocale ... }` assignment — confirm both `_unused` additions sit inside their original `FakeLocale` block (no orphaned methods).
- Dead code / unused export check: `git diff --stat` should show only line-edits in test files plus 1 line added to `.oxlintrc.json`.

**Verification**:
- All four counts above match baselines.
- `git diff --name-only HEAD` shows exactly: `.oxlintrc.json`, `direction.test.ts`, `format.test.ts`, `svelte.svelte.test.ts`, `template.test.ts`, plan doc.

---

## TASK 8 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint packages/shared/locale` — must exit 0.
- Run: `pnpm -r --filter @/locale run qa:test` — every test still passes.

**Verification**:
- `pnpm -w run qa:lint packages/shared/locale; echo $?` outputs `0`.
- `pnpm -r --filter @/locale run qa:test 2>&1 | tail -5` shows all tests passed.

---

## TASK 9 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all five edited files match the spec above.
- Verify `pnpm -w run qa:lint packages/shared/locale` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message states "fix(locale): clear all qa:lint diagnostics" and lists the rules cleared.

**Verification**:
- `pnpm -w run qa:lint packages/shared/locale; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes the literal phrase `qa:lint` and `locale`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Relax `max-classes-per-file` for test files | -- |
| 2 | Fix `template.test.ts` | -- |
| 3 | Fix `svelte.svelte.test.ts` | -- |
| 4 | Fix `direction.test.ts` | -- |
| 5 | Fix `format.test.ts` | -- |
| 6 | Register Rules + Config | 1-5 |
| 7 | Integration Verification | 6 |
| 8 | Full QA + Coverage | 7 |
| 9 | Final verification + commit | 8 |
