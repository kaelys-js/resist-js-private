# Config Tooling Phase 91 — Fix All qa:lint Errors

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-06
**Package**: `packages/shared/config/tooling/` (vscode, lint, vite sub-packages)
**Goal**: Resolve all 36 `qa:lint --tools` errors in `packages/shared/config/tooling/` so the linter exits cleanly.
**Architecture**: Minimum type-level fixes — casts, blank lines, `Object.defineProperty`, non-null assertions. No runtime behavior changes.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Context

After the Phase 90 test coverage push, `qa:lint --tools` reports 36 errors across 11 files in `packages/shared/config/tooling/`. All are type-level diagnostics: unsafe AST casts (TS2352), return-type mismatches (TS2322), readonly property writes (TS2540), missing blank lines (custom rule), possibly-undefined access (TS2532), and empty-tuple indexing (TS2493). No runtime bugs — all tests pass. The goal is zero lint errors.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 748 total (748 pass) |
| qa:lint errors in config/tooling | 36 |
| qa:lint exit code | 1 (failure) |

---

## TASK 1 — Fix svelte5 rule TS2352 unsafe AST casts (18 errors)

**Status**: [ ]

**Gap**: All svelte5 lint rules cast AST nodes as `(node as { name: string })` but the AST base type `{ type, start, end, loc } & { [key: string]: unknown }` does not overlap `{ name: string }`, triggering TS2352.

**Plan**:
- In each file, change `(node as { name: string })` to `(node as unknown as { name: string })` — a double-cast through `unknown` that satisfies tsgo
- All locations already have type-guard checks proving `name` exists before the cast
- Files and exact lines:
  - `_svelte-helpers.ts`: lines 82, 110, 178, 183, 297, 310 (6 casts)
  - `no-legacy-props.ts`: line 46 (1 cast)
  - `no-untrack-misuse.ts`: lines 30, 52, 61 (×2), 74 (×2), 92 (7 casts)
  - `prefer-derived-over-effect.ts`: line 70 (1 cast)
  - `require-bindable-for-bind.ts`: lines 62, 76 (2 casts)
  - `require-snippet-typing.ts`: lines 56, 66 (2 casts)

**Files**:
- Edit: `lint/src/rules/svelte5/_svelte-helpers.ts`
- Edit: `lint/src/rules/svelte5/no-legacy-props.ts`
- Edit: `lint/src/rules/svelte5/no-untrack-misuse.ts`
- Edit: `lint/src/rules/svelte5/prefer-derived-over-effect.ts`
- Edit: `lint/src/rules/svelte5/require-bindable-for-bind.ts`
- Edit: `lint/src/rules/svelte5/require-snippet-typing.ts`
- Test: `lint/src/rules/svelte5/*.test.ts` (existing tests — no changes, verify they still pass)

**Verification**: `pnpm -w run qa:lint --tools 2>&1 | grep TS2352 | grep svelte5` returns zero matches

---

## TASK 2 — Fix cli-helpers.ts TS2322 return type (1 error)

**Status**: [ ]

**Gap**: `runLinter()` at line 1636 returns an object `{ filesLinted: 0, fixesApplied: 0, results: [], ruleDescs: new Map() }` but the function signature is `Promise<number>` (exit code).

**Plan**:
- Change `return { filesLinted: 0, ... }` to `return 1` (error exit code for config validation failure — matching the pattern on lines 1571, 1573, etc.)
- Verify surrounding control flow still correct (the early return guards against running lint with invalid config)

**Files**:
- Edit: `lint/src/cli-helpers.ts` (line 1636)
- Test: `lint/src/cli-helpers.test.ts` (existing tests — no changes, verify they still pass)

**Verification**: `pnpm -w run qa:lint --tools 2>&1 | grep "cli-helpers.ts"` returns zero matches

---

## TASK 3 — Fix vite test TS2322 branded CssFontWeight (3 errors)

**Status**: [ ]

**Gap**: Test fixture strings `'100 900'`, `'600'`, `'700'` are not assignable to branded type `CssFontWeight`. The file already uses `as CssFontFamily` for the family brand on line 27.

