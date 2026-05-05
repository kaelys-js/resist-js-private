# `@resist/vscode` lint/* + remaining shared/* modules

> Captured 2026-05-05. Path: `packages/shared/config/tooling/vscode/src/`. Per-file detail for the 15 `lint/*` providers + ~14 remaining `shared/*` modules + `panel/` + `scripts/` + `locale/`. Companion to `vscode-extension` (extension.ts + lifecycle/state/runner/diagnostics summaries). Do NOT duplicate that content here.

## `src/lint/` — 15 modules wiring lint-specific behavior

Each module exports a class or factory that's wired into `extension.ts` during activation. All depend on infrastructure from `shared/`.

### `code-actions.ts`
- **Class**: `ResistCodeActionProvider`.
- **VS Code API**: `vscode.languages.registerCodeActionsProvider(LINTABLE_LANGUAGES, provider, { providedCodeActionKinds })`.
- **Trigger**: VS Code requests code actions when user opens the lightbulb on a diagnostic.
- **User-visible output**: Quick Fix entries (Apply Fix, Fix all in file, Disable rule, Open docs).
- **Reads**: diagnostic data via `DiagnosticData` (fix range + replacement text or FileOpFix metadata).

### `code-lens.ts`
- **Class**: `ResistCodeLensProvider`.
- **VS Code API**: `vscode.languages.registerCodeLensProvider(LINTABLE_LANGUAGES, provider)`.
- **Trigger**: VS Code requests CodeLens for visible documents.
- **Output**: Inline rule-id label above each diagnostic line. Click → opens docs URL.
- **Setting**: `resist.lint.codeLens` toggles.

### `commands.ts`
- **Function**: `registerLintCommands(deps: CommandDeps)` + type `CommandDeps`.
- **Wires up all 30+ `resist.lint.*` and `resist.panel.*` commands** (see `vscode-extension` for the full command list).
- **Each command**: `vscode.commands.registerCommand(COMMANDS.lint.X, async () => safeRunAsync(() => ...))`.

### `diagnostic-filter.ts`
- **Class**: `DiagnosticFilter` + helper `collectEntries`.
- **VS Code API**: subscribes to `DiagnosticCollection.onDidChangeDiagnostics`.
- **Output**: filters which diagnostics are shown by category (driven by `resist.lint.categories` setting and `resist.lint.filterByCategory` command).
- **Updates**: status bar count + tree view items.

### `diff-preview.ts`
- **Class**: `FixDiffPreviewProvider` (TextDocumentContentProvider for `PREVIEW_SCHEME` URIs).
- **Functions**: `applyFixes(diffUri, fixes)`, `showFixDiffPreview(file, fixes)`.
- **VS Code API**: `vscode.workspace.registerTextDocumentContentProvider(PREVIEW_SCHEME, provider)` + `vscode.commands.executeCommand('vscode.diff', oldUri, newUri, title)`.
- **Output**: Diff editor showing original vs. fixed file before applying. User confirms → fixes apply.
- **Triggered by**: `resist.lint.previewFixes` command.

### `fix-on-save.ts`
- **Class**: `FixOnSaveManager`.
- **Constant**: `LOOP_GUARD_MS` — cooldown between save events to prevent infinite loops (save → fix → save → fix).
- **VS Code API**: subscribes to `vscode.workspace.onWillSaveTextDocument`.
- **Trigger**: setting `resist.lint.fixOnSave: true`.
- **Behavior**: spawns CLI with `--fix`, applies the resulting `LintFix[]` to the document via `WillSaveTextDocumentEvent.waitUntil(edits)`.

### `formatting-provider.ts`
- **Class**: `ResistFormattingProvider`.
- **VS Code API**: `vscode.languages.registerDocumentFormattingEditProvider(LINTABLE_LANGUAGES, provider)`.
- **Trigger**: setting `resist.lint.formatOnSave: true` registers provider; VS Code calls it when user invokes Format Document.
- **Behavior**: spawns CLI with `--fix --format=json`, parses fixes, returns `TextEdit[]` to VS Code.

### `hover.ts`
- **Class**: `ResistHoverProvider`.
- **Functions**: `cleanExample(example)`, `buildFixDiff(fix, source)`, `buildHoverContent(diagnostic, options)`, `hasExtraData(diagnostic)`.
- **VS Code API**: `vscode.languages.registerHoverProvider(LINTABLE_LANGUAGES, provider)`.
- **Output**: hover tooltip with rule description + example + tip + docs link + (if applicable) preview of the fix as a unified diff.

### `import-sorting.ts`
- **Constant**: `IMPORT_RULE_PATTERNS` — list of rule IDs that produce import-related diagnostics.
- **Functions**: `collectImportDiagnostics(document)`, `isImportDiagnostic(diagnostic)`, `removeUnusedImports(document)`.
- **Used by**: `code-actions.ts` (Quick Fix → "Remove unused imports") and the `resist.lint.removeUnusedImports` command.

