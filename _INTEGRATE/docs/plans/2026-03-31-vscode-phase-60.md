# @resist/vscode Phase 60 — Shared Foundation Features

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Implement 15 shared foundation features (document filter, notification manager, config manager, command registration, lifecycle hooks, file watcher, workspace resolution, binary caching, progress helpers, state manager, status bar factory, diagnostics manager, tool runner, plural formatting, settings listener). All with locale strings, error handling, and comprehensive tests.
**Depends on**: Phase 59 (commit `e2bde740`)

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
| Extension tests | 11 files, 106 tests passing |
| Statement coverage | 50.75% (303/597) |
| Branch coverage | 37.21% (99/266) |
| Function coverage | 58.82% (70/119) |
| Line coverage | 50.93% (300/589) |
| Shared modules | 7 files |
| Locale string groups | 5 (output, statusBar, messages, progress, codeActions) |

---

## TASK 1 — Document Filter/Selector

**Status**: [x]

**Plan**:
- Create `src/shared/document-filter.ts` with `isWorkspaceDocument(doc)`, `isLintableDocument(doc)`, `forEachOpenDocument(filter, action)`
- `isWorkspaceDocument`: checks `doc.uri.scheme === 'file' && !doc.isUntitled`
- `isLintableDocument`: checks workspace + excludes output/debug schemes
- `forEachOpenDocument`: iterates `vscode.workspace.textDocuments`, catches per-doc errors, continues
- Add locale strings to schema.ts and en.ts: `documentFilter.iterationError`
- Create `src/shared/document-filter.test.ts` with tests for all predicates, iteration with failures, edge cases
- Refactor extension.ts to use `isWorkspaceDocument` and `forEachOpenDocument`

**Files**:
- Create: `src/shared/document-filter.ts`
- Create: `src/shared/document-filter.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/extension.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 2 — Notification Manager

**Status**: [x]

**Plan**:
- Create `src/shared/notifications.ts` with `NotificationManager` class
- Methods: `warnOnce(key, message)`, `warnThrottled(key, message, cooldownMs)`, `reset(key?)`, `dispose()`
- Logs suppressed notifications to output channel (never silent)
- Add locale strings: `notifications.suppressed`
- Create `src/shared/notifications.test.ts` testing dedup, throttling, reset, dispose
- Refactor extension.ts: replace `hasWarnedMissingBinary` flag with NotificationManager

**Files**:
- Create: `src/shared/notifications.ts`
- Create: `src/shared/notifications.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/extension.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 3 — Settings Change Listener

**Status**: [x]

**Plan**:
- Create `src/shared/config.ts` with `onConfigurationChange(section, handler, channel?): Disposable`
- Handler wrapped in safeRun — errors logged, never swallowed
- Add locale string: `config.changeDetected`
- Create `src/shared/config.test.ts` testing section matching, unrelated section ignored, disposal, error in handler

**Files**:
- Create: `src/shared/config.ts`
- Create: `src/shared/config.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 4 — Configuration Manager

**Status**: [x]

**Plan**:
- Add `ConfigManager` class to `src/shared/config.ts`
- Typed accessor: `get<T>(key, defaultValue): T`, `getSection(prefix): WorkspaceConfiguration`
- Auto-refresh on `onDidChangeConfiguration` events
- Debug log on refresh when channel provided
- Add locale string: `config.refreshed`
- Add tests to `src/shared/config.test.ts` for typed reads, defaults, cache invalidation

**Files**:
- Modify: `src/shared/config.ts`
- Modify: `src/shared/config.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 5 — Command Registration Pattern

**Status**: [x]

**Plan**:
- Create `src/shared/command-registration.ts` with `registerCommand(context, channel, id, handler)` and `registerTextEditorCommand(context, channel, id, handler)`
- Auto-wraps handler in `safeRunAsync` with command-specific label
- Add locale strings: `commands.registered`, `commands.executionFailed`
- Create `src/shared/command-registration.test.ts` testing registration, error wrapping, editor variant
- Refactor `src/lint/commands.ts` to use `registerCommand` helper

