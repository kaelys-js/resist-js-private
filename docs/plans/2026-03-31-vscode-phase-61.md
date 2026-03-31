# @resist/vscode Phase 61 — Remaining Roadmap Features

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Implement all 14 remaining features from `docs/vscode-feature-roadmap.md` — 2 shared foundation + 12 lint features. Each feature includes locale strings, error handling, and test coverage.
**Architecture**: CommonJS output via tsgo. Locale strings in `schema.ts` (interfaces) + `en.ts` (English). Error handling via `safeRun`/`safeRunAsync`. Tests via Vitest with vscode mock.

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
| Tests | 214 total (214 pass) |
| Test files | 20 |
| Source files | 23 |
| Locale groups | 16 |
| Locale strings | ~57 |
| Coverage | statements 60%, branches 51%, functions 67%, lines 61% |

---

## TASK 1 — Locale System: Add All New String Groups

**Status**: [ ]

**Gap**: 13 new features need locale strings. Adding them all upfront avoids incremental schema changes.

**Plan**:
- Add 13 new interfaces to `schema.ts`: FixOnSaveStrings, CodeLensStrings, DiffPreviewStrings, FormattingStrings, ProfilingStrings, FilterStrings, PerFolderStrings, StaleCleanupStrings, ImportsStrings, InlineOverridesStrings, StageIndicatorStrings, EventsStrings; extend CodeActionStrings with disableLine/disableFile
- Add all 13 groups to `VscodeStrings` interface
- Add all English strings to `en.ts`
- Add `watcher.batchFired` string to existing watcher group

**Files**:
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: Type-check passes, existing locale tests pass

---

## TASK 2 — SF-8: Document Event Registry

**Status**: [ ]

**Gap**: `extension.ts` has 4 separate event listeners with similar boilerplate. Need pluggable hook system.

**Plan**:
- Create `DocumentEventRegistry` class with `onOpen`, `onSave`, `onChange`, `onClose` registration
- Registry handles document filtering via `isWorkspaceDocument`, error boundaries via `safeRun`
- Single set of VS Code event listeners, dispatches to registered handlers
- Write tests: handler registration, dispatch, error handling, dispose

**Files**:
- Create: `src/shared/events.ts`
- Create: `src/shared/events.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — SF-6: File Watching Abstraction — Event Batching

**Status**: [ ]

**Gap**: `createFileWatcher()` debounces but doesn't batch multiple URIs. Need batch mode.

**Plan**:
- Add `createBatchedFileWatcher(patterns, callback, options?)` to `file-watcher.ts`
- Collects changed URIs within `batchWindowMs` (default 500ms), fires callback once with URI list
- Deduplicates URIs within batch window
- Write tests: single event, multiple events batched, deduplication, dispose

**Files**:
- Modify: `src/shared/file-watcher.ts`
- Modify: `src/shared/file-watcher.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — L-1: Auto-Fix on Save

**Status**: [ ]

**Gap**: Users must manually run "Fix All". No automatic fixing on save.

**Plan**:
- Create `FixOnSaveManager` class with `handleSave(doc, diagnosticCollection)` method
- Loop guard: track recently-fixed URIs to prevent save→fix→save infinite loop (500ms cooldown)
- Apply fixes via `WorkspaceEdit`, log results to output channel
- Add `resist.lint.fixOnSave` setting to `package.json` (boolean, default false)
- Write tests: fixes applied on save, loop guard prevents recursion, no-op when disabled, no fixable diagnostics

**Files**:
- Create: `src/lint/fix-on-save.ts`
- Create: `src/lint/fix-on-save.test.ts`
- Modify: `package.json` (add setting)

**Verification**: Tests pass, type-check passes

---

## TASK 5 — L-2: Per-Rule Disable Quick Actions

**Status**: [ ]

**Gap**: No way to suppress a specific rule from within VS Code. Users must manually edit config.

**Plan**:
- Add "Disable [rule] for this line" code action — inserts `// resist-lint-disable-next-line: rule-name` above diagnostic
- Add "Disable [rule] for this file" code action — inserts `// resist-lint-disable: rule-name` at top of file
- Both are non-preferred `QuickFix` actions (auto-fix remains preferred)
- Write tests: line disable action, file disable action, correct comment format

