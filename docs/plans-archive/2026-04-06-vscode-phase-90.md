# [VSCode] Phase 90 — Test Coverage 72% to 90%+

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-06
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/src/`)
**Goal**: Raise test coverage from 72%/65%/69%/72% (stmts/branch/func/lines) to 90%/85%/90%/90% and update thresholds.
**Architecture**: Extend existing vitest mock infrastructure. One test file per source file. No new abstractions — just tests.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Context

The vscode extension has 37 test files with 555 passing tests, but 7 source files have major coverage gaps. The largest gap is `extension.ts` at 0% — the main entry point is entirely untested. Current thresholds (45/30/50/45) are far below actual coverage (72/65/69/72). This plan adds ~150 tests across 7 files to close the gaps and raises thresholds to 90/85/90/90.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 555 total (555 pass) |
| Test Files | 37 total (37 pass) |
| Statements | 72.08% (1366/1895) |
| Branches | 65.14% (630/967) |
| Functions | 69.49% (262/377) |
| Lines | 72.63% (1354/1864) |
| Thresholds | statements=45, branches=30, functions=50, lines=45 |

---

## TASK 1 — runner.ts coverage: runTool + runToolText + timeout

**Status**: [ ]

**Gap**: `runTool()` internal helper and `runToolText()` exported function are untested. Timeout path, stdin handling, and process error paths in `runTool` are uncovered. Lines 34-101 and 122-139 at 0%.

**Plan**:
- Add tests to existing `src/shared/runner.test.ts`
- Test `runToolText()` success path (exit 0, returns stdout text)
- Test `runToolText()` failure path (exit code non-zero, returns error with TS2554-style code)
- Test `runToolText()` null exit code path (process killed)
- Test timeout path: mock setTimeout to fire, verify `child.kill()` called
- Test stdin branch: provide stdin option, verify `child.stdin.write()` + `child.stdin.end()` called
- Test process error event via `runToolText` (spawn ENOENT)
- Reuse existing `createMockChild()` and `emitStdout`/`emitStderr` helpers from runner.test.ts

**Files**:
- Edit: `src/shared/runner.ts` (no changes expected — tests only)
- Test: `src/shared/runner.test.ts` (add ~10 tests)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes, runner.ts coverage > 85% statements

---

## TASK 2 — file-watcher.ts coverage: createBatchedFileWatcher

**Status**: [ ]

**Gap**: `createBatchedFileWatcher()` is entirely untested (lines 151-236). Batch timer logic, URI deduplication, flush callback, dispose cleanup all uncovered. 37.8% overall.

**Plan**:
- Add tests to existing `src/shared/file-watcher.test.ts`
- Test basic batching: fire multiple change events, verify callback receives batched URIs after timer
- Test URI deduplication (default=true): fire same URI twice, verify only 1 in batch
- Test deduplication disabled: fire same URI twice with `deduplicateByUri: false`, verify both in batch
- Test empty batch early return: dispose before any events, verify callback not called
- Test dispose cleanup: verify timer cleared on dispose
- Test error in callback: verify error logged, no crash
- Mock `vi.useFakeTimers()` for setTimeout/clearTimeout control
- Mock `vscode.workspace.createFileSystemWatcher` to return EventEmitter-based watcher

**Files**:
- Edit: `src/shared/file-watcher.ts` (no changes expected — tests only)
- Test: `src/shared/file-watcher.test.ts` (add ~10 tests)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes, file-watcher.ts coverage > 85% statements

---

## TASK 3 — provider.ts coverage: loadExcludeNames + lintWorkspace

**Status**: [ ]

**Gap**: `loadExcludeNames()` (lines 100-115) and large sections of `lintWorkspace()` (lines 332-462) are untested. Config parsing, JSONC comment stripping, untitled document handling, workspace result grouping, and error paths all uncovered. 50.8% overall.

**Plan**:
- Add tests to existing `src/lint/provider.test.ts`
- Test `loadExcludeNames` success: mock `readFileSync` to return JSONC with comments, verify correct names extracted
- Test `loadExcludeNames` filters out patterns with `/` and `*`
- Test `loadExcludeNames` file read error: mock readFileSync to throw, verify returns empty Set
- Test `isExcludedPath` cache miss → calls loadExcludeNames
- Test `isExcludedPath` with matching directory segment
- Test `lintWorkspace` success: mock `runToolJson` to return entries, verify diagnostics grouped by file
- Test `lintWorkspace` error: mock `runToolJson` to return `{ ok: false }`, verify state set to 'error'
- Test `lintWorkspace` no workspace folder: verify early return
- Test `lintWorkspace` no binary: verify early return
- Test `lintWorkspace` document lookup: open document found vs not found (mapEntryToDiagnostic vs mapEntryToDiagnosticBasic)
- Test `lintWorkspace` diagnostic mapping error: entry throws in mapping, verify skip + log
- Test `appendConfigArgs` for each config flag: cache, quiet, debug, severityOverride, rule, ignorePatterns, jobs, tools, locale, bail
- Test untitled document handling with synthetic filename

**Files**:
- Edit: `src/lint/provider.ts` (no changes expected — tests only)
- Test: `src/lint/provider.test.ts` (add ~34 tests)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes, provider.ts coverage > 85% statements

---

## TASK 4 — commands.ts coverage: statusBarMenu + uncovered branches

**Status**: [ ]

**Gap**: `statusBarMenu` command handler (lines 286-347) entirely untested. Toggle enable, debug toggle, fix application edit rejection, restart file filtering all have uncovered branches. 60% statements, 25% branches.

**Plan**:
- Add tests to existing `src/lint/commands.test.ts`
- Test `statusBarMenu` enabled state: mock showQuickPick to return an item, verify executeCommand called with correct COMMANDS
- Test `statusBarMenu` disabled state: verify toggleLabel changes to "resume"
- Test `statusBarMenu` user cancels: mock showQuickPick returning undefined, verify no command executed
- Test `statusBarMenu` unknown label: verify no command executed (commandMap miss)
- Test `toggleEnable` pause path: currentValue=true → clear diagnostics + setState disabled
- Test `toggleEnable` resume path: currentValue=false → setState ready
- Test `debugToggle`: current=true → shows debugDisabled message; current=false → shows debugEnabled message
- Test `lintFix` no changes path: fixedText === originalText, verify info message shown
- Test `lintFix` edit rejection: mock applyEdit returning false, verify error message
- Test `restart`: verify all file:// non-untitled docs re-linted

**Files**:
- Edit: `src/lint/commands.ts` (no changes expected — tests only)
- Test: `src/lint/commands.test.ts` (add ~18 tests)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes, commands.ts coverage > 85% statements and > 75% branches

---

## TASK 5 — panel.ts coverage: registerPanel commands + observers

**Status**: [ ]

**Gap**: `registerPanel()` has 24.6% statements, 0% branches, 6.7% functions. Badge updates, all 7 command handlers, state/diagnostic observers all untested.

**Plan**:
- Add tests to existing `src/shared/panel/panel.test.ts`
- Ensure vscode mock has `env.clipboard.writeText` (add to `src/__mocks__/vscode.ts` if missing)
- Capture command handlers via `registerCommand` mock (existing pattern from commands.test.ts)
- Test `updateBadge` with diagnostics: verify treeView.badge set with count and tooltip
- Test `updateBadge` with zero diagnostics: verify treeView.badge set to undefined
- Test state change observer: fire stateManager callback, verify provider.refresh() + updateBadge called
- Test diagnostic change observer: fire onDidChangeDiagnostics, advance timer, verify refresh + badge
- Test diagnostic debounce: fire multiple changes rapidly, verify only one refresh after timer
- Test `panelExpandAll` command: mock getRoots returning 2 roots, verify reveal called for each
- Test `panelFilter` command: mock showInputBox returning string, verify setFilter + description set
- Test `panelFilter` cancel: mock showInputBox returning undefined, verify filter not changed
- Test `panelClearFilter` command: verify clearFilter + description cleared
- Test `panelMenu` command: verify executeCommand called with statusBarMenu
- Test `panelShowLocation` with DiagnosticDetailItem: verify vscode.open called with URI + range
- Test `panelShowLocation` with non-DiagnosticDetailItem: verify no action
- Test `panelShowRule` with string code: verify clipboard + info message
- Test `panelShowRule` with number code: verify String(code) copied
- Test `panelShowRule` with object code: verify code.value copied
- Test `panelShowRule` with non-DiagnosticDetailItem: verify no action
- Test `panelAutoFix` with valid fix: verify document opened, edit applied
- Test `panelAutoFix` with no fix: verify info message shown
- Test `panelAutoFix` with empty no-op fix (start===end, text===''): verify info message

**Files**:
- Edit: `src/__mocks__/vscode.ts` (add `env.clipboard` if missing)
- Test: `src/shared/panel/panel.test.ts` (add ~22 tests)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes, panel.ts coverage > 90% statements and > 80% branches

---

## TASK 6 — rules-viewer.ts coverage: parseRulesOutput + showRulesViewer

**Status**: [ ]

**Gap**: `parseRulesOutput()` rule header parsing (lines 100-132) and `showRulesViewer()` webview panel lifecycle (lines 870-947) are partially uncovered. 77.1% overall.

**Plan**:
- Add tests to existing `src/lint/rules-viewer.test.ts`
- Test `parseRulesOutput` with section headers: verify sections extracted
- Test `parseRulesOutput` with fixable rules: verify `[fixable]` flag parsed
- Test `parseRulesOutput` with multi-line descriptions: verify accumulated
- Test `parseRulesOutput` with category/stage lines: verify split correctly
- Test `parseRulesOutput` final rule flush: last rule in output not lost
- Test `showRulesViewer` existing panel: verify reveal called (not new panel)
- Test `showRulesViewer` no workspace folder: verify error message
- Test `showRulesViewer` no binary: verify error message
- Test `showRulesViewer` CLI failure: verify error HTML rendered in panel
- Test `showRulesViewer` success: verify panel created with HTML containing rules
- Test `showRulesViewer` dispose: verify currentPanel cleared

**Files**:
- Edit: `src/lint/rules-viewer.ts` (no changes expected — tests only)
- Test: `src/lint/rules-viewer.test.ts` (add ~14 tests)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes, rules-viewer.ts coverage > 90% statements

---

## TASK 7 — extension.ts coverage: activate + deactivate + mapToolState

**Status**: [ ]

**Gap**: The entire entry point is at 0% coverage. `activate()` (lines 114-472) creates 16 objects, registers event handlers, conditional providers, and lints open docs. `deactivate()` and `mapToolState()` also uncovered.

**Plan**:
- Create new test file `src/extension.test.ts`
- Mock ALL imported modules: `./shared/index` (20+ exports), `./lint/index` (12+ exports), `./locale/en`, `./shared/panel/index`
- Test `activate()` basic: verify diagnosticCollection, outputChannel, statusBar created
- Test `activate()` binary found: verify state not set to disabled
- Test `activate()` binary missing: verify logError + notificationManager.warnOnce + setState disabled
- Test `activate()` no workspace folders: verify no binary check
- Test `mapToolState` via stateManager observer: fire state change to 'running', verify updateStatusBar called with 'linting'
- Test mapToolState 'ready' with active editor: verify getFileDiagnosticCounts + updateStatusBar with counts
- Test mapToolState 'ready' without active editor: verify updateStatusBar('ready') no counts
- Test mapToolState 'error': verify updateStatusBar('error')
- Test mapToolState 'disabled'/'not-installed': verify updateStatusBar('disabled')
- Test lintDoc: state disabled → early return (no lintDocument call)
- Test lintDoc: config lint.enable=false → early return
- Test lintDoc: both enabled → calls lintDocument
- Test CodeLens registration: lint.codeLens=true → registerCodeLensProvider called
- Test CodeLens skipped: lint.codeLens=false → no registration
- Test FormattingProvider: lint.formatOnSave=true → registerDocumentFormattingEditProvider
- Test FormattingProvider skipped: lint.formatOnSave=false → no registration
- Test watchFiles: lint.watchFiles=true → createBatchedFileWatcher called
- Test watchFiles callback: document found → lintDoc called
- Test watchFiles callback: document not found → lintDoc not called
- Test eventRegistry.onOpen: both enabled → lintDoc called
- Test eventRegistry.onOpen: lint.enable=false → lintDoc not called
- Test eventRegistry.onOpen: lint.onOpen=false → lintDoc not called
- Test eventRegistry.onSave: lint.enable=false → early return
- Test eventRegistry.onSave: fixOnSave=true → fixOnSaveManager.handleSave called
- Test eventRegistry.onSave: onSave=true → lintDoc called
- Test eventRegistry.onChange: lint.enable=false → early return
- Test eventRegistry.onChange: lint.onType=false → early return
- Test eventRegistry.onChange: both enabled → debouncer.schedule called
- Test eventRegistry.onClose: verify diagnosticCollection.delete + debouncer.cancel
- Test onDidChangeActiveTextEditor with editor: verify updateStatusBar with counts
- Test onDidChangeActiveTextEditor without editor: verify updateStatusBar without counts
- Test initial doc linting: lint.enable=true + lint.onOpen=true → saved docs linted with progress, untitled docs linted directly
- Test initial doc linting: lint.enable=false → no docs linted
- Test `deactivate()` with lifecycle: verify disposeAll called
- Test `deactivate()` without lifecycle (not activated): verify no crash
- Test lifecycle push to context.subscriptions

**Files**:
- Create: `src/extension.test.ts` (new file, ~42 tests)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes, extension.ts coverage > 85% statements and > 80% branches

---

## TASK 8 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify `env.clipboard` mock addition in `src/__mocks__/vscode.ts` is complete (from Task 5)
- Verify all new test files are included in vitest project glob (`src/**/*.test.ts`)
- Update coverage thresholds in `package.json` `qa:test:coverage` script: statements=90, branches=85, functions=90, lines=90
- Verify no orphaned code (all test imports resolve)

**Files**:
- Edit: `packages/shared/config/tooling/vscode/package.json` (update thresholds)
- Edit: `src/__mocks__/vscode.ts` (verify env.clipboard mock)

**Verification**:
- `grep 'thresholds.statements=90' packages/shared/config/tooling/vscode/package.json` outputs 1 match
- `grep 'clipboard' src/__mocks__/vscode.ts` outputs at least 1 match
- `pnpm --filter @resist/vscode run qa:test 2>&1 | grep 'Test Files'` shows 38 passed (37 existing + 1 new extension.test.ts)
- `ls src/extension.test.ts` confirms new test file exists

---

## TASK 9 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all command registration tests check matching `registerCommand` calls
- Verify all config settings read via `configManager.get` are tested in at least one config branch test
- Verify all feature classes are instantiated in extension.test.ts activation tests
- Verify no unused exports or dead code (created but never imported)
- Grep audit: count commands registered vs declared, settings read vs declared
- Fix any gaps found before proceeding

**Verification**:
- `grep -c 'registerCommand' src/extension.ts` matches count verified in extension.test.ts
- All config settings (lint.enable, lint.onOpen, lint.onSave, lint.onType, lint.codeLens, lint.formatOnSave, lint.watchFiles, lint.fixOnSave, lint.debounceMs, lint.staleDiagnosticTimeoutMs) have corresponding test branches
- All feature classes (DiagnosticFilter, StageIndicator, FixOnSaveManager, StaleDiagnosticCleaner, DocumentEventRegistry, ConfigManager, etc.) instantiated in tests
- No orphaned exports (every export is imported somewhere)

---

## TASK 10 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @resist/vscode run qa:test:coverage`
- Verify coverage meets new thresholds: statements >= 90%, branches >= 85%, functions >= 90%, lines >= 90%
- Verify test count increased from baseline (555 → ~705+)
- Fix any lint or format issues

**Verification**: All pnpm commands exit 0, coverage thresholds met

---

## TASK 11 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 7 implementation files have tests (runner, file-watcher, provider, commands, panel, rules-viewer, extension)
- Verify all features registered in config (thresholds updated in package.json)
- Verify all integration checks pass (from Integration Verification task)
- Verify test count >= 555 + 150 = 705
- Commit with descriptive message

**Verification**:
- All implementation `.test.ts` files exist: `extension.test.ts` (new), plus 6 existing test files updated
- `package.json` thresholds updated to 90/85/90/90
- Test count >= baseline + new tests (555 + ~150)
- Integration audit shows zero gaps
- Coverage report shows all 7 target files above 85%

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | runner.ts coverage | -- |
| 2 | file-watcher.ts coverage | -- |
| 3 | provider.ts coverage | -- |
| 4 | commands.ts coverage | -- |
| 5 | panel.ts coverage (+ mock update) | -- |
| 6 | rules-viewer.ts coverage | -- |
| 7 | extension.ts coverage | 1-6 (mocking patterns proven) |
| 8 | Register rules + config (thresholds) | 1-7 |
| 9 | Integration verification | 8 |
| 10 | Full QA + Coverage | 9 |
| 11 | Final verification + commit | 10 |