### `per-folder.ts`
- **Function**: `getPerFolderLintOptions(documentUri) → LintOptions`.
- **Behavior**: walks up from the document's path looking for the nearest `.resist-lint.jsonc`, applies any per-folder overrides defined in `[[overrides]]` blocks of that config, returns the effective options for this file.

### `provider.ts` — the heart
- **Functions**: `lintDocument`, `lintWorkspace`, `isExcludedPath`, `clearExcludeCache`, `loadExcludeNames`, `mapEntryToDiagnostic`, `mapEntryToDiagnosticBasic`, `appendConfigArgs`.
- **Types**: `LintOptions`, `LintProgress`, `DiagnosticData`, `DiagnosticWithData`, `AppendConfigOptions`.
- **Constant**: `LANGUAGE_EXTENSIONS` — language-id → file-extension lookup.
- **Cache**: `excludeNamesCache` — module-scope Map of `(workspaceRoot → exclude name set)`. Invalidated by `clearExcludeCache()` when `.resist-lint.jsonc` changes.
- **Flow**: `lintDocument(doc, options, ...)` → `isExcludedPath(filePath, cwd)` early-return → spawn `resist-lint --format=json` via `runToolJson` → parse `LintResult[]` → `mapEntryToDiagnostic(entry)` per result → `applyMaxProblems(diagnostics, max)` → update DiagnosticCollection → update status bar + panel.

### `rules-viewer.ts`
- **Variable**: `currentPanel: WebviewPanel | null` (module-scope singleton — single rules viewer at a time).
- **Functions**: `showRulesViewer(context)`, `resetPanel()`, `parseRulesOutput(stdout)`, `renderRulesHtml(sections)`, `escapeHtml(s)`, `getNonce()`.
- **Types**: `RuleEntry`, `RuleSection`.
- **VS Code API**: `vscode.window.createWebviewPanel('resist.rules', 'Resist Lint Rules', viewColumn, { enableScripts: true })`.
- **Output**: HTML webview with searchable list of all available rules (parsed from `resist-lint --list-rules` output).
- **Triggered by**: `resist.lint.listRules` command.

### `stage-indicator.ts`
- **Class**: `StageIndicator`.
- **Constants**: `STAGES = ['lint','check','pre-commit','build','ci','test']`, `DEFAULT_STAGE = 'lint'`.
- **Output**: Status-bar item showing current stage. Click → opens QuickPick to change.
- **Setting**: `resist.lint.stage`.

### `stale-cleanup.ts`
- **Class**: `StaleDiagnosticCleaner`.
- **Function**: `getVisibleEditorUris()` — collects URIs of currently visible editors.
- **Behavior**: timer-driven (interval = `resist.lint.staleDiagnosticTimeoutMs`, default 5min). Compares last-lint timestamp per file URI to current time; if file has been idle longer than threshold AND not in a visible editor, clears its diagnostics.

### `watcher.ts`
- **Function**: `createConfigWatcher(context, onConfigChange)`.
- **VS Code API**: `vscode.workspace.createFileSystemWatcher('**/.resist-lint.jsonc')`.
- **Behavior**: on create/change/delete → calls `clearExcludeCache()` + `onConfigChange()` (which re-lints all open documents).

### `index.ts` (lint barrel)
Re-exports the public surface from the 15 `*.ts` modules. Imported by `extension.ts`.

## `src/shared/` — remaining modules NOT covered in `vscode-extension`

(Modules already covered there: `lifecycle.ts`, `state.ts`, `runner.ts`, `diagnostics.ts`. The rest:)

### `brand.ts`
Constants: `BINARY_NAME = 'resist-lint'`, `BRAND_NAME = 'Resist'`, `COMMAND_PREFIX = 'resist'`, `COMMANDS` (record of all command IDs grouped by namespace), `CONFIG_SECTION = 'resist'`, `CONFIG_LINT_SECTION = 'resist.lint'`, `CONFIG_FILE_PATTERNS = ['.resist-lint.jsonc', '.resist-lint.json']`, `DIAGNOSTIC_COLLECTION_NAME`, `DIAGNOSTIC_SOURCE`, `PANEL_CONTAINER_ID = 'resist'`, `PANEL_VIEW_ID = 'resist.panel'`, `PREVIEW_SCHEME` (custom URI for diff preview), `RULES_SCHEME` (custom URI for rules viewer).

This file is the source of truth for the manifest generator (`scripts/generate-manifest.ts`) — every command/config property in `package.json` is derived from these constants.

