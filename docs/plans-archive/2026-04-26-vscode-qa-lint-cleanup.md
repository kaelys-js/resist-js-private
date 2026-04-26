# `@/vscode` (`packages/shared/config/tooling/vscode`) — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: `packages/shared/config/tooling/vscode/src/`
**Goal**: Make `pnpm -w run qa:lint packages/shared/config/tooling/vscode` exit 0 by resolving every diagnostic at the source — no rule disable comments, no assertion weakening.

## Context

`pnpm -w run qa:lint packages/shared/config/tooling/vscode` exits 1 with **25 diagnostics across 4 test files**. All issues are mechanical or local rewrites — no rule overrides required.

| Rule | Count | File distribution |
|------|-------|-------------------|
| `oxlint/first` | 5 | `lint/provider.test.ts` — `import` statements at lines 381, 382, 491, 492, 883 placed AFTER `describe` blocks. |
| `oxlint/curly` | 5 | `file-watcher.test.ts` (2: `for-of` single-statement at lines 165, 357), `lint/provider.test.ts` (3: lines 540, 543, 545). |
| `oxlint/require-returns` | 3 | `panel.test.ts` (lines 33, 48, 56). |
| `oxlint/require-param` | 2 | `panel.test.ts` (lines 33, 57). |
| `oxlint/no-duplicates` | 2 | `lint/provider.test.ts` line 15 — `./provider` imported 3 times across the file. |
| `oxlint/no-duplicate-imports` | 2 | Same root cause — `./provider` re-imported at lines 381, 883. |
| `oxlint/require-await` | 1 | `panel.test.ts:531` — `vi.fn(async (callback) => { callback(...) })`; body has no `await`. |
| `oxlint/prefer-destructuring` | 1 | `panel.test.ts:34` — `const calls = (vscode.commands.registerCommand as ...).mock.calls`. |
| `oxlint/prefer-at` | 1 | `lint/provider.test.ts:1103` — `options.args[options.args.length - 1]` → `options.args.at(-1)`. |
| `oxlint/no-useless-undefined` | 1 | `lint/provider.test.ts:1249` — `() => undefined` → `() => {}` for the mock `getWordRangeAtPosition`. |
| `oxlint/no-loop-func` | 1 | `lint/provider.test.ts:1357` — `it(...)` arrow defined inside `for (const [...] of supportedLanguages)` loop captures the loop variable. |
| `oxlint/no-dynamic-delete` | 1 | `extension.test.ts:328` — `delete h.cfgValues[key]` → `Reflect.deleteProperty(h.cfgValues, key)`. |

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
| `qa:lint packages/shared/config/tooling/vscode` exit code | 1 |
| Total diagnostics | 25 |
| `oxlint/first` | 5 |
| `oxlint/curly` | 5 |
| `oxlint/require-returns` + `require-param` | 5 |
| `oxlint/no-duplicate-imports` + `no-duplicates` | 4 |
| Other (`require-await`, `prefer-destructuring`, `prefer-at`, `no-useless-undefined`, `no-loop-func`, `no-dynamic-delete`) | 6 |

---

## TASK 1 — Fix `panel.test.ts` (5 diagnostics)

**Status**: [ ]

**Gap**: 2 `require-param` + 3 `require-returns` on three test helpers (`getCommandHandler` line 33, `getTreeView` line 48, `makeDiagnosticDetailItem` line 56); 1 `prefer-destructuring` (line 34) — `const calls = (vscode.commands.registerCommand as ...).mock.calls` should destructure; 1 `require-await` (line 531) — `vi.fn(async (callback) => { callback(...) })`.

**Plan**:
- Expand each helper's JSDoc to include `@param` and `@returns`:
  - `getCommandHandler`: `@param commandId - The command id …` + `@returns The handler arrow registered for that id.`
  - `getTreeView`: `@returns The mock TreeView returned from the first createTreeView call.`
  - `makeDiagnosticDetailItem`: `@param code - …` + `@param data - …` + `@returns A populated DiagnosticDetailItem fixture.`
- Line 34: `const calls = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.calls;` → destructure: `const { calls } = vscode.commands.registerCommand as ReturnType<typeof vi.fn>['mock'] extends infer M ? M : never;` — but TS may not infer well. Pragmatic fix: extract the cast first then destructure: `const mockFn = vscode.commands.registerCommand as ReturnType<typeof vi.fn>; const { calls } = mockFn.mock;`. Inspect the rule's exact help text and apply the form it suggests.
- Line 531: `vi.fn(async (callback: (builder: unknown) => void) => { callback({ replace: editReplaceSpy }); });` — drop `async` (the body returns `void` synchronously, so the `vi.fn` is just wrapping a sync callback). The function-under-test (`workspace.applyEdit`) returns `Thenable<boolean>`, so vi.fn must produce a Promise — keep `async` and add `await Promise.resolve();` no-op as the first line of the body.

**Files**:
- Edit: `packages/shared/config/tooling/vscode/src/shared/panel/panel.test.ts`

**Verification**: 0 diagnostics on file. Tests still pass.

---

## TASK 2 — Fix `file-watcher.test.ts` (2 curly)