**Files**:
- Modify: `src/lint/code-actions.ts`
- Modify: `src/lint/code-actions.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — L-3: Code Lens Provider

**Status**: [ ]

**Gap**: No inline visibility of diagnostic info. Only visible in hover tooltips and Problems panel.

**Plan**:
- Create `ResistCodeLensProvider` implementing `vscode.CodeLensProvider`
- Shows lens above lines with diagnostics: `"[ruleId] (N issues)"`
- Click action: open docs URL if available, else show output channel
- Refreshes on diagnostic collection changes via `onDidChangeDiagnostics` event emitter
- Add `resist.lint.codeLens` setting (boolean, default false)
- Register in `extension.ts` when setting enabled
- Write tests: lens creation, click action, no diagnostics = no lenses, refresh

**Files**:
- Create: `src/lint/code-lens.ts`
- Create: `src/lint/code-lens.test.ts`
- Modify: `package.json` (add setting)

**Verification**: Tests pass, type-check passes

---

## TASK 7 — L-4: Diff Preview for Fixes

**Status**: [ ]

**Gap**: "Fix All" applies immediately with no preview. Users can't review changes.

**Plan**:
- Create `FixDiffPreviewProvider` implementing `TextDocumentContentProvider` for `resist-fix-preview` scheme
- New command `resist.lint.previewFixes` collects all fixes, creates virtual document, opens diff
- Uses `vscode.commands.executeCommand('vscode.diff', original, preview, title)`
- Write tests: virtual document content, no fixes shows message, command registration

**Files**:
- Create: `src/lint/diff-preview.ts`
- Create: `src/lint/diff-preview.test.ts`
- Modify: `package.json` (add command)

**Verification**: Tests pass, type-check passes

---

## TASK 8 — L-5: Format-on-Save Integration

**Status**: [ ]

**Gap**: Lint fixes and format-on-save are separate workflows.

**Plan**:
- Create `ResistFormattingProvider` implementing `DocumentFormattingEditProvider`
- Collects fixable diagnostics, returns `TextEdit[]` for each fix
- Only active when `resist.lint.formatOnSave` is true
- Add `resist.lint.formatOnSave` setting (boolean, default false)
- Register in `extension.ts`
- Write tests: edits returned, no fixes = empty array, disabled = not registered

**Files**:
- Create: `src/lint/formatting-provider.ts`
- Create: `src/lint/formatting-provider.test.ts`
- Modify: `package.json` (add setting)

**Verification**: Tests pass, type-check passes

---

## TASK 9 — L-6: Performance Profiling

**Status**: [ ]

**Gap**: No visibility into which rules are slow.

**Plan**:
- Create `showTimingReport(channel, cwd, binPath)` function
- Runs lint with `--timing` flag, parses output
- Displays sorted table in output channel
- Add `resist.lint.showTiming` setting (boolean, default false)
- New command `resist.lint.showTiming` — "Lint: Show Performance Timing"
- Write tests: timing parsing, output formatting, no data case

**Files**:
- Create: `src/lint/profiling.ts`
- Create: `src/lint/profiling.test.ts`
- Modify: `package.json` (add setting + command)

**Verification**: Tests pass, type-check passes

---

## TASK 10 — L-7: Diagnostic Filtering UI

**Status**: [ ]

**Gap**: No way to filter diagnostics by category within the extension.

**Plan**:
- Create `DiagnosticFilter` class with `applyFilter(categories)`, `clearFilter()`, `getActiveCategories()`
- Stores active filter, re-applies to diagnostic collection
- New command `resist.lint.filterByCategory` — multi-select quick pick
- New command `resist.lint.clearFilter`
- Write tests: filter application, clearing, category extraction from diagnostics

**Files**:
- Create: `src/lint/diagnostic-filter.ts`
- Create: `src/lint/diagnostic-filter.test.ts`
- Modify: `package.json` (add commands)

**Verification**: Tests pass, type-check passes

---

## TASK 11 — L-8: Per-Folder Configuration

**Status**: [ ]

**Gap**: All workspace folders use the same lint settings. Multi-root workspaces can't differ.

**Plan**:
- Create `getPerFolderLintOptions(docUri, globalOptions)` function
- Resolves nearest workspace folder for document, reads folder-specific config
- Config chain: folder `.vscode/settings.json` → workspace → global
- Integrate into `lintDocument()` in `provider.ts`
- Write tests: folder resolution, fallback to global, multi-root workspace

**Files**:
- Create: `src/lint/per-folder.ts`
- Create: `src/lint/per-folder.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 12 — L-9: Stale Diagnostic Cleanup

**Status**: [ ]

**Gap**: Diagnostics persist on idle files indefinitely until re-lint or close.

**Plan**:
- Create `StaleDiagnosticCleaner` class with `trackEdit(uri)`, `start()`, `stop()`, `dispose()`
- Background timer (interval = staleDiagnosticTimeoutMs / 4) checks for stale files
- Skips visible editors (active + visible tab groups)
- Clears diagnostics for files idle > timeout
- Add `resist.lint.staleDiagnosticTimeoutMs` setting (number, default 300000)
- Wire into `extension.ts` — track edits on document change
- Write tests: tracking, cleanup trigger, visible editor skip, dispose