### `command-registration.ts`
Functions: `registerCommand(context, id, handler)`, `registerTextEditorCommand(context, id, handler)`. Thin wrappers around `vscode.commands.registerCommand` that auto-push to `context.subscriptions` and wrap the handler in `safeRunAsync` (errors get logged to output channel instead of unhandled-rejection).

### `config.ts`
- **Class**: `ConfigManager` — typed access to `vscode.workspace.getConfiguration('resist.lint')`. Methods like `getEnable()`, `getDebounceMs()`, `getMaxProblems()`, etc., all returning the right type per config property.
- **Function**: `onConfigurationChange(section, callback) → Disposable` — subscribes to `vscode.workspace.onDidChangeConfiguration` for a specific section.

### `debounce.ts`
- **Class**: `DocumentDebouncer` — per-URI debouncer. `schedule(uri, callback)` queues `callback` after `debounceMs` (cancels prior pending callback for same URI). Used by `extension.ts` for the `onType` lint trigger (default 500ms debounce).

### `document-filter.ts`
- **Constant**: `LINTABLE_LANGUAGES` — array of VS Code language ids the linter supports (`'typescript'`, `'svelte'`, `'json'`, etc.). Used as DocumentSelector for all providers.
- **Functions**: `isLintableDocument(doc)` — checks language id against `LINTABLE_LANGUAGES` AND ensures `doc.uri.scheme === 'file'`. `isWorkspaceDocument(doc)` — checks document is inside a workspace folder. `forEachOpenDocument(callback)` — iterates `vscode.workspace.textDocuments`.

### `errors.ts`
- **Function**: `extractMessage(err: unknown) → string` — safe error → message extraction (handles AppError/Error/string/unknown).
- **Functions**: `safeRun(fn) → T | undefined`, `safeRunAsync(fn) → Promise<T | undefined>` — wrap try/catch, log errors to output channel, return undefined on failure. Used everywhere instead of bare try/catch.

### `events.ts`
- **Class**: `DocumentEventRegistry` — single registry for all document-related event subscriptions (`onDidOpenTextDocument`, `onDidSaveTextDocument`, `onDidChangeTextDocument`, `onDidCloseTextDocument`).
- **Types**: `DocumentEventType`, `RegisteredHandler`.
- **Behavior**: register handlers once at activation; the registry filters which events fire which handlers, providing per-handler error isolation via `safeRun`.

### `file-watcher.ts`
- **Function**: `createFileWatcher(pattern, options) → FileSystemWatcher`.
- **Function**: `createBatchedFileWatcher({ pattern, debounceMs, onBatch }) → BatchedWatcher` — accumulates create/change/delete events for `debounceMs`, then fires `onBatch(events[])` once. Used for the workspace-wide watcher that re-lints affected files in bulk.
- **Type**: `BatchedWatcherOptions`.

