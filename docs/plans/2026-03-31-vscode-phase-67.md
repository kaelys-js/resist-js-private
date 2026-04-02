# VSCode Phase 67 — Integrate Every Orphaned Shared Utility

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/src/`)
**Goal**: Integrate every shared utility that Phase 60 built but never wired. Fix every orphaned export, duplicated function, dead locale key, error swallow, and hardcoded string. Verify 100% integration — zero orphans.
**Architecture**: Replace manual vscode API patterns with their shared abstractions. Refactor provider.ts to use shared diagnostics module. Use ToolStateManager as state machine with status-bar observer. Use COMMAND_PREFIX to derive command IDs. Use WorkspaceInfo as return type for workspace resolution. Use createFileWatcher in watcher.ts. Use withFileProgress for restart/activation lint. Use createBatchedFileWatcher for external file-change re-lint.

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
| Tests | 359 total (359 pass) |
| Test files | 32 |
| Type-check | Passes |
| Commands registered | 15/15 |
| Config settings read | 24/24 |
| Feature classes wired | 7/7 |
| Orphaned shared exports | 14 (registerCommand, registerTextEditorCommand, ConfigManager, onConfigurationChange, LifecycleManager, DocumentEventRegistry, ToolStateManager, withFileProgress, createFileWatcher, createBatchedFileWatcher, createToolStatusBar, createDiagnosticFromEntry, applyMaxProblems, WorkspaceInfo) |
| Duplicated functions | 1 (mapSeverity in provider.ts duplicates diagnostics.ts) |
| Unused brand constants | 1 (COMMAND_PREFIX) |
| Dead locale keys | 10 |
| Error swallowing | 1 (provider.ts:250 bare catch) |
| Hardcoded strings | 1 (extension.ts:358 deactivation error) |

---

## TASK 1 — Integrate ConfigManager into extension.ts

**Status**: [ ]

**Gap**: `extension.ts` calls `vscode.workspace.getConfiguration(CONFIG_SECTION)` 6+ times. The shared `ConfigManager` (config.ts:53-123) with typed access and auto-refresh is never used.

**Plan**:
- Import `ConfigManager` from `./shared/config`
- Create `ConfigManager` instance in `activate()` with `CONFIG_SECTION` prefix and outputChannel
- Replace every `vscode.workspace.getConfiguration(CONFIG_SECTION)` in extension.ts with `configManager.get()` or `configManager.getSection()`
- Pass `configManager` to `registerLintCommands()` via `CommandDeps`
- Register `configManager` for disposal

**Files**:
- Edit: `src/extension.ts`
- Edit: `src/lint/commands.ts` (add configManager to CommandDeps)

**Verification**: Type-check passes, tests pass, `grep -c 'vscode.workspace.getConfiguration' src/extension.ts` returns 0

---

## TASK 2 — Integrate registerCommand + registerTextEditorCommand into commands.ts

**Status**: [ ]

**Gap**: Phase 60 Task 5 said "Refactor `src/lint/commands.ts` to use `registerCommand` helper" and marked it `[x]` — but it was NEVER DONE. commands.ts still manually calls `vscode.commands.registerCommand()` + `safeRunAsync()` 15 times. Additionally, 3 commands (lintFile, lintFix, removeUnusedImports) check `activeTextEditor` manually and should use `registerTextEditorCommand`.

**Plan**:
- Import `registerCommand` and `registerTextEditorCommand` from `../shared/command-registration`
- Convert lintFile, lintFix, removeUnusedImports to `registerTextEditorCommand` — removes manual `activeTextEditor` null checks
- Convert remaining 12 commands to `registerCommand`
- Remove direct imports of `safeRunAsync` from commands.ts (handled by helpers)
- Update `commands.test.ts` to capture both `vscode.commands.registerCommand` AND `vscode.commands.registerTextEditorCommand` mocks

**Files**:
- Edit: `src/lint/commands.ts`
- Edit: `src/lint/commands.test.ts`

**Verification**: Type-check passes, all 15 commands register, `grep -c 'vscode\.commands\.registerCommand\|vscode\.commands\.registerTextEditorCommand' src/lint/commands.ts` returns 0 (all via helpers now)

---

## TASK 3 — Integrate LifecycleManager into extension.ts

**Status**: [ ]

**Gap**: `extension.ts` manually pushes 8 disposables to `context.subscriptions` and has a fragile `deactivate()` with a single try/catch and hardcoded error string. `LifecycleManager` (lifecycle.ts:31-87) provides priority-ordered disposal with per-resource error boundaries.

**Plan**:
- Import `LifecycleManager` from `./shared/lifecycle`
- Create instance in `activate()`
- Replace all `context.subscriptions.push(...)` with `lifecycle.register(name, disposable, priority)` — priority 0 for outputChannel (last), 10+ for everything else
- Replace `deactivate()` body with `lifecycle.disposeAll(outputChannel)` — eliminates hardcoded 'Deactivation error:' string
- Push lifecycle itself to `context.subscriptions` for VS Code integration

**Files**:
- Edit: `src/extension.ts`

**Verification**: Type-check passes, tests pass, `grep "'Deactivation error:'" src/extension.ts` returns 0, `deactivate()` calls `lifecycle.disposeAll()`

---

## TASK 4 — Integrate DocumentEventRegistry into extension.ts

**Status**: [ ]

**Gap**: `extension.ts:202-275` manually registers 4 document lifecycle listeners with repeated config checks and filtering. `DocumentEventRegistry` (events.ts:33-200) centralizes this with per-tool dispatch and automatic `isWorkspaceDocument` filtering.

**Plan**:
- Import `DocumentEventRegistry` from `./shared/events`
- Create registry instance with outputChannel
- Register lint handlers: `onOpen('lint', ...)`, `onSave('lint', ...)`, `onChange('lint', ...)`, `onClose('lint', ...)`
- Move config checks (lint.enable, lint.onOpen, lint.onSave, lint.onType) into handler callbacks using `configManager` from TASK 1
- The onChange handler keeps: debouncing, stale diagnostic tracking, debounceMs config read
- Call `registry.initialize()` to wire VS Code listeners
- Register for disposal via LifecycleManager
- Remove the 4 manual `vscode.workspace.onDidXxx` blocks

**Files**:
- Edit: `src/extension.ts`

**Verification**: Type-check passes, tests pass, zero manual `onDidOpenTextDocument`/`onDidSaveTextDocument`/`onDidChangeTextDocument`/`onDidCloseTextDocument` in extension.ts

---

## TASK 5 — Integrate ToolStateManager + createToolStatusBar

**Status**: [ ]

**Gap**: `updateStatusBar()` is called 10 times across extension.ts (3), provider.ts (6), commands.ts (1) with ad-hoc state strings. `ToolStateManager` (state.ts:35-132) provides a formal state machine with observer notifications. `createToolStatusBar` (status-bar.ts:97-111) is a factory for per-tool status bars. Neither is used.

**Plan**:
- Import `ToolStateManager` from `./shared/state`
- Create instance in `activate()` with outputChannel
- Replace `createStatusBar(context)` with `createToolStatusBar(context, 'Lint', 100)` for the lint tool
- Register a state observer: `stateManager.onStateChange('lint', (tool, from, to) => updateStatusBar(statusBarItem, mapState(to), currentCounts))`
- Map ToolStateManager states to ExtensionState: 'running'→'linting', 'ready'→'ready', 'error'→'error', 'disabled'→'disabled', 'not-installed'→'disabled'
- Replace all `updateStatusBar(statusBarItem, state)` in provider.ts with `stateManager.setState('lint', mappedState)`
- Replace the one `updateStatusBar` in commands.ts lintClear with `stateManager.setState('lint', 'ready')`
- For 'ready' state with diagnostic counts: track counts in a closure the observer reads
- Pass `stateManager` to provider and commands via deps
- Register for disposal via LifecycleManager

**Files**:
- Edit: `src/extension.ts`
- Edit: `src/lint/provider.ts`
- Edit: `src/lint/commands.ts`
- Edit: `src/shared/status-bar.ts` (remove now-unused `createStatusBar` if fully replaced)

**Verification**: Type-check passes, tests pass, `grep -c 'updateStatusBar' src/lint/provider.ts` returns 0, `grep -c 'updateStatusBar' src/lint/commands.ts` returns 0, `grep -c 'createToolStatusBar' src/extension.ts` returns 1

---

## TASK 6 — Integrate shared diagnostics module into provider.ts

**Status**: [ ]

**Gap**: Phase 60 Task 13 created `diagnostics.ts` with `mapSeverity()`, `applyMaxProblems()`, `createDiagnosticFromEntry()`. But `provider.ts` has its OWN `mapSeverity()` function (line 436) that duplicates `diagnostics.ts:24-36`, and never imports from the shared module.

**Plan**:
- Delete the private `mapSeverity()` from provider.ts (line 436-447)
- Import `mapSeverity` from `../shared/diagnostics` instead
- Evaluate `createDiagnosticFromEntry` — provider.ts has richer `mapEntryToDiagnostic` (with document context, word range, example appending, clickable URLs). If `createDiagnosticFromEntry` is a subset, refactor to have provider.ts call `createDiagnosticFromEntry` for the basic case and extend for the rich case, OR update `createDiagnosticFromEntry` to support the full feature set
- Evaluate `applyMaxProblems` — provider.ts reads `lint.maxProblems` and manually slices. Replace with `applyMaxProblems(diagnostics, max, channel)`

**Files**:
- Edit: `src/lint/provider.ts`
- Edit: `src/shared/diagnostics.ts` (if extending createDiagnosticFromEntry)

**Verification**: Type-check passes, tests pass, `grep -c 'function mapSeverity' src/lint/provider.ts` returns 0 (no local duplicate), `grep 'from.*diagnostics' src/lint/provider.ts` shows import from shared module

---

## TASK 7 — Integrate createFileWatcher into watcher.ts

**Status**: [ ]

**Gap**: Phase 60 Task 7 said "Refactor `src/lint/watcher.ts` to use `createFileWatcher`" and marked it `[x]` — but NEVER DONE. watcher.ts still manually creates `FileSystemWatcher` instances and uses `DocumentDebouncer` for debouncing.

**Plan**:
- Import `createFileWatcher` from `../shared/file-watcher` in watcher.ts
- Replace the manual watcher creation + debouncing with `createFileWatcher(CONFIG_FILE_PATTERNS as string[], relintAll, outputChannel)`
- Remove unused `DocumentDebouncer` import
- The `relintAll` callback stays the same

**Files**:
- Edit: `src/lint/watcher.ts`

**Verification**: Type-check passes, watcher tests pass, `grep -c 'createFileSystemWatcher' src/lint/watcher.ts` returns 0, `grep 'createFileWatcher' src/lint/watcher.ts` shows import from shared module

---

## TASK 8 — Integrate createBatchedFileWatcher for source-file change detection

**Status**: [ ]

**Gap**: `createBatchedFileWatcher` (file-watcher.ts:115-198) batches file changes with URI deduplication. Currently, external file changes (git checkout, terminal edits) don't trigger re-lint — only editor events do. This is the natural consumer: watch source files for external changes and batch-relint.

**Plan**:
- In extension.ts or a new `src/lint/source-watcher.ts`, create a source file watcher using `createBatchedFileWatcher(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'], callback, outputChannel, { batchWindowMs: 1000 })`
- The callback receives changed URIs → for each URI, call `lintDoc()` if the document is open in the editor
- This catches external changes (git operations, terminal edits) that the current DocumentEventRegistry onChange doesn't detect
- Register for disposal via LifecycleManager
- Gate behind a config setting (e.g., `lint.watchFiles`, default false) so it's opt-in for performance

**Files**:
- Edit: `src/extension.ts` (or create `src/lint/source-watcher.ts`)

**Verification**: Type-check passes, tests pass, `grep 'createBatchedFileWatcher' src/` shows import and usage

---

## TASK 9 — Integrate withFileProgress for restart + activation lint

**Status**: [ ]

**Gap**: `withFileProgress` (progress.ts:41-88) processes files with a progress bar, per-file error collection, and cancellation. The `restart` command (commands.ts) iterates all open docs and lints each without progress. The initial activation lint does the same. Both are natural consumers.

**Plan**:
- In commands.ts `restart` handler: collect open document URIs, call `withFileProgress(outputChannel, en.progress.restart, uris, async (uri) => { lintDocumentFn(doc) })`
- Add locale key `progress.restart` for restart progress title
- In extension.ts activation: replace `forEachOpenDocument(isWorkspaceDocument, lintDoc, outputChannel)` with `withFileProgress(outputChannel, en.progress.activation, openUris, async (uri) => { lintDoc(doc) })`
- Add locale key `progress.activation` for activation progress title
- Pass `withFileProgress` reference or outputChannel to commands via deps

**Files**:
- Edit: `src/lint/commands.ts`
- Edit: `src/extension.ts`
- Edit: `src/locale/en.ts` (add progress.restart, progress.activation)
- Edit: `src/locale/schema.ts` (add to ProgressStrings)

**Verification**: Type-check passes, tests pass, `grep 'withFileProgress' src/lint/commands.ts` shows usage, `grep 'withFileProgress' src/extension.ts` shows usage

---

## TASK 10 — Use COMMAND_PREFIX to derive COMMANDS + integrate WorkspaceInfo

**Status**: [ ]

**Gap**: `COMMAND_PREFIX` ('resist') is defined in brand.ts but never used. The COMMANDS object hardcodes 'resist.lint.file' etc. instead of deriving from the prefix. `WorkspaceInfo` (types.ts:108-113) is defined but never used as a return type.

**Plan**:
- In brand.ts, derive COMMANDS values from COMMAND_PREFIX: `` `${COMMAND_PREFIX}.lint.file` `` etc.
- This makes white-labelling automatic — change COMMAND_PREFIX and all command IDs update
- In workspace.ts, create a `resolveWorkspace(uri): WorkspaceInfo | undefined` function that returns `{ rootPath, binPath }` using existing `getWorkspaceRoot()` + `getBinaryPath()`
- Use `WorkspaceInfo` as the return type
- Update extension.ts activation to use `resolveWorkspace()` instead of separate calls

**Files**:
- Edit: `src/shared/brand.ts`
- Edit: `src/shared/workspace.ts`
- Edit: `src/extension.ts`

**Verification**: Type-check passes, tests pass, `grep 'COMMAND_PREFIX' src/shared/brand.ts` shows it's used in COMMANDS derivation, `grep 'WorkspaceInfo' src/shared/workspace.ts` shows it's used as return type

---

## TASK 11 — Use onConfigurationChange for re-lint trigger

**Status**: [ ]

**Gap**: After TASK 1 integrates ConfigManager (auto-refreshes cache), the extension still needs to re-lint all open documents when lint config changes. The `onConfigurationChange()` wrapper (config.ts:28-45) provides error-boundary-wrapped section-specific listening.

**Plan**:
- Use `onConfigurationChange(CONFIG_LINT_SECTION, relintAllCallback, outputChannel)` to trigger re-lint
- Register returned disposable via LifecycleManager
- This replaces the manual `onDidChangeConfiguration` block removed in TASK 1

**Files**:
- Edit: `src/extension.ts`

**Verification**: `onConfigurationChange` imported and used, config change → re-lint behavior preserved, type-check passes

---

## TASK 12 — Remove dead locale keys

**Status**: [ ]

**Gap**: 10 locale keys are never used outside tests: `commands.registered`, `commands.executionFailed`, `events.registered`, `events.dispatched`, `codeLens.openDocs`, `imports.commandTitle`, `inlineOverrides.foundOverrides`, `plurals.file`, `plurals.files`, `staleCleanup.trackingFile`.

**Plan**:
- Remove dead values from `en.ts`
- Remove fields from interfaces in `schema.ts`
- If all fields removed from an interface (e.g., CommandStrings), delete the interface + VscodeStrings member
- Remove corresponding tests from `locale.test.ts`

**Files**:
- Edit: `src/locale/en.ts`
- Edit: `src/locale/schema.ts`
- Edit: `src/locale/locale.test.ts`

**Verification**: Type-check passes (no references to deleted keys), `grep -c 'commands\.registered\|events\.registered\|codeLens\.openDocs\|imports\.commandTitle\|inlineOverrides\.foundOverrides\|plurals\.file\b\|staleCleanup\.trackingFile' src/locale/en.ts` returns 0

---

## TASK 13 — Fix error swallowing in provider.ts

**Status**: [ ]

**Gap**: `provider.ts:250-252` has bare `catch { skipped++; }` — individual error details are swallowed.

**Plan**:
- Change `catch {` to `catch (error: unknown) {`
- Log the error via `logError(channel, format(en.messages.diagnosticMapFailed, { rule: entry.ruleId, location: '...', error: ... }))` before incrementing skipped
- The locale key `messages.diagnosticMapFailed` already exists

**Files**:
- Edit: `src/lint/provider.ts`

**Verification**: Type-check passes, `grep -c 'catch {' src/lint/provider.ts` returns 0

---

## TASK 14 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify ALL new imports are added correctly
- Verify no orphaned code — every shared module export has a non-test consumer
- Check: ConfigManager, LifecycleManager, DocumentEventRegistry, ToolStateManager, registerCommand, registerTextEditorCommand, createFileWatcher, createBatchedFileWatcher, withFileProgress, onConfigurationChange, createToolStatusBar, mapSeverity, applyMaxProblems, createDiagnosticFromEntry, COMMAND_PREFIX, WorkspaceInfo — ALL imported and used

**Files**:
- Edit: `src/extension.ts` (verify imports)
- Edit: `src/lint/commands.ts` (verify imports)
- Edit: `src/lint/provider.ts` (verify imports)
- Edit: `src/lint/watcher.ts` (verify imports)

**Verification**: All shared exports are imported outside their own file, type-check passes

---

## TASK 15 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all 15 declared commands have matching registerCommand/registerTextEditorCommand calls
- Verify all config settings are read via configManager.get or config.get — count must be 24+
- Verify all feature classes are instantiated in extension.ts — ConfigManager, LifecycleManager, DocumentEventRegistry, ToolStateManager + original 7 = 11+ classes
- Verify zero unused exports / dead code — grep every `.ts` file's exports, verify each has a non-test import
- Grep audit: `grep -rn 'export ' src/shared/ src/lint/ --include='*.ts' | grep -v test | grep -v '.d.ts'` → for each export, verify a corresponding import exists outside the defining file

**Verification**:
- `grep -c 'registerCommand\|registerTextEditorCommand' src/lint/commands.ts` ≥ 15
- All config settings have configManager.get calls
- All feature classes instantiated (grep extension.ts for class names)
- No orphaned exports — every export has a non-test import

---

## TASK 16 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm qa:test`
- Verify all tests pass

**Verification**: All pnpm commands exit 0

---

## TASK 17 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all implementation files exist
- Verify all shared utilities integrated (zero orphans)
- Verify all integration checks pass
- Verify zero dead locale keys
- Verify zero unused shared exports
- Verify zero error swallowing (no bare catch blocks)
- Verify zero hardcoded user-facing strings
- Verify zero duplicated functions across modules
- Commit with descriptive message

**Verification**:
- All `.ts` files exist
- Integration audit: zero gaps
- `grep -rn 'catch {' src/ --include='*.ts' | grep -v test` returns 0
- `grep -rn 'function mapSeverity' src/ --include='*.ts'` returns exactly 1 result (in diagnostics.ts only)
- Every export has a non-test import

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Integrate ConfigManager | -- |
| 2 | Integrate registerCommand + registerTextEditorCommand | -- |
| 3 | Integrate LifecycleManager | -- |
| 4 | Integrate DocumentEventRegistry | 1, 3 |
| 5 | Integrate ToolStateManager + createToolStatusBar | 1, 3 |
| 6 | Integrate shared diagnostics into provider.ts | -- |
| 7 | Integrate createFileWatcher into watcher.ts | -- |
| 8 | Integrate createBatchedFileWatcher for source-file watching | 7 |
| 9 | Integrate withFileProgress for restart + activation | 2 |
| 10 | Use COMMAND_PREFIX + WorkspaceInfo | -- |
| 11 | Use onConfigurationChange for re-lint trigger | 1, 4 |
| 12 | Remove dead locale keys | 5, 6, 8, 9 |
| 13 | Fix error swallowing in provider.ts | 6 |
| 14 | Register rules + config | 1-13 |
| 15 | Integration verification | 14 |
| 16 | Full QA + Coverage | 15 |
| 17 | Final verification + commit | 16 |
