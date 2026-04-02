# @resist/vscode Phase 66 — Wire Unimplemented Features + Cleanup Dead Locale

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/src/`)
**Goal**: Wire 6 orphaned feature classes into extension.ts, register 6 unregistered commands, read 5 unread config settings, remove dead locale, use formatPlural() for status bar counts. Zero remaining gaps.
**Architecture**: All features already implemented and tested in isolation — this phase wires them into the extension entry point and validates integration.

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
| Tests | 358 total (358 pass) |
| Test Files | 32 |
| Type-check | Passes |
| Unregistered commands | 6 |
| Unwired feature classes | 6 |
| Unread config settings | 5 |
| Dead locale fields | 1 |

---

## TASK 1 — Remove dead diffPreview.scheme locale field

**Status**: [ ]

**Gap**: `en.diffPreview.scheme` is dead code — `PREVIEW_SCHEME` is used directly from brand.ts. The locale field is never referenced.

**Plan**:
- Remove `scheme` from `DiffPreviewStrings` interface in schema.ts
- Remove `scheme: PREVIEW_SCHEME` from en.ts diffPreview group
- Update locale.test.ts to reflect one fewer field in diffPreview group

**Files**:
- Edit: `src/locale/schema.ts`
- Edit: `src/locale/en.ts`
- Edit: `src/locale/locale.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — Wire FixDiffPreviewProvider + register previewFixes command

**Status**: [ ]

**Gap**: `FixDiffPreviewProvider` class exists in diff-preview.ts, `showFixDiffPreview()` function exists, `COMMANDS.previewFixes` is in brand.ts, command is in package.json — but nothing in extension.ts registers the content provider or the command handler.

**Plan**:
- Register `FixDiffPreviewProvider` as a TextDocumentContentProvider for `PREVIEW_SCHEME` in extension.ts
- Add `previewFixes` command registration in commands.ts calling `showFixDiffPreview()`
- Add `FixDiffPreviewProvider` and `showFixDiffPreview` to CommandDeps or pass directly

**Files**:
- Edit: `src/extension.ts`
- Edit: `src/lint/commands.ts`

**Verification**: Tests pass, type-check passes, command registered for COMMANDS.previewFixes

---

## TASK 3 — Register showTiming command

**Status**: [ ]

**Gap**: `showTimingReport()` exists in profiling.ts, `COMMANDS.showTiming` is in brand.ts, command is in package.json — but no `registerCommand` call.

**Plan**:
- Add `showTiming` command registration in commands.ts calling `showTimingReport()`

**Files**:
- Edit: `src/lint/commands.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — Wire DiagnosticFilter + register filterByCategory/clearFilter commands

**Status**: [ ]

**Gap**: `DiagnosticFilter` class exists, `COMMANDS.filterByCategory` and `COMMANDS.clearFilter` are in brand.ts, commands are in package.json — but no instantiation or registration.

**Plan**:
- Instantiate `DiagnosticFilter` in extension.ts with outputChannel
- Register `filterByCategory` command calling `filter.showFilterQuickPick()`
- Register `clearFilter` command calling `filter.clearFilter()`
- Add filter to context.subscriptions for disposal

**Files**:
- Edit: `src/extension.ts`
- Edit: `src/lint/commands.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — Register removeUnusedImports command

**Status**: [ ]

**Gap**: `removeUnusedImports()` exists in import-sorting.ts, `COMMANDS.removeUnusedImports` is in brand.ts, command is in package.json — but no `registerCommand` call.

**Plan**:
- Add `removeUnusedImports` command registration in commands.ts

**Files**:
- Edit: `src/lint/commands.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — Wire StageIndicator + register changeStage command

**Status**: [ ]

**Gap**: `StageIndicator` class exists, `COMMANDS.changeStage` is in brand.ts, command is in package.json — but no instantiation or registration.

**Plan**:
- Instantiate `StageIndicator` in extension.ts with statusBarItem and outputChannel
- Register `changeStage` command calling `stageIndicator.showQuickPick()`
- Add to context.subscriptions for disposal

**Files**:
- Edit: `src/extension.ts`
- Edit: `src/lint/commands.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — Wire FixOnSaveManager

**Status**: [ ]

**Gap**: `FixOnSaveManager` class exists, `resist.lint.fixOnSave` setting is in package.json — but never instantiated, setting never read.

**Plan**:
- Instantiate `FixOnSaveManager` in extension.ts
- In `onDidSaveTextDocument` handler, check `resist.lint.fixOnSave` setting
- If enabled, call `fixOnSaveManager.handleSave()` before re-lint
- Add to context.subscriptions for disposal