### `notifications.ts`
- **Class**: `NotificationManager` — wraps `vscode.window.showErrorMessage`/`showWarningMessage`/`showInformationMessage` with rate-limiting + dismissal tracking (don't spam the user with repeated identical errors).

### `output.ts`
- **Functions**: `createOutputChannel(name) → OutputChannel`, `log(message)`, `logError(error)`, `logCommand(name, args, exitCode, elapsed)`, `logTiming(label, elapsed)`, `logSummary(stats)`, `logDiagnosticList(diagnostics)`, `timestamp()`.
- All output goes through this module — single source for log formatting + persistence to the "Resist Tooling" Output channel.

### `progress.ts`
- **Function**: `withFileProgress(opts, work) → Promise<R>` — wraps `vscode.window.withProgress({ location: Notification, title, cancellable })` for file-iterating operations. Handles cancellation token propagation.
- **Type**: `FileProcessResult`.

### `status-bar.ts`
- **Functions**: `createToolStatusBar(context, label, priority) → StatusBarItem`, `updateStatusBar(item, state, counts)`, `getFileDiagnosticCounts(uri, collection) → DiagnosticCounts`, `buildStatusTooltip(state, counts)`.
- **Helpers**: `badge(text, count)`, `cmd(commandId, args?)`, `cs(severity)` (severity → color), `TC` (theme color constants).
- **Type**: `DiagnosticCounts = { errors, warnings, info }`.

### `types.ts`
Shared types: `DiagnosticEntry` (CLI's per-diagnostic shape — what gets parsed from JSON output), `DiagnosticFix`, `ExtensionState`, `RunOptions` (for `runner.ts`), `RunResult = RunSuccess | RunFailure`, `WorkspaceInfo`.

### `workspace.ts`
- **Functions**: `resolveWorkspace(documentOrUri) → WorkspaceInfo`, `getWorkspaceRoot(documentOrUri) → string`, `getBinaryPath(workspaceRoot) → string` (resolves `node_modules/.bin/resist-lint` or fallback), `findMonorepoRoot(startDir) → string`, `clearCache()`.
- **Caches**: `binaryCache`, `rootCache` — module-scope Maps keyed by workspace root, invalidated by `clearCache()`.

### `index.ts` (shared barrel)
Re-exports the public surface from all `shared/*` modules. `extension.ts` imports from `@resist/vscode/shared` (this barrel).

## `src/shared/panel/` — Tree view panel

### `panel.ts`
- **Function**: `registerPanel(context, deps)` — creates `TreeView<TreeItem>` registered to view id `resist.panel`, wires up the tree data provider + tree items.

### `tree-data-provider.ts`
- **Class** implementing `vscode.TreeDataProvider<TreeItem>`. Tree shape: workspace root → file → diagnostic. `refresh()` triggers full tree rebuild from the DiagnosticCollection.

### `tree-items.ts`
- **Tree item subclasses**: WorkspaceItem (root), FileItem (file with diagnostic count badges), CategoryItem (when filter is grouped by category), DiagnosticItem (individual diagnostic with rule + message + Go to Line + Auto-Fix actions).

### `menu-sync.test.ts`
- **Test**: validates that the package.json `menus` block is in sync with the `COMMANDS` constant — every command should have a matching menu entry, and every menu entry should reference a real command. Catches drift at build time.

### `index.ts`
Barrel re-exporting `registerPanel`.

## `src/scripts/generate-manifest.ts`

- **Functions**: `parseBrandCommands(source)`, `validateMarkdown(content)`, `capture(...)`, `log(...)`, `logError(...)`.
- **Constants**: `FIX_MODE` (true if `--fix` arg present), `brandPath`, `brandSource`, `brandCommands`, `brandCommandIds`, etc.
- **Behavior**: reads `src/shared/brand.ts` source text, regex-parses the `COMMANDS` constant, builds the `contributes` block (commands, menus, configuration, keybindings) from those values + the configuration metadata in code, writes to `package.json` (when `--fix`) or validates and exits 1 on drift (CI mode).
- **Validates**: `README.md` and `CHANGELOG.md` mention every command id (catches docs drift).
- **Test**: `generate-manifest.test.ts` runs the generator against committed `package.json` and ensures output matches.

## `src/locale/`

### `schema.ts`
Valibot schemas for all string keys. `LintStringsSchema`, `format(template, values) → Result<Str>`. Same convention as `@/cli` and `@/lint` — multi-namespace registry.

### `en.ts`
Single named export `en: { ... }` — full English locale strings tree validated against `LintStringsSchema` at load time.

### `locale.test.ts`
Validates that `en.ts` parses against the schema (catches missing keys, extra keys, placeholder mismatches).

## `__mocks__/vscode.ts`

Test mock for the `vscode` API surface. Loaded via vitest project alias (`vscode` → `src/__mocks__/vscode.ts`). Lets unit tests import providers/managers without VS Code runtime. Heavy stub (~hundreds of lines) — implements: `commands`, `window`, `workspace`, `languages`, `Disposable`, `Diagnostic`/`DiagnosticSeverity`/`Range`/`Position`/`Uri`/`EventEmitter`, `TreeItem`/`TreeItemCollapsibleState`, `StatusBarAlignment`, `WebviewPanel`, etc.

## How everything connects (recap from `vscode-extension`)

```
extension.ts:activate(context)
  ├── createOutputChannel        ← shared/output
  ├── LifecycleManager           ← shared/lifecycle
  ├── ToolStateManager           ← shared/state
  ├── createDiagnosticCollection ← vscode core API
  ├── createToolStatusBar        ← shared/status-bar
  ├── ResistCodeActionProvider   ← lint/code-actions
  ├── ResistHoverProvider        ← lint/hover
  ├── ResistCodeLensProvider     ← lint/code-lens
  ├── ResistFormattingProvider   ← lint/formatting-provider
  ├── FixDiffPreviewProvider     ← lint/diff-preview
  ├── DiagnosticFilter           ← lint/diagnostic-filter
  ├── StageIndicator             ← lint/stage-indicator
  ├── FixOnSaveManager           ← lint/fix-on-save
  ├── StaleDiagnosticCleaner     ← lint/stale-cleanup
  ├── createConfigWatcher        ← lint/watcher
  ├── DocumentEventRegistry      ← shared/events
  ├── createBatchedFileWatcher   ← shared/file-watcher
  ├── registerLintCommands       ← lint/commands
  ├── registerPanel              ← shared/panel/panel
  └── forEachOpenDocument(...) → lintDocument(...)   ← shared/document-filter, lint/provider
```

Every Disposable goes through `LifecycleManager` (priority 10 by default; output channel registered at priority 0 → disposed last so other modules' cleanup errors get logged).
