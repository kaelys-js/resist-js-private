# @resist/vscode Phase 54 — Unified VSCode Extension with Live Linter Diagnostics

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Delete the broken linter VSCode extension (calls nonexistent `scripts/lint.mjs`, 957 lines of dead code) and build a unified Resist VSCode extension from scratch. The extension spawns the real `resist-lint` CLI binary with `--format=json`, maps structured `LintResult` output to VSCode diagnostics (squiggly lines), and provides quick fixes via the `fix` field. A shared foundation is designed for both linting and formatting — this phase implements the linter module; the formatter module migrates in a future phase.
**Architecture**: One unified extension with shared infrastructure modules + feature modules. The extension does NOT import from workspace packages at runtime — it spawns CLI binaries as child processes. Plain `tsc` compilation (no bundler needed). Extension Development Host debugging via `launch.json`.

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
| Tests | 4946 pass |
| Old linter extension | 957 lines, calls nonexistent `scripts/lint.mjs`, never worked |
| Old formatter extension | Broken imports from `@/cli` (can't resolve in extension host) |
| `resist-lint` CLI | Works, supports `--format=json`, `--json`, `--list-rules`, `--stage`, `--category` |
| `LintResult` type | `file`, `line`, `column`, `endLine?`, `endColumn?`, `severity`, `message`, `ruleId`, `tip?`, `example?`, `source?`, `url?`, `fix: { range: { start, end }, text }` |

---

## Architecture Decision: One Extension, Not Two

The current codebase has two broken extensions in two different packages:
- **Linter** (`packages/shared/config/tooling/lint/src/extensions/vscode/lint/`) — 957 lines. Calls nonexistent `scripts/lint.mjs`. Has 350+ lines of hardcoded TOOLS array (45 tool definitions). Defines its own `LintResult` interface that doesn't match the real one. Never produced a single diagnostic.
- **Formatter** (`packages/shared/utils/cli/src/extensions/vscode/`) — Imports from `@/cli/format/registry` and `@/config/loader` which are workspace path aliases that cannot resolve in VSCode's extension host runtime.

**Problem with two extensions**: VSCode extensions are self-contained. Sharing code between two extension packages requires a bundler, publishing, or duplication.

**Solution**: One unified `@resist/vscode` extension that houses both linting and formatting under a shared foundation. This phase implements the **linter module** fully. The formatter module migrates in a future phase. The shared foundation is designed for both from day one.

**Location**: `packages/shared/config/tooling/vscode/` (new package)

**What gets deleted**: `packages/shared/config/tooling/lint/src/extensions/vscode/lint/` (entire directory)

**What stays (for now)**: `packages/shared/utils/cli/src/extensions/vscode/` (formatter extension, migrates later)

---

## TASK 1 — Delete old linter extension

**Status**: [x]

**Plan**:
- Delete entire directory `packages/shared/config/tooling/lint/src/extensions/vscode/lint/`
- This removes 957 lines of dead code: nonexistent `scripts/lint.mjs` reference, 350+ lines of hardcoded TOOLS array, duplicate `LintResult` interface, broken tool-install UI
- Verify no other code imports from or references this directory

**Files**:
- Delete: `packages/shared/config/tooling/lint/src/extensions/vscode/lint/` (entire directory)

**Verification**: Directory gone, no dangling references

---

## TASK 2 — Create extension scaffold (package.json, tsconfig.json)

**Status**: [x]

**Plan**:
- Create `packages/shared/config/tooling/vscode/` directory structure
- Create `package.json` with:
  - `name`: `@resist/vscode`
  - `displayName`: `Resist`
  - `description`: Custom linting with real-time diagnostics and auto-fix
  - `version`: `0.0.1`, `publisher`: `resist`, `private`: true
  - `engines.vscode`: `^1.85.0`
  - `activationEvents`: `["onStartupFinished"]`
  - `main`: `./out/extension.js`
  - `contributes.commands`: 7 commands (`resist.lint.file`, `resist.lint.workspace`, `resist.lint.fix`, `resist.lint.clear`, `resist.lint.listRules`, `resist.lint.restart`, `resist.lint.showOutput`)
  - `contributes.configuration`: 9 settings (`resist.lint.enable`, `resist.lint.onSave`, `resist.lint.onType`, `resist.lint.onOpen`, `resist.lint.debounceMs`, `resist.lint.maxProblems`, `resist.lint.stage`, `resist.lint.categories`, `resist.lint.args`)
  - `devDependencies`: `@types/vscode ^1.85.0`, `@vscode/vsce ^2.22.0`, `typescript ^5.3.0`
  - `scripts`: `compile` (tsc), `watch` (tsc -watch), `package` (vsce package)
- Create `tsconfig.json` with:
  - `module`: `commonjs` (VSCode requires CommonJS)
  - `target`: `ES2022`, `outDir`: `out`, `rootDir`: `src`
  - `strict`: true, `esModuleInterop`: true, `sourceMap`: true

**Files**:
- Create: `packages/shared/config/tooling/vscode/package.json`
- Create: `packages/shared/config/tooling/vscode/tsconfig.json`

**Verification**: Valid JSON, `tsc --noEmit` passes (after source files exist)

---

## TASK 3 — Shared foundation: types.ts

**Status**: [x]

**Plan**:
- Create `src/shared/types.ts` with shared type definitions used across all modules
- `RunResult<T>`: Generic result from spawning a CLI tool
  - Success: `{ ok: true, data: T, stderr: string, elapsed: number }`
  - Failure: `{ ok: false, error: string, stderr: string, code: number | null }`
- `DiagnosticEntry`: Normalized diagnostic matching the real `LintResult` shape from `@/lint/framework/types.ts`:
  - Required: `file`, `line`, `column`, `severity` (`'error' | 'warning' | 'info'`), `message`, `ruleId`
  - Optional: `endLine`, `endColumn`, `tip`, `example`, `source`, `url`
  - Fix: `fix: { range: { start: number, end: number }, text: string }`
- `ExtensionState`: `'ready' | 'linting' | 'error' | 'disabled'`
- `WorkspaceInfo`: `{ rootPath: string, binPath: string | undefined }`

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/types.ts`

**Verification**: Types compile, match real LintResult shape

---

## TASK 4 — Shared foundation: runner.ts (CLI process spawning)

**Status**: [x]

**Plan**:
- Create `src/shared/runner.ts` — spawns any CLI tool as a child process, collects structured output
- `runTool<T>(options)` function:
  - `options`: `{ command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv, timeout?: number, parseJson?: boolean }`
  - Spawns via `child_process.spawn`
  - Augments `PATH` with `node_modules/.bin` so locally-installed binaries resolve
  - Sets `FORCE_COLOR=0` to disable ANSI escape codes in output
  - Collects stdout/stderr as strings via `data` events
  - On `close`: if `parseJson`, parse stdout as `JSON` → `RunResult<T>`. Otherwise return raw string.
  - On `error` (spawn failure): return `RunResult` with `ok: false`
  - Timeout: kill child after N ms (default 30000), return failure result
  - No unhandled rejections — every error path resolves the promise

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/runner.ts`

**Verification**: Compiles, all error paths handled

---

## TASK 5 — Shared foundation: workspace.ts (workspace root + binary resolution)

**Status**: [x]

**Plan**:
- Create `src/shared/workspace.ts` — finds monorepo root and resolves tool binary paths
- `getWorkspaceRoot(uri: vscode.Uri): string | undefined`:
  - Get `vscode.workspace.getWorkspaceFolder(uri)` for the document's workspace folder
  - Walk up from that folder looking for `pnpm-workspace.yaml` (monorepo root marker)
  - Cache result per workspace folder path (don't re-walk on every lint)
  - Return the monorepo root path, or the workspace folder path as fallback
- `getBinaryPath(tool: string, uri: vscode.Uri): string | undefined`:
  - Get workspace root via `getWorkspaceRoot`
  - Check `path.join(root, 'node_modules', '.bin', tool)` exists
  - Return full path if exists, undefined if not
- `clearCache()`: Clear the workspace root cache (used by restart command)

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/workspace.ts`

**Verification**: Compiles, handles missing workspace folder gracefully

---

## TASK 6 — Shared foundation: debounce.ts (per-document timer management)

**Status**: [x]

**Plan**:
- Create `src/shared/debounce.ts` — manages debounce timers keyed by document URI
- `DocumentDebouncer` class:
  - Private `timers: Map<string, NodeJS.Timeout>`
  - `schedule(uri: string, fn: () => void, ms: number)`: Clear existing timer for URI, set new `setTimeout`, store it
  - `cancel(uri: string)`: Clear timer for URI, delete from map
  - `cancelAll()`: Clear all timers, clear map
  - `dispose()`: Alias for `cancelAll` (implements `vscode.Disposable` pattern)

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/debounce.ts`

**Verification**: Compiles, no timer leaks

---

## TASK 7 — Shared foundation: status-bar.ts (status bar with diagnostic counts)

**Status**: [x]

**Plan**:
- Create `src/shared/status-bar.ts` — unified status bar item for the extension
- `createStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem`:
  - Create item at `StatusBarAlignment.Right`, priority 100
  - Default text: `$(check) Resist`
  - Click command: `resist.lint.showOutput`
  - Add to `context.subscriptions`
- `updateStatusBar(item: vscode.StatusBarItem, state: ExtensionState, counts?: { errors: number, warnings: number })`:
  - `ready`: `$(check) Resist` (no background)
  - `linting`: `$(sync~spin) Linting...` (no background)
  - `error`: `$(error) Resist` (error background)
  - `disabled`: `$(circle-slash) Resist` (no background)
  - If counts provided and state is ready: `$(error) N $(warning) M` showing aggregate counts
- `getFileDiagnosticCounts(collection: vscode.DiagnosticCollection, uri: vscode.Uri): { errors: number, warnings: number }`:
  - Count diagnostics by severity for the given URI
  - Used to update status bar when active editor changes

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/status-bar.ts`

**Verification**: Compiles, all states covered

---

## TASK 8 — Shared foundation: output.ts (output channel logging)

**Status**: [x]

**Plan**:
- Create `src/shared/output.ts` — manages the "Resist" output channel for debug logging
- `createOutputChannel(): vscode.OutputChannel`:
  - Create `vscode.window.createOutputChannel('Resist')`
- `log(channel: vscode.OutputChannel, msg: string)`: Write timestamped info line `[HH:MM:SS] msg`
- `logError(channel: vscode.OutputChannel, msg: string)`: Write timestamped error line `[HH:MM:SS] ERROR: msg`
- `logCommand(channel: vscode.OutputChannel, cmd: string, args: string[])`: Write the full CLI command being spawned so user can reproduce in terminal: `[HH:MM:SS] $ cmd arg1 arg2 ...`
- `logTiming(channel: vscode.OutputChannel, label: string, ms: number)`: Performance logging: `[HH:MM:SS] label: Nms`

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/output.ts`

**Verification**: Compiles, timestamps formatted correctly

---

## TASK 9 — Linter module: provider.ts (core lint → diagnostics)

**Status**: [x]

**Plan**:
- Create `src/lint/provider.ts` — the main linting module that spawns `resist-lint` and maps output to VSCode diagnostics
- `lintDocument(document: vscode.TextDocument, options: LintOptions)`:
  - Skip non-file schemes, untitled documents, documents outside workspace
  - Find `resist-lint` binary via `getBinaryPath('resist-lint', doc.uri)`
  - If binary not found: log warning to output channel, return (don't crash)
  - Build args: `['--format=json']`
  - Add `--stage=<stage>` if configured
  - Add `--category=<cats>` if configured
  - Add any extra args from `resist.lint.args` setting
  - Add file path as last arg
  - Spawn via `runTool<DiagnosticEntry[]>(...)` from shared runner
  - If result not ok: log error to output channel, return
  - Map each `DiagnosticEntry` to `vscode.Diagnostic`:
    - Convert 1-based line/column to 0-based
    - Use `endLine`/`endColumn` if present for precise range highlighting
    - If no endLine/endColumn: use `document.getWordRangeAtPosition()` for token highlighting, fall back to cursor-to-EOL
    - Map severity: `'error'` → `DiagnosticSeverity.Error`, `'warning'` → `Warning`, `'info'` → `Information`
    - Set `diagnostic.source = 'resist-linter'`
    - Set `diagnostic.code = entry.ruleId` (shows in Problems panel)
    - Store fix data: `diagnostic.data = { fix: entry.fix, tip: entry.tip, example: entry.example, url: entry.url }` for code action provider
  - Apply `maxProblems` limit (slice results)
  - Set diagnostics on collection: `diagnosticCollection.set(doc.uri, diagnostics)`
  - Log timing to output channel
- `lintWorkspace(progress: vscode.Progress)`:
  - Spawn `resist-lint --format=json .` from workspace root
  - Parse results, group by file URI
  - Set diagnostics per file
  - Report progress percentage
- `LintOptions`: `{ stage?: string, categories?: string[], extraArgs?: string[], skipCustomRules?: boolean }`

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/lint/provider.ts`

**Verification**: Compiles, all error paths handled, proper severity mapping

---

## TASK 10 — Linter module: code-actions.ts (quick fix provider)

**Status**: [x]

**Plan**:
- Create `src/lint/code-actions.ts` — implements `vscode.CodeActionProvider` for auto-fix suggestions
- `ResistCodeActionProvider` class implementing `vscode.CodeActionProvider`:
  - `provideCodeActions(document, range, context)`:
    - Filter `context.diagnostics` to those with `source === 'resist-linter'`
    - For each diagnostic with `diagnostic.data?.fix` where fix has non-zero range or non-empty text:
      - Create `vscode.CodeAction` with title `Fix: ${diagnostic.code}` (e.g., "Fix: jsdoc/require-param")
      - Kind: `vscode.CodeActionKind.QuickFix`
      - Convert byte offsets (`fix.range.start`, `fix.range.end`) to `vscode.Range` using `document.positionAt()`
      - Create `vscode.WorkspaceEdit` with the replacement
      - Set `action.edit = edit`
      - Set `action.diagnostics = [diagnostic]` (links the fix to the squiggly)
      - Set `action.isPreferred = true` (appears first in the lightbulb menu)
    - If multiple fixable diagnostics overlap `range`: also create a "Fix all auto-fixable problems" action
      - Collect all fixes, sort by offset descending (apply from end to avoid offset shifting)
      - Apply all edits in one WorkspaceEdit
  - If diagnostic has `tip`: append to action title: `Fix: ruleId — tip`
  - If diagnostic has `url`: add as `action.command` that opens the URL (optional enhancement)

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/lint/code-actions.ts`

**Verification**: Compiles, handles empty/no-op fixes correctly (skip them, don't offer a no-op fix)

---

## TASK 11 — Linter module: watcher.ts (config file watcher)

**Status**: [x]

**Plan**:
- Create `src/lint/watcher.ts` — re-lints all open files when linter configuration changes
- `createConfigWatcher(lintFn: (doc: vscode.TextDocument) => void): vscode.Disposable[]`:
  - Watch `**/resist.config.ts` via `vscode.workspace.createFileSystemWatcher`
  - Watch `**/.resist-lint.jsonc` via `vscode.workspace.createFileSystemWatcher`
  - On `onDidChange`, `onDidCreate`, `onDidDelete`: debounce 1000ms, then re-lint all `vscode.workspace.textDocuments`
  - Return array of disposables for cleanup

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/lint/watcher.ts`

**Verification**: Compiles, debounced to avoid rapid re-lint storms

---

## TASK 12 — Linter module: commands.ts (command registration)

**Status**: [x]

**Plan**:
- Create `src/lint/commands.ts` — registers all lint commands
- `registerLintCommands(context, diagnosticCollection, outputChannel, statusBarItem, lintDocument, lintWorkspace)`:
  - `resist.lint.file`: Lint active editor document
  - `resist.lint.workspace`: Lint all files with `vscode.window.withProgress` progress bar
  - `resist.lint.fix`: Apply all auto-fixable diagnostics in current file (get diagnostics from collection, filter for those with fix data, apply edits from end to start)
  - `resist.lint.clear`: `diagnosticCollection.clear()`, update status bar
  - `resist.lint.listRules`: Spawn `resist-lint --list-rules`, show in output channel
  - `resist.lint.restart`: Clear workspace cache, clear diagnostics, re-lint all open documents
  - `resist.lint.showOutput`: `outputChannel.show()`
  - Each command registered via `vscode.commands.registerCommand`, added to `context.subscriptions`

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/lint/commands.ts`

**Verification**: Compiles, all 7 commands registered

---

## TASK 13 — Extension entry point: extension.ts

**Status**: [x]

**Plan**:
- Create `src/extension.ts` — orchestrates activation, registration, event listeners
- `activate(context: vscode.ExtensionContext)`:
  1. Create diagnostic collection: `vscode.languages.createDiagnosticCollection('resist-linter')`
  2. Create output channel: `vscode.window.createOutputChannel('Resist')`
  3. Create status bar item via shared `createStatusBar(context)`
  4. Verify `resist-lint` binary exists via `getBinaryPath('resist-lint', ...)`:
     - If not found: show one-time warning `"resist-lint not found in node_modules/.bin. Install @/lint to enable linting."`, log to output channel
     - Do NOT show a 45-tool installation wizard — the extension has ONE dependency
  5. Read configuration: `vscode.workspace.getConfiguration('resist')`
  6. Create `lintDocument` closure that reads current config and calls `provider.lintDocument()`
  7. Register code action provider: `vscode.languages.registerCodeActionProvider({ scheme: 'file' }, new ResistCodeActionProvider(), { providedCodeActionKinds: [CodeActionKind.QuickFix] })`
  8. Register config file watchers via `createConfigWatcher(lintDocument)`
  9. Register document event listeners:
     - `onDidOpenTextDocument` → lint if `resist.lint.onOpen` enabled
     - `onDidSaveTextDocument` → lint if `resist.lint.onSave` enabled
     - `onDidChangeTextDocument` → debounced lint if `resist.lint.onType` enabled (using `DocumentDebouncer`)
     - `onDidCloseTextDocument` → clear diagnostics for document, cancel debounce timer
  10. Register all 7 commands via `registerLintCommands()`
  11. Register `onDidChangeActiveTextEditor` → update status bar counts for new active file
  12. Register `onDidChangeConfiguration` → re-read config, re-lint if settings changed
  13. Lint all already-open documents: `vscode.workspace.textDocuments.forEach(lintDocument)`
  14. Log activation to output channel
- `deactivate()`:
  1. Cancel all debounce timers via `debouncer.dispose()`
  2. Diagnostic collection disposed via `context.subscriptions`
  3. Output channel disposed via `context.subscriptions`

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/extension.ts`

**Verification**: Compiles, all subscriptions pushed to context, no leaked timers

---

## TASK 14 — Add .vscode/launch.json for Extension Development Host debugging

**Status**: [x]

**Plan**:
- Add Extension Development Host launch configuration to workspace `.vscode/launch.json`
- Configuration:
  - `name`: `Run Resist Extension`
  - `type`: `extensionHost`
  - `request`: `launch`
  - `args`: `["--extensionDevelopmentPath=${workspaceFolder}/packages/shared/config/tooling/vscode"]`
  - `outFiles`: `["${workspaceFolder}/packages/shared/config/tooling/vscode/out/**/*.js"]`
  - `preLaunchTask`: compile the extension (or user can run `pnpm compile` manually)
- This enables: F5 → new VSCode window with extension active → see live lint diagnostics → Ctrl+Shift+F5 to reload after changes

**Files**:
- Modify or create: `.vscode/launch.json`

**Verification**: Valid JSON, `extensionDevelopmentPath` points to correct directory

---

## TASK 15 — Register Rules + Config

**Status**: [x]

**Plan**:
- No lint rules to register — this is an extension, not a linter rule
- Verify the extension's `package.json` is valid for VSCode extensions:
  - `engines.vscode` present
  - `main` points to `./out/extension.js`
  - `activationEvents` present
  - All `contributes.commands` have valid `command` and `title`
  - All `contributes.configuration.properties` have valid types and defaults
- Verify no references to old linter extension remain in the codebase
- Verify old extension directory is fully deleted

**Verification**: Extension manifest valid, no dangling references

---

## TASK 16 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm qa:test` — verify no test regressions from deleting old extension
- Run `pnpm qa:lint --tools` — verify no lint errors in new extension code
- Run `pnpm qa:format:check` — verify formatting
- Compile extension: `cd packages/shared/config/tooling/vscode && pnpm compile` — verify TypeScript compiles cleanly
- Verify test count unchanged from baseline (4946) — we deleted dead code, no test impact expected

**Verification**: All commands green, extension compiles, no regressions

---

## TASK 17 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify old linter extension directory is deleted
- Verify all 14 new source files exist in `packages/shared/config/tooling/vscode/src/`
- Verify `package.json` has all 7 commands, 9 settings
- Verify `tsconfig.json` compiles cleanly
- Verify `.vscode/launch.json` has Extension Dev Host config
- Verify extension compiles: `cd packages/shared/config/tooling/vscode && npx tsc --noEmit`
- Commit with descriptive message

**Verification**:
- `packages/shared/config/tooling/lint/src/extensions/vscode/lint/` does NOT exist
- `packages/shared/config/tooling/vscode/src/extension.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/runner.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/workspace.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/debounce.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/status-bar.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/output.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/types.ts` exists
- `packages/shared/config/tooling/vscode/src/lint/provider.ts` exists
- `packages/shared/config/tooling/vscode/src/lint/code-actions.ts` exists
- `packages/shared/config/tooling/vscode/src/lint/watcher.ts` exists
- `packages/shared/config/tooling/vscode/src/lint/commands.ts` exists
- `packages/shared/config/tooling/vscode/package.json` exists with 7 commands + 9 settings
- `packages/shared/config/tooling/vscode/tsconfig.json` exists
- `.vscode/launch.json` has `extensionHost` configuration
- Extension compiles cleanly with `tsc --noEmit`
- Commit clean

---

## Developer Workflow for Live Testing

### Option A: Extension Development Host (recommended for development)

1. Compile: `cd packages/shared/config/tooling/vscode && pnpm compile`
2. F5 in VSCode (uses launch.json) → opens new VSCode window with extension loaded
3. Open any `.ts` file → see lint diagnostics as squiggly lines in the editor
4. Edit a lint rule → recompile → Ctrl+Shift+F5 to reload Extension Dev Host
5. See updated diagnostics immediately

### Option B: Install as .vsix (recommended for daily use)

1. Package: `cd packages/shared/config/tooling/vscode && pnpm package`
2. Install: `code --install-extension resist-vscode-0.0.1.vsix`
3. Restart VSCode → extension permanently active
4. Rebuild + reinstall after changes

Both require `resist-lint` binary in `node_modules/.bin`, which is already present from `@/lint`'s `bin` field.

---

## Key Differences: Old Extension vs New

| Aspect | Old Extension (deleted) | New Extension |
|--------|------------------------|---------------|
| CLI call | `scripts/lint.mjs` (nonexistent) | `resist-lint` binary (real) |
| Output parsing | Regex on unix format + JSON fallback | `--format=json` structured output |
| Rule ID | Regex extraction from message | Direct from `ruleId` field |
| Range highlighting | Word range or cursor-to-EOL | `endLine`/`endColumn` precise ranges + word range fallback |
| Quick fixes | None | `CodeActionProvider` from `fix` field |
| Diagnostic metadata | None | `tip`, `example`, `url` stored as `data` |
| Tool install UI | 350 lines, 45 tool definitions | Single warning if `resist-lint` missing |
| Config watching | None | Watches `resist.config.ts`, `.resist-lint.jsonc` |
| Status bar | Static text `$(check) Resist Linter` | Dynamic error/warning counts `$(error) 3 $(warning) 7` |
| Shared foundation | None | 6 shared modules designed for linter + future formatter |
| Debug support | No launch.json | Extension Development Host via F5 |
| Lines of code | ~957 (dead) | ~500-600 (working) |
| Severity mapping | Switch on string with `default: Warning` | Exhaustive mapping matching `LintResult.severity` picklist |

---

## LintResult Field Usage

The real `LintResult` from `@/lint/framework/types.ts` has rich fields. Here's how each is used:

| Field | VSCode Mapping | Notes |
|-------|---------------|-------|
| `file` | `vscode.Uri.file(file)` | Keys the diagnostic collection |
| `line` | `Range` start line (0-indexed) | 1-based → 0-based conversion |
| `column` | `Range` start column (0-indexed) | 1-based → 0-based conversion |
| `endLine` | `Range` end line | Enables precise multi-line highlighting |
| `endColumn` | `Range` end column | Enables precise column-to-column highlighting |
| `severity` | `DiagnosticSeverity` | `'error'`→Error, `'warning'`→Warning, `'info'`→Information |
| `message` | `Diagnostic.message` | Full diagnostic message text |
| `ruleId` | `Diagnostic.code` | Appears in Problems panel, clickable |
| `tip` | `Diagnostic.data.tip` | Shown in quick fix title: `Fix: ruleId — tip` |
| `example` | `Diagnostic.data.example` | Available for hover/code action detail (future) |
| `source` | Not used (conflicts with `Diagnostic.source` field) | `Diagnostic.source` is always `'resist-linter'` |
| `url` | `Diagnostic.data.url` | Can open docs page from code action (future) |
| `fix.range.start` | `document.positionAt(start)` | Byte offset → Position for WorkspaceEdit |
| `fix.range.end` | `document.positionAt(end)` | Byte offset → Position for WorkspaceEdit |
| `fix.text` | `TextEdit.replace(range, text)` | Replacement text (empty = deletion) |

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Delete old linter extension | — |
| 2 | Extension scaffold (package.json, tsconfig) | — |
| 3 | Shared: types.ts | — |
| 4 | Shared: runner.ts | 3 |
| 5 | Shared: workspace.ts | 3 |
| 6 | Shared: debounce.ts | — |
| 7 | Shared: status-bar.ts | 3 |
| 8 | Shared: output.ts | — |
| 9 | Lint: provider.ts | 3, 4, 5, 7, 8 |
| 10 | Lint: code-actions.ts | 3 |
| 11 | Lint: watcher.ts | 6 |
| 12 | Lint: commands.ts | 9 |
| 13 | Extension: extension.ts | 3-12 |
| 14 | .vscode/launch.json | 2 |
| 15 | Register + Config verification | 1-14 |
| 16 | Full QA + Coverage | 15 |
| 17 | Final verification + commit | 16 |