**Files**:
- Edit: `src/extension.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 8 — Wire ResistCodeLensProvider

**Status**: [ ]

**Gap**: `ResistCodeLensProvider` class exists, `resist.lint.codeLens` setting is in package.json — but never registered, setting never read.

**Plan**:
- Instantiate `ResistCodeLensProvider` in extension.ts
- Check `resist.lint.codeLens` setting; if true, register as CodeLensProvider
- Add to context.subscriptions for disposal

**Files**:
- Edit: `src/extension.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 9 — Wire StaleDiagnosticCleaner

**Status**: [ ]

**Gap**: `StaleDiagnosticCleaner` class exists, `resist.lint.staleDiagnosticTimeoutMs` setting is in package.json — but never instantiated, setting never read.

**Plan**:
- Read `resist.lint.staleDiagnosticTimeoutMs` setting
- Instantiate `StaleDiagnosticCleaner` with timeout and outputChannel
- Start the cleaner with diagnosticCollection
- Track edits in `onDidChangeTextDocument` handler
- Add to context.subscriptions for disposal

**Files**:
- Edit: `src/extension.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 10 — Wire ResistFormattingProvider

**Status**: [ ]

**Gap**: `ResistFormattingProvider` class exists, `resist.lint.formatOnSave` setting is in package.json — but never registered, setting never read.

**Plan**:
- Instantiate `ResistFormattingProvider` in extension.ts
- Check `resist.lint.formatOnSave` setting; if true, register as DocumentFormattingEditProvider
- Add to context.subscriptions for disposal

**Files**:
- Edit: `src/extension.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 11 — Use formatPlural() for status bar counts

**Status**: [ ]

**Gap**: `formatPlural()` and `en.plurals.*` exist but are never called. Status bar shows `$(error) 2` but could show `$(error) 2 errors`.

**Plan**:
- Import `formatPlural` in status-bar.ts
- Use `formatPlural(count, { one: en.plurals.error, other: en.plurals.errors })` for error/warning labels
- Update status bar tests to expect pluralized output

**Files**:
- Edit: `src/shared/status-bar.ts`
- Edit: `src/shared/status-bar.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 12 — Update locale tests

**Status**: [ ]

**Gap**: locale.test.ts needs updating for removed diffPreview.scheme and to verify formatPlural is now used.

**Plan**:
- Update diffPreview group test (one fewer field)
- Verify formatPlural integration test exists

**Files**:
- Edit: `src/locale/locale.test.ts`

**Verification**: Tests pass

---

## TASK 13 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify all 15 COMMANDS entries in brand.ts have matching registerCommand calls
- Verify all 5 new package.json settings have matching config.get calls
- Verify all 6 feature classes are instantiated in extension.ts
- Fix any gaps found

**Files**:
- Audit: `src/shared/brand.ts`, `src/extension.ts`, `src/lint/commands.ts`

**Verification**: All 15 commands registered, all settings read, all classes instantiated

---

## TASK 14 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w exec vitest run --project config-tooling-vscode`
- Verify test count increased from baseline (358)

**Verification**: All commands exit 0

---

## TASK 15 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 15 COMMANDS entries have registerCommand calls in commands.ts
- Verify all 6 feature classes instantiated in extension.ts
- Verify all 5 config settings read via config.get calls
- Verify dead diffPreview.scheme removed from schema.ts and en.ts
- Verify formatPlural() called in status-bar.ts
- Verify test count ≥ 358 + new tests
- Commit with descriptive message

**Verification**:
- `grep -c 'registerCommand' src/lint/commands.ts` returns ≥ 15
- `grep 'FixOnSaveManager\|ResistCodeLensProvider\|StaleDiagnosticCleaner\|ResistFormattingProvider\|DiagnosticFilter\|StageIndicator' src/extension.ts` shows all 6
- `grep 'fixOnSave\|codeLens\|formatOnSave\|staleDiagnosticTimeoutMs\|showTiming' src/extension.ts` shows all 5
- Dead locale field absent from schema.ts
- Test count ≥ baseline + new tests

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Remove dead diffPreview.scheme | — |
| 2 | Wire FixDiffPreviewProvider + previewFixes | — |
| 3 | Register showTiming command | — |
| 4 | Wire DiagnosticFilter + filter commands | — |
| 5 | Register removeUnusedImports command | — |
| 6 | Wire StageIndicator + changeStage | — |
| 7 | Wire FixOnSaveManager | — |
| 8 | Wire ResistCodeLensProvider | — |
| 9 | Wire StaleDiagnosticCleaner | — |
| 10 | Wire ResistFormattingProvider | — |
| 11 | Use formatPlural() for status bar | — |
| 12 | Update locale tests | 1, 11 |
| 13 | Register rules + config audit | 1-12 |
| 14 | Full QA + Coverage | 13 |
| 15 | Final verification + commit | 14 |