**Plan**:
- Import `CssFontWeight` type (or use existing import)
- Cast each weight literal: `'100 900' as CssFontWeight`, `'600' as CssFontWeight`, `'700' as CssFontWeight`

**Files**:
- Edit: `vite/src/vite-plugin-template-html.test.ts` (lines 30, 34, 40)

**Verification**: `pnpm -w run qa:lint --tools 2>&1 | grep "vite-plugin-template-html"` returns zero matches

---

## TASK 4 — Fix vscode test type errors (12 errors)

**Status**: [ ]

**Gap**: Multiple test files have type-level lint errors from the Phase 90 coverage push.

**Plan**:
- **provider.test.ts:526,538,540,775** — `comments/require-blank-line-groups`: Add a blank line between declaration (`const`/`let`) and control statement (`for`/`if`/`while`) at each location
- **provider.test.ts:911** — TS2322: `{ report: reportSpy }` not assignable to Progress type. Cast: `{ report: reportSpy } as unknown as vscode.Progress<{ message?: string; increment?: number }>`
- **provider.test.ts:1043,1071** — TS2540: readonly `textDocuments`. Change `vscode.workspace.textDocuments = []` to `Object.defineProperty(vscode.workspace, 'textDocuments', { value: [], configurable: true })`
- **panel.test.ts:36** — `comments/require-blank-line-groups`: Add blank line between `const match = ...` and `if (!match)`
- **panel.test.ts:48** — TS2532: `.mock.results[0]` possibly undefined. Add `!` assertion: `.mock.results[0]!`
- **panel.test.ts:257,283** — TS2532: `.mock.calls[0][0]` possibly undefined. Add `!` assertions: `.mock.calls[0]![0]`
- **extension.test.ts:857,874** — TS2493: tuple index on empty type. Change cast to `(h.fn.createBatchedFileWatcher.mock.calls as unknown[][])[0]![1] as (uris: vscode.Uri[]) => void`

**Files**:
- Edit: `vscode/src/lint/provider.test.ts`
- Edit: `vscode/src/shared/panel/panel.test.ts`
- Edit: `vscode/src/extension.test.ts`

**Verification**: `pnpm -w run qa:lint --tools 2>&1 | grep "vscode/src"` returns zero matches for TS errors and comments errors

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No new rules or config to register — all changes are type-level fixes in existing files
- Verify no new exports were created that need registration

**Verification**:
- `grep -r 'export' lint/src/rules/svelte5/_svelte-helpers.ts | wc -l` unchanged from before edits
- `pnpm --filter @resist/vscode run qa:test` still passes 748 tests

---

## TASK 6 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all command registration tests still check matching registerCommand calls (no commands changed)
- Verify all config settings read via config.get are still tested (no config changes)
- Verify all feature classes still instantiated in tests (no class changes)
- Verify no unused exports or dead code introduced by the fixes

**Verification**:
- `grep -c 'registerCommand'` counts unchanged
- All config.get calls still covered
- No orphaned exports

---

## TASK 7 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @resist/vscode run qa:test:coverage`
- Verify 748 tests still pass
- Verify coverage thresholds still met (90/80/85/90)
- Verify zero lint errors in `packages/shared/config/tooling/`

**Verification**: All pnpm commands exit 0, zero config/tooling errors in lint output

---

## TASK 8 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 11 modified files are correct
- Verify qa:lint shows zero errors for config/tooling
- Verify test count still 748
- Verify coverage still above thresholds
- Commit with descriptive message

**Verification**:
- All modified files saved
- `qa:lint --tools | grep config/tooling` returns zero error lines
- Test count >= 748
- Coverage meets 90/80/85/90 thresholds

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix svelte5 TS2352 unsafe casts (18 errors) | -- |
| 2 | Fix cli-helpers.ts return type (1 error) | -- |
| 3 | Fix vite test branded type (3 errors) | -- |
| 4 | Fix vscode test type errors (12 errors) | -- |
| 5 | Register rules + config | 1-4 |
| 6 | Integration verification | 5 |
| 7 | Full QA + Coverage | 6 |
| 8 | Final verification + commit | 7 |