**Status**: [ ]

**Gap**: 2 `for-of` loops with single inline statements at lines 165, 357.

**Plan**:
- Wrap each `for (const d of disposables) d.dispose();` body in braces:
  ```ts
  for (const d of disposables) {
    d.dispose();
  }
  ```
  Apply at both sites.

**Files**:
- Edit: `packages/shared/config/tooling/vscode/src/shared/file-watcher.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 3 — Fix `extension.test.ts` (1 no-dynamic-delete)

**Status**: [ ]

**Gap**: `delete h.cfgValues[key]` at line 328 dynamically deletes a computed property key.

**Plan**:
- Replace with `Reflect.deleteProperty(h.cfgValues, key);`. Equivalent semantics, satisfies the rule.

**Files**:
- Edit: `packages/shared/config/tooling/vscode/src/extension.test.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 4 — Fix `lint/provider.test.ts` (17 diagnostics)

**Status**: [ ]

**Gap**: 5 `first` (imports after describe blocks at lines 381, 382, 491, 492, 883), 4 `no-duplicate-imports` + `no-duplicates` (`./provider` imported in 3 places — line 15 plus lines 381 + 883), 3 `curly` (lines 540, 543, 545), 1 `no-loop-func` (line 1357 inside a for-of), 1 `prefer-at` (line 1103), 1 `no-useless-undefined` (line 1249).

**Plan**:
1. **Hoist + merge imports** (eliminates 4-of-4 import-related diagnostics):
   - The top of the file already imports from `./provider` at lines 11-15. Add the additional named imports `isExcludedPath`, `lintWorkspace`, `type LintProgress` from line 381/883 to the top-of-file import block.
   - Add the imports from line 491-492 (`getBinaryPath, getWorkspaceRoot` from `'../shared/workspace'`, `logError` from `'../shared/output'`) to the top-of-file imports.
   - Add `readFileSync` from `'node:fs'` (line 382) to the top.
   - Delete the orphaned `import` statements at lines 381, 382, 491, 492, 883.
2. **Curly fixes** (lines 540, 543, 545):
   - Line 540: `if (lineText.length === 0) return;` → `if (lineText.length === 0) { return; }`.
   - Line 543: `while (end < lineText.length && lineText[end] !== ' ') end++;` → `while (...) { end++; }`.
   - Line 545: `if (end === pos.character) return;` → `if (end === pos.character) { return; }`.
3. **Line 1103 `prefer-at`**: `options.args[options.args.length - 1]` → `options.args.at(-1)`. The expected value is `'.'` — `at(-1)` returns the last element of a non-empty array, equivalent to indexing `length - 1`. The result will be typed as `T | undefined`; the existing `expect(...).toBe('.')` already validates non-undefined.
4. **Line 1249 `no-useless-undefined`**: `() => undefined` → `() => {}`. The mock's return type allows `Range | undefined`; an empty arrow body returns `undefined` implicitly.
5. **Line 1357 `no-loop-func`**: the `it(...)` callback inside `for (const [languageId, expectedFilename] of supportedLanguages)` references `languageId` and `expectedFilename` which the rule considers unsafe (var-hoisting in the loop). Refactor to `it.each(supportedLanguages)('generates synthetic filename "%s" for %s', async ([languageId, expectedFilename]) => { ... })` — Vitest's `it.each` is the idiomatic loop-free form.

**Files**:
- Edit: `packages/shared/config/tooling/vscode/src/lint/provider.test.ts`

**Verification**: 0 diagnostics on file. All tests in this file still pass.

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No oxlint config changes (no rule disables).
- No new exports.

**Files**: None.

**Verification**: `git diff --name-only HEAD` lists exactly the 4 edited test files plus the plan doc.

---

## TASK 6 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: unchanged (no commands modified).
- Config settings read check: unchanged.
- Class instantiation check: no new classes.
- No deletions this round.

**Verification**: All four counts match baselines.

---

## TASK 7 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- `pnpm -w run qa:format`
- `pnpm -w run qa:lint packages/shared/config/tooling/vscode` — must exit 0.
- Resolve test command from `packages/shared/config/tooling/vscode/package.json` and run package tests.

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/vscode; echo $?` outputs `0`.
- All package tests pass (count ≥ baseline).

---

## TASK 8 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 4 edited files match the spec.
- Verify lint exit 0, clean tree after commit.
- Commit message: `fix(vscode): clear all qa:lint diagnostics` listing rules cleared (first, curly, require-returns, require-param, no-duplicate-imports, no-duplicates, require-await, prefer-destructuring, prefer-at, no-useless-undefined, no-loop-func, no-dynamic-delete).

**Verification**:
- Lint exit 0.
- Clean tree.
- Commit message includes `qa:lint` + `vscode`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix `panel.test.ts` | -- |
| 2 | Fix `file-watcher.test.ts` | -- |
| 3 | Fix `extension.test.ts` | -- |
| 4 | Fix `lint/provider.test.ts` | -- |
| 5 | Register Rules + Config | 1-4 |
| 6 | Integration Verification | 5 |
| 7 | Full QA + Coverage | 6 |
| 8 | Final verification + commit | 7 |