**Files**:
- Create: `src/shared/command-registration.ts`
- Create: `src/shared/command-registration.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/lint/commands.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 6 — Lifecycle Hook Manager

**Status**: [x]

**Plan**:
- Create `src/shared/lifecycle.ts` with `LifecycleManager` class
- Methods: `register(name, disposable, priority?)`, `disposeAll(channel?)`, `count()`
- Priority-based disposal (higher priority disposed first, output channel last at priority 0)
- Each disposal wrapped individually — one failure doesn't prevent others
- Add locale strings: `lifecycle.disposing`, `lifecycle.disposed`, `lifecycle.disposalError`
- Create `src/shared/lifecycle.test.ts` testing ordered disposal, error during dispose, named tracking

**Files**:
- Create: `src/shared/lifecycle.ts`
- Create: `src/shared/lifecycle.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 7 — Generic Config File Watcher

**Status**: [x]

**Plan**:
- Create `src/shared/file-watcher.ts` with `createFileWatcher(patterns, callback, debounceMs?): Disposable`
- Callback errors caught and logged — watcher stays alive
- Default debounce 1000ms
- Add locale string: `watcher.configChanged`
- Create `src/shared/file-watcher.test.ts` testing patterns, debounce, disposal, callback errors
- Refactor `src/lint/watcher.ts` to use `createFileWatcher`

**Files**:
- Create: `src/shared/file-watcher.ts`
- Create: `src/shared/file-watcher.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/lint/watcher.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 8 — Workspace Root Resolution

**Status**: [x]

**Plan**:
- Add `findWorkspaceRoot(startPath, markers): string | undefined` to `src/shared/workspace.ts`
- Cache results per (startPath, markers) pair
- Keep existing `getWorkspaceRoot()` as convenience wrapper calling `findWorkspaceRoot(path, ['pnpm-workspace.yaml'])`
- Invalid paths logged, returns undefined — no throwing
- Add tests to `workspace.test.ts` for multiple markers, cache hit/miss, missing marker

**Files**:
- Modify: `src/shared/workspace.ts`
- Modify: `src/shared/workspace.test.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 9 — Binary Resolution with Caching

**Status**: [x]

**Plan**:
- Add in-memory cache Map to `getBinaryPath()` in `src/shared/workspace.ts`
- Key: `${toolName}:${workspaceUri}`
- Add `clearBinaryCache()` export
- Update `clearCache()` to also clear binary cache
- Add tests to `workspace.test.ts` for cache hit, cache miss, clearBinaryCache, different tools

**Files**:
- Modify: `src/shared/workspace.ts`
- Modify: `src/shared/workspace.test.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 10 — Progress Reporting Helpers

**Status**: [x]

**Plan**:
- Create `src/shared/progress.ts` with `withFileProgress<T>(channel, title, files, processFn): Promise<T[]>`
- Handles progress increment, cancellation check, error collection per-file
- Per-file errors collected and returned — processing continues. All errors logged.
- Add locale strings: `progress.processing`, `progress.cancelled`, `progress.fileError`
- Create `src/shared/progress.test.ts` testing progress increments, cancellation, per-file errors, empty list

**Files**:
- Create: `src/shared/progress.ts`
- Create: `src/shared/progress.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 11 — State Manager

**Status**: [x]

**Plan**:
- Create `src/shared/state.ts` with `ToolStateManager` class
- States: `'ready' | 'running' | 'error' | 'disabled' | 'not-installed'`
- Methods: `setState(tool, state)`, `getState(tool)`, `onStateChange(tool, callback): Disposable`
- Invalid transitions logged as warnings, not thrown
- Add locale string: `state.transitioned`
- Create `src/shared/state.test.ts` testing all transitions, observers, multiple tools, invalid transitions