**Files**:
- Create: `src/lint/stale-cleanup.ts`
- Create: `src/lint/stale-cleanup.test.ts`
- Modify: `package.json` (add setting)

**Verification**: Tests pass, type-check passes

---

## TASK 13 — L-10: Import Sorting Integration

**Status**: [ ]

**Gap**: No dedicated UI for unused import removal from lint diagnostics.

**Plan**:
- Create `collectImportDiagnostics(diagnostics)` function — filters for import-related rules
- New command `resist.lint.removeUnusedImports` — collects import fixes, applies as batch
- Add code action "Remove unused imports" to `code-actions.ts` when import diagnostics present
- Write tests: import diagnostic collection, batch fix application, no imports = no action

**Files**:
- Create: `src/lint/import-sorting.ts`
- Create: `src/lint/import-sorting.test.ts`
- Modify: `package.json` (add command)

**Verification**: Tests pass, type-check passes

---

## TASK 14 — L-11: Inline Severity Override Decorations

**Status**: [ ]

**Gap**: No visual indicator for `resist-lint-disable` comment directives in editor.

**Plan**:
- Create `InlineOverrideDecorator` class with `updateDecorations(editor)`, `dispose()`
- Scans for `// resist-lint-disable` and `// resist-lint-disable-next-line` comments
- Creates subdued italic decorations with informative tooltip
- Updates on active editor change and document change
- Wire into `extension.ts`
- Write tests: comment detection, decoration creation, empty document, dispose

**Files**:
- Create: `src/lint/inline-overrides.ts`
- Create: `src/lint/inline-overrides.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 15 — L-12: Build/Stage Visual Feedback

**Status**: [ ]

**Gap**: Active stage is a hidden setting with no editor visibility.

**Plan**:
- Create `StageIndicator` class with `update(stage)`, `createQuickPick()`, `dispose()`
- Shows current stage in status bar text when non-default: `"$(check) Resist [build]"`
- New command `resist.lint.changeStage` — quick pick with available stages
- Updates `resist.lint.stage` setting on selection
- Wire into `extension.ts`
- Write tests: status bar text with stage, quick pick creation, stage change, default stage no suffix

**Files**:
- Create: `src/lint/stage-indicator.ts`
- Create: `src/lint/stage-indicator.test.ts`
- Modify: `package.json` (add command)

**Verification**: Tests pass, type-check passes

---

## TASK 16 — Register Commands + Settings in package.json

**Status**: [ ]

**Plan**:
- Verify all new settings are registered in `contributes.configuration.properties`
- Verify all new commands are registered in `contributes.commands`
- Settings: `fixOnSave`, `codeLens`, `formatOnSave`, `showTiming`, `staleDiagnosticTimeoutMs`
- Commands: `previewFixes`, `showTiming`, `filterByCategory`, `clearFilter`, `removeUnusedImports`, `changeStage`

**Files**:
- Modify: `package.json`

**Verification**: All settings and commands present in package.json

---

## TASK 17 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w exec vitest run --project config-tooling-vscode`
- Verify test count increased from baseline (214)

**Verification**: All commands exit 0

---

## TASK 18 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 14 new feature files exist
- Verify all 14 new test files exist
- Verify locale schema has all new groups
- Verify en.ts has all new strings
- Verify package.json has all new settings and commands
- Commit with descriptive message

**Verification**:
- All new `.ts` implementation files exist
- All new `.test.ts` files exist
- Test count ≥ 214 + new tests
- `pnpm -w exec vitest run --project config-tooling-vscode` passes
- Type-check passes

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Locale system: all new string groups | — |
| 2 | Document Event Registry | 1 |
| 3 | File Watching: Event Batching | 1 |
| 4 | Auto-fix on save | 1 |
| 5 | Per-rule disable quick actions | 1 |
| 6 | Code lens provider | 1 |
| 7 | Diff preview for fixes | 1 |
| 8 | Format-on-save integration | 1 |
| 9 | Performance profiling | 1 |
| 10 | Diagnostic filtering UI | 1 |
| 11 | Per-folder configuration | 1 |
| 12 | Stale diagnostic cleanup | 1 |
| 13 | Import sorting integration | 1, 5 |
| 14 | Inline severity override decorations | 1, 5 |
| 15 | Build/stage visual feedback | 1 |
| 16 | Register commands + settings | 1-15 |
| 17 | Full QA + Coverage | 16 |
| 18 | Final verification + commit | 17 |
