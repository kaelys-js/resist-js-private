# `@/config-tooling-vite` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-25
**Package**: `@/config-tooling-vite` (`packages/shared/config/tooling/vite/src/`)
**Goal**: Make `pnpm -w run qa:lint packages/shared/config/tooling/vite` exit 0 by resolving every diagnostic at the source — no rule disable comments, no assertion weakening.

## Context

`pnpm -w run qa:lint packages/shared/config/tooling/vite` exits 1 with **47 oxlint errors across 8 files**. All but 1 of the diagnostics live in `vite-plugin-template-html.test.ts`.

| Rule | Count | Notes |
|------|-------|-------|
| `oxlint/ban-types` + `oxlint/no-unsafe-function-type` | 40 | The same 20 sites are flagged by both rules — all `(plugin.config as Function)(...)` and `(plugin.closeBundle as Function)(...)` in `vite-plugin-template-html.test.ts`. Cast to a specific signature instead: define two type aliases at the top of the test file — `type ConfigHook = (config: object, env: { command: 'build' \| 'serve'; mode: Str }) => unknown;` and `type CloseBundleHook = () => unknown;` — and replace each `as Function` with `as ConfigHook` / `as CloseBundleHook`. |
| `oxlint/first` | 2 | `vite-plugin-template-html.test.ts` lines 14, 16 — `import { readFile, writeFile } from '@/utils/core/fs';` and the local `import` block come AFTER `vi.mock(...)` at line 9. `vi.mock()` is auto-hoisted by Vitest, so the imports being below it is purely cosmetic. Move all imports to the top, above `vi.mock`. |
| `oxlint/prefer-destructuring` | 2 | Lines 414, 522 — `const call = writeFileMock.mock.calls[0]` → `const [call] = writeFileMock.mock.calls;`. |
| `oxlint/no-useless-concat` | 1 | Line 498 — `'<html><title>{{APP_NAME}}</title>' + '<script>...'` is two adjacent string literals concatenated. Merge into one literal. |
| `oxlint/numeric-separators-style` | 1 | Line 548 — `mockOk(12345)` → `mockOk(12_345)`. |
| `oxlint/consistent-type-imports` | 1 | `vite-plugin-template-html-edge.test.ts:30` — `await importOriginal<typeof import('@/schemas/result/result')>()` uses `import()` in type position. Replace with a static type-only import at the top: `import type * as ResultModule from '@/schemas/result/result';` then `await importOriginal<typeof ResultModule>()`. |

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
| `qa:lint packages/shared/config/tooling/vite` exit code | 1 |
| Total diagnostics | 47 |
| `oxlint/ban-types` + `no-unsafe-function-type` | 40 (20 sites) |
| `oxlint/first` | 2 |
| `oxlint/prefer-destructuring` | 2 |
| `oxlint/no-useless-concat` | 1 |
| `oxlint/numeric-separators-style` | 1 |
| `oxlint/consistent-type-imports` | 1 |

---

## TASK 1 — Fix `vite-plugin-template-html.test.ts` (45 of 47 diagnostics)

**Status**: [ ]

**Gap**: 20 `as Function` casts (40 diagnostics from two rules), 2 imports below `vi.mock`, 2 `arr[0]`-style accesses, 1 useless string concat, 1 numeric-separator violation.

**Plan**:
1. **Re-order imports**. Move the lines:
   ```ts
   import { readFile, writeFile } from '@/utils/core/fs';

   import { …local exports… } from './vite-plugin-template-html.js';
   ```
   from after `vi.mock(...)` (line 14 onward) to the top of the file, immediately after the existing `import` statements at lines 1-3. Drop the now-stale comment "// Import after mock setup". `vi.mock()` is auto-hoisted by Vitest so module-load order is unaffected.

2. **Add hook type aliases** near the top of the file (after the imports, before fixtures):
   ```ts
   type ConfigHook = (config: object, env: { command: 'build' | 'serve'; mode: Str }) => unknown;
   type CloseBundleHook = () => unknown;
   ```

3. **Replace all `as Function` casts**. Use `replace_all` to change every occurrence of:
   - `as Function)({}, buildEnv)` → `as ConfigHook)({}, buildEnv)` (matches all `plugin.config` invocations — 14 sites).
   - `as Function)()` → `as CloseBundleHook)()` (matches all `plugin.closeBundle` invocations — 6 sites).
   Verify the count before/after each `replace_all`.