**Files**:
- Create: `src/shared/state.ts`
- Create: `src/shared/state.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 12 — Multi-Item Status Bar

**Status**: [x]

**Plan**:
- Add `createToolStatusBar(context, toolName, priority): StatusBarItem` factory to `src/shared/status-bar.ts`
- Keep existing `createStatusBar` as backwards-compatible wrapper
- Add locale string: `statusBar.tooltipPrefix`
- Add tests to `status-bar.test.ts` for factory, multiple items, priority, per-tool tooltip

**Files**:
- Modify: `src/shared/status-bar.ts`
- Modify: `src/shared/status-bar.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 13 — Diagnostics Manager

**Status**: [x]

**Plan**:
- Create `src/shared/diagnostics.ts` with `DiagnosticsManager` class
- Methods: `createDiagnostic(entry, document, source)`, `applyMaxProblems(diagnostics, max)`, `mapSeverity(severity)`
- Invalid entries logged and skipped — never crashes diagnostic creation
- Add locale string: `diagnostics.maxProblemsReached`, `diagnostics.invalidEntry`
- Create `src/shared/diagnostics.test.ts` testing severity mapping, max problems, source attribution, invalid entries

**Files**:
- Create: `src/shared/diagnostics.ts`
- Create: `src/shared/diagnostics.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 14 — Generic Tool Runner

**Status**: [x]

**Plan**:
- Add `runTool(options): Promise<{stdout, stderr, exitCode}>` base function to `src/shared/runner.ts`
- Add `runToolText(options)` and `runToolLines(options)` wrappers
- Refactor existing `runToolJson()` to use `runTool()` internally
- ALL error paths log to channel — timeout, spawn failure, parse error
- Add locale strings: `runner.timeout`, `runner.spawnFailed`
- Add tests to `runner.test.ts` for text output, line splitting, timeout, spawn error

**Files**:
- Modify: `src/shared/runner.ts`
- Modify: `src/shared/runner.test.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 15 — Plural/Number Formatting

**Status**: [x]

**Plan**:
- Add `formatPlural(count, forms: {one: string, other: string})` to `src/locale/schema.ts`
- Add `formatNumber(value, locale?)` using `Intl.NumberFormat`
- Falls back to `other` form if Intl is unavailable
- Backwards compatible — existing `format()` unchanged
- Add locale strings: `plurals.error`, `plurals.errors`, `plurals.warning`, `plurals.warnings`, `plurals.file`, `plurals.files`
- Add tests to `locale.test.ts` for singular/plural, zero, large numbers, number formatting

**Files**:
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/locale/locale.test.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**:
- Verify all 8 new source files exist (document-filter, notifications, config, command-registration, lifecycle, file-watcher, progress, state, diagnostics)
- Verify all 8 new test files exist
- Verify all locale strings added to schema.ts have corresponding en.ts values
- Verify extension.ts uses Document Filter, Notification Manager, Settings Change Listener
- Verify commands.ts uses registerCommand helper

**Files**:
- Verify: `src/shared/document-filter.ts`
- Verify: `src/shared/notifications.ts`
- Verify: `src/shared/config.ts`
- Verify: `src/shared/command-registration.ts`
- Verify: `src/shared/lifecycle.ts`
- Verify: `src/shared/file-watcher.ts`
- Verify: `src/shared/progress.ts`
- Verify: `src/shared/state.ts`
- Verify: `src/shared/diagnostics.ts`
- Verify: `src/locale/schema.ts`
- Verify: `src/locale/en.ts`

**Verification**: All source and test files exist, all locale strings paired

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm --filter @resist/vscode qa:lint`
- Run: `pnpm --filter @resist/vscode qa:test`
- Run: `pnpm --filter @resist/vscode qa:test:coverage`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline (106 tests)

**Verification**: All commands exit 0

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 15 features have source files and test coverage
- Verify all locale strings in schema.ts have corresponding en.ts values
- Verify no swallowed errors (every catch block logs to output channel)
- Verify coverage thresholds still pass
- Commit with descriptive message

**Verification**:
- All 8+ new source files exist in `src/shared/` and `src/locale/`
- Test count increased from 106 to baseline + new tests
- Coverage thresholds pass (statements 45%, branches 30%, functions 50%, lines 45%)
- Zero swallowed errors — every catch block has a logError call