4. **Array destructuring**:
   - Line 414: `const call = writeFileMock.mock.calls[0];` → `const [call] = writeFileMock.mock.calls;`
   - Line 522: same edit at this site.

5. **Useless concat** (line 498):
   ```ts
   const MOCK_TEMPLATE: Str =
     '<html><title>{{APP_NAME}}</title>' + '<script>var p = "{{STORAGE_PREFIX}}";</script></html>';
   ```
   →
   ```ts
   const MOCK_TEMPLATE: Str =
     '<html><title>{{APP_NAME}}</title><script>var p = "{{STORAGE_PREFIX}}";</script></html>';
   ```

6. **Numeric separators** (line 548): `mockOk(12345)` → `mockOk(12_345)`.

**Files**:
- Edit: `packages/shared/config/tooling/vite/src/vite-plugin-template-html.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/vite/src/vite-plugin-template-html.test.ts` reports 0 diagnostics.
- All tests in this file still pass after the edits.

---

## TASK 2 — Fix `vite-plugin-template-html-edge.test.ts` (1 diagnostic)

**Status**: [ ]

**Gap**: `await importOriginal<typeof import('@/schemas/result/result')>()` at line 30 uses `import()` in type position.

**Plan**:
- Add `import type * as ResultModule from '@/schemas/result/result';` to the top-of-file imports (next to the existing `Result` type import).
- Replace `typeof import('@/schemas/result/result')` with `typeof ResultModule` in the `importOriginal<...>()` call.

**Files**:
- Edit: `packages/shared/config/tooling/vite/src/vite-plugin-template-html-edge.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/vite/src/vite-plugin-template-html-edge.test.ts 2>&1 | grep -cE '^  ✗ '` returns `0`.
- `pnpm --filter @/config/tooling/vite run qa:test 2>&1 | grep "Tests"` shows `Tests <N> passed` with N >= baseline.

---

## TASK 3 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No oxlint config changes (no rule disables this round).
- No new exports, no entry-point changes.

**Files**: None.

**Verification**: `git diff --name-only HEAD` lists exactly the 2 edited source files plus the plan doc.

---

## TASK 4 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/config/tooling/vite/src` is unchanged (no commands).
- Config settings read check: `grep -rc 'config\.get(' packages/shared/config/tooling/vite/src` is unchanged.
- Class instantiation check: no new classes.
- Dead code / unused export check: no deletions this round.

**Verification**:
- `grep -rc 'registerCommand' packages/shared/config/tooling/vite/src 2>/dev/null | awk -F: '{s+=$2} END{print s}'` returns `0` (no slash-commands in vite plugin).
- `grep -rc 'config\\.get(' packages/shared/config/tooling/vite/src 2>/dev/null | awk -F: '{s+=$2} END{print s}'` matches baseline.
- `grep -rc '^export class\\|^class ' packages/shared/config/tooling/vite/src 2>/dev/null | awk -F: '{s+=$2} END{print s}'` matches baseline.
- `pnpm -w run qa:lint 2>&1 | grep -c 'no-unused-vars'` returns `0`.

---

## TASK 5 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint packages/shared/config/tooling/vite` — must exit 0.
- Run: `pnpm --filter @/config-tooling-vite run qa:test` (resolve actual package name from `package.json` first).

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/vite; echo $?` outputs `0`.
- All package tests pass (count ≥ baseline).

---

## TASK 6 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify both edited source files match the spec above.
- Verify `pnpm -w run qa:lint packages/shared/config/tooling/vite` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message: `fix(config-tooling-vite): clear all qa:lint diagnostics` and lists the rules cleared (ban-types, no-unsafe-function-type, first, prefer-destructuring, no-useless-concat, numeric-separators-style, consistent-type-imports).

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/vite; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes `qa:lint` and `vite`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix `vite-plugin-template-html.test.ts` | -- |
| 2 | Fix `vite-plugin-template-html-edge.test.ts` | -- |
| 3 | Register Rules + Config | 1-2 |
| 4 | Integration Verification | 3 |
| 5 | Full QA + Coverage | 4 |
| 6 | Final verification + commit | 5 |
