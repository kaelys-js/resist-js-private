# `@resist/vscode` deep dive — packages/shared/config/tooling/vscode

VS Code extension "Resist Tooling" — wraps the `resist-lint` CLI with real-time linting, code actions, hover, code lens, fix-on-save, panel tree view. Public-facing extension (not yet shipped to marketplace; `preview: true`, `publisher: "resist"`, v0.0.1).

## Package
- **Name**: `@resist/vscode`, displayName: "Resist Tooling"
- **Vitest project**: `config-tooling-vscode` (globals=true; alias `vscode` → `src/__mocks__/vscode.ts`)
- **Build**: `npx tsx scripts/generate-manifest.ts --fix && tsgo -p ./` (tsgo replaces stock tsc)
- **Package**: `vsce package --no-dependencies`
- **Activation**: `onStartupFinished`
- **VS Code version**: `^1.100.0`
- **Untrusted workspaces**: NOT supported (extension executes CLI from workspace, requires trusted env)
- **Coverage thresholds (custom)**: 90% statements/lines, 80% branches, 85% functions

## File structure (`src/`)
```
extension.ts                       ← activate/deactivate entry
extension.test.ts
__mocks__/
  vscode.ts                        ← Test mock for the vscode API
locale/
  en.ts                            ← English strings
  schema.ts                        ← LintStringsSchema, format(...)
  locale.test.ts
shared/                            ← Shared infrastructure (no lint-specific logic)
  index.ts                         ← shared barrel (extension.ts imports from here)
  brand.ts                         ← BINARY_NAME, COMMANDS, CONFIG_SECTION, scheme constants
  command-registration.ts + .test.ts
  config.ts + .test.ts             ← ConfigManager, onConfigurationChange
  debounce.ts + .test.ts           ← DocumentDebouncer (per-doc debouncing)
  diagnostics.ts + .test.ts        ← applyMaxProblems, createDiagnosticFromEntry, mapSeverity
  document-filter.ts + .test.ts    ← isLintableDocument, isWorkspaceDocument, forEachOpenDocument
  errors.ts + .test.ts             ← extractMessage, safeRun, safeRunAsync
  events.ts + .test.ts             ← DocumentEventRegistry
  file-watcher.ts + .test.ts       ← createBatchedFileWatcher
  lifecycle.ts + .test.ts          ← LifecycleManager + ManagedDisposable
  notifications.ts + .test.ts      ← NotificationManager
  output.ts + .test.ts             ← createOutputChannel, log, logError, logCommand, logTiming, logSummary, logDiagnosticList
  panel/                           ← Tree view (resist.panel)
    index.ts
    panel.ts + .test.ts            ← registerPanel
    tree-data-provider.ts + .test.ts
    tree-items.ts + .test.ts
    menu-sync.test.ts
  progress.ts + .test.ts           ← withFileProgress
  runner.ts + .test.ts             ← runTool, runToolJson, runToolText (CLI process spawning)
  state.ts + .test.ts              ← ToolStateManager, ToolState, STATE_LABELS
  status-bar.ts + .test.ts         ← createToolStatusBar, updateStatusBar
  types.ts                         ← DiagnosticEntry, RunResult, RunOptions, etc.
  workspace.ts + .test.ts          ← resolveWorkspace, getWorkspaceRoot, getBinaryPath
lint/                              ← Lint-specific providers and commands
  index.ts                         ← lint barrel (extension.ts imports from here)
  code-actions.ts + .test.ts       ← ResistCodeActionProvider (Quick Fix menu)
  code-lens.ts + .test.ts          ← ResistCodeLensProvider (inline rule labels)
  commands.ts + .test.ts           ← registerLintCommands
  diagnostic-filter.ts + .test.ts  ← DiagnosticFilter (category filter)
  diff-preview.ts + .test.ts       ← FixDiffPreviewProvider (preview-fixes diff view)
  fix-on-save.ts + .test.ts        ← FixOnSaveManager
  formatting-provider.ts + .test.ts ← ResistFormattingProvider (formatOnSave path)
  hover.ts + .test.ts              ← ResistHoverProvider, cleanExample
  import-sorting.ts + .test.ts     ← (used by code-actions)
  per-folder.ts + .test.ts         ← getPerFolderLintOptions (per-folder config)
  provider.ts + .test.ts           ← lintDocument, isExcludedPath, clearExcludeCache (CORE)
  rules-viewer.ts + .test.ts       ← showRulesViewer
  stage-indicator.ts + .test.ts    ← StageIndicator (status bar stage label)
  stale-cleanup.ts + .test.ts      ← StaleDiagnosticCleaner
  watcher.ts + .test.ts            ← createConfigWatcher
scripts/
  generate-manifest.ts + .test.ts  ← generates package.json contributes from code
```

Plus: `CHANGELOG.md`, `LICENSE`, `README.md`, `icon.png`, `resources/` (panel SVG icon)

## Activation flow (`extension.ts`)

1. **Create infrastructure**:
   - `vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME)`
   - `createOutputChannel()` (from `shared/output`)
   - `createToolStatusBar(context, 'Lint', 100)` (from `shared/status-bar`) → status bar item bound to `COMMANDS.statusBarMenu`
2. **Initialize state managers**:
   - `LifecycleManager` — priority-disposable registry (output channel disposed last)
   - `ToolStateManager` — state machine (`'running' | 'ready' | 'error' | 'disabled' | 'not-installed'`)
3. **Wire providers** (from `lint/`):
   - `ResistCodeActionProvider` (Quick Fix)
   - `ResistHoverProvider`
   - `ResistCodeLensProvider` (inline rule IDs)
   - `ResistFormattingProvider` (when `formatOnSave: true`)
   - `FixDiffPreviewProvider` (preview-fixes diff view, custom URI scheme `PREVIEW_SCHEME`)
4. **Wire managers**:
   - `DiagnosticFilter` (category filter)
   - `StageIndicator` (current `resist.lint.stage` shown in status bar)
   - `FixOnSaveManager`
   - `StaleDiagnosticCleaner` (clears diagnostics for files idle > `staleDiagnosticTimeoutMs`)
5. **Watchers**:
   - `createConfigWatcher` for `.resist-lint.jsonc`
   - `DocumentEventRegistry` for open/save/change events
   - `createBatchedFileWatcher` for workspace file changes
6. **Register commands** via `registerLintCommands(...)` (from `lint/commands.ts`)
7. **Register tree panel** via `registerPanel(...)` (from `shared/panel/panel.ts`)
8. **Lint already-open documents** with `forEachOpenDocument(...)` + `lintDocument`

`mapToolState(state: ToolState)` translates internal state → status-bar text:
- `'running'` → `'linting'`
- `'ready'` → `'ready'`
- `'error'` → `'error'`
- `'disabled' | 'not-installed'` → `'disabled'`

## Lifecycle manager (`shared/lifecycle.ts`)

```ts
type ManagedDisposable = { name, disposable, priority };

class LifecycleManager {
  register(name, disposable, priority = 10): void
  count(): number
  dispose(): void  // sorts by priority desc, disposes each, logs failures, doesn't bail
}
```
- Higher priority = disposed first
- Output channel registered with priority 0 → disposed LAST (so cleanup errors can be logged)
- Each dispose call wrapped — one failure doesn't prevent others

## Tool state manager (`shared/state.ts`)

```ts
type ToolState = 'running' | 'ready' | 'error' | 'disabled' | 'not-installed'

class ToolStateManager {
  // observer pattern + STATE_LABELS for display
}
```

## Runner (`shared/runner.ts`)

- `runTool(options)` — spawns CLI, returns `{stdout, stderr, exitCode, elapsed}`. Default timeout 30s. Adds `node_modules/.bin` to PATH, sets `FORCE_COLOR=0`. Handles stdin write.
- `runToolJson(options)` — parses stdout as JSON
- `runToolText(options)` — returns raw stdout

`RunOptions` (from `shared/types`): `command, args, cwd, env, timeout, stdin?`

## Diagnostics (`shared/diagnostics.ts`)

- `mapSeverity(severity: 'error' | 'warning' | 'info')` → `vscode.DiagnosticSeverity`
- `createDiagnosticFromEntry(entry: DiagnosticEntry)` → `vscode.Diagnostic` (with `code`, `source`, `relatedInformation`)
- `applyMaxProblems(diagnostics, max)` — caps per-file diagnostics at `resist.lint.maxProblems`

## Provider — the heart (`lint/provider.ts`)

`lintDocument(doc, opts: LintOptions, ...)` — main entry:
1. Skips if `isExcludedPath(filePath, cwd)` (reads `.resist-lint.jsonc` excludes, cached)
2. Spawns `resist-lint` via `runToolJson` with `--format=json`
3. Parses `LintResult[]` from CLI output
4. Maps each → `vscode.Diagnostic` via `createDiagnosticFromEntry`
5. Applies `applyMaxProblems` cap
6. Updates `DiagnosticCollection`, status bar, panel

```ts
type LintOptions = {
  readonly stage?: string;
  readonly categories?: readonly string[];
  readonly extraArgs?: readonly string[];
};
```

`isExcludedPath` uses cached exclude name set from `.resist-lint.jsonc`. `clearExcludeCache()` invalidates.

## All 30+ commands (`COMMANDS` from `shared/brand.ts`)

### Lint operations (`resist.lint.*`)
- `file` — Lint Current File
- `workspace` — Lint All Files in Workspace
- `staged` — Lint Only Staged Changes (git)
- `uncommitted` — Lint Only Uncommitted Changes (git)
- `fix` — Apply All Auto-Fixes in Current File
- `previewFixes` — Preview All Fixes in Diff View
- `removeUnusedImports` — Remove Unused Imports in Current File
- `clear` — Clear All Diagnostics
- `restart` — Restart Linter (Clear Cache & Re-Lint)
- `listRules` — Show Available Lint Rules
- `filterByCategory` — Filter Diagnostics by Rule Category
- `clearFilter` — Clear Diagnostic Category Filter
- `changeStage` — Change Active Lint Stage
- `toggleEnable` — Pause / Resume Linter
- `debugToggle` — Toggle Debug Mode
- `showOutput` — Show Output Channel
- `clearOutput` — Clear Output Channel
- `statusBarMenu` — opens action menu from status bar item

### Panel operations (`resist.panel.*`)
- `expandAll`, `filter`, `clearFilter`, `menu`
- `showLocation` (Ln/Col — Go to Line)
- `showRule` (Rule — Copy to Clipboard)
- `autoFix` (Auto-Fix Issue)

## Tree view contribution (`resist.panel`)

- viewsContainer: `resist` (activitybar icon `resources/resist-panel.svg`)
- view: `resist.panel` (type=tree)
- viewsWelcome: shown when no workspace ("No workspace detected. Open a folder to start linting…")
- submenu: `resist.panel.linting` (Linting actions)
- `view/title` actions: expandAll, filter, clearFilter + linting submenu
- `view/item/context` actions:
  - `viewItem == resist.fileDiagnostic` → file actions (lint, fix)
  - `viewItem == resist.toolError` → restart (inline)
  - `viewItem == resist.diagnosticDetail` → showLocation, showRule, autoFix

`registerPanel(...)` (from `shared/panel/panel.ts`) wires up `tree-data-provider.ts` + `tree-items.ts`. `menu-sync.test.ts` validates that the package.json `menus` are in sync with `COMMANDS`.

## Configuration namespace `resist.lint.*` (30+ properties)

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `enable` | bool | true | Master switch |
| `onSave` | bool | true | Lint on save |
| `onType` | bool | true | Lint as you type |
| `onOpen` | bool | true | Lint on open |
| `debounceMs` | number | 500 | Type-debounce (100-5000) |
| `maxProblems` | number | 100 | Per-file cap (1-1000) |
| `stage` | enum | "lint" | Stage gate: lint/check/pre-commit/build/ci/test |
| `categories` | string[] | [] | Filter rules to these categories |
| `args` | string[] | [] | Extra CLI args |
| `cache` | bool | true | Use file-fingerprint cache |
| `quiet` | bool | false | Suppress warnings (errors only) |
| `debug` | bool | false | Verbose output channel logging |
| `severityOverride` | enum | "" | "" / "error" / "warn" / "off" |
| `rule` | string | "" | Run only one rule by ID |
| `ignorePatterns` | string[] | [] | Additional excludes |
| `jobs` | number | 0 | Parallel workers (0 = auto) |
| `tools` | bool | true | Enable external tool integration |
| `locale` | string | "" | Diagnostic locale (e.g. "en") |
| `bail` | bool | false | Stop after first error |
| `fixOnSave` | bool | false | Auto-apply fixes on save |
| `codeLens` | bool | true | Show inline rule labels |
| `formatOnSave` | bool | false | Register as formatter |
| `staleDiagnosticTimeoutMs` | number | 300000 | Auto-clear idle file diagnostics (10000-3600000) |

Read via `ConfigManager` (from `shared/config.ts`). Subscribe via `onConfigurationChange(...)`.

## Lint module providers

| Module | Class/factory | Purpose |
|--------|--------------|---------|
| `code-actions.ts` | `ResistCodeActionProvider` | Quick Fix menu (apply fix, ignore rule, open docs) |
| `code-lens.ts` | `ResistCodeLensProvider` | Inline rule ID label above diagnostic line |
| `commands.ts` | `registerLintCommands(...)` | Wires up all `resist.lint.*` and `resist.panel.*` commands |
| `diagnostic-filter.ts` | `DiagnosticFilter` | Per-category visibility filter |
| `diff-preview.ts` | `FixDiffPreviewProvider` | Custom URI scheme (`PREVIEW_SCHEME`) for previewing fix diffs |
| `fix-on-save.ts` | `FixOnSaveManager` | Auto-applies fixes when `fixOnSave: true` |
| `formatting-provider.ts` | `ResistFormattingProvider` | Registers as VS Code formatter (when `formatOnSave: true`) |
| `hover.ts` | `ResistHoverProvider`, `cleanExample` | Hover tooltips with rule description + example |
| `import-sorting.ts` | (used by code-actions) | Import-sorting fix logic |
| `per-folder.ts` | `getPerFolderLintOptions` | Per-folder config resolution |
| `provider.ts` | `lintDocument`, `isExcludedPath` | THE core — spawns CLI, parses results, builds diagnostics |
| `rules-viewer.ts` | `showRulesViewer` | Tree view of all rules with descriptions (`RULES_SCHEME` URI) |
| `stage-indicator.ts` | `StageIndicator` | Status-bar stage label, click to change |
| `stale-cleanup.ts` | `StaleDiagnosticCleaner` | Clears diagnostics for files idle > timeout |
| `watcher.ts` | `createConfigWatcher` | Watches `.resist-lint.jsonc`, refires lint on change |

## Panel (`shared/panel/`)
- `panel.ts` — `registerPanel(...)` — wires tree view to `tree-data-provider.ts`
- `tree-data-provider.ts` — `vscode.TreeDataProvider` implementation
- `tree-items.ts` — `vscode.TreeItem` subclasses for files / categories / individual diagnostics
- `menu-sync.test.ts` — validates manifest menus match registered commands

## Brand constants (`shared/brand.ts`)
- `BINARY_NAME` — `'resist-lint'`
- `COMMANDS` — record of all command IDs
- `CONFIG_SECTION` — `'resist'`
- `CONFIG_LINT_SECTION` — `'resist.lint'`
- `DIAGNOSTIC_COLLECTION_NAME` — collection identifier
- `DIAGNOSTIC_SOURCE` — shown in diagnostic UI
- `PREVIEW_SCHEME` — custom URI scheme for diff preview
- `RULES_SCHEME` — custom URI scheme for rules viewer
- `PANEL_CONTAINER_ID` — `'resist'`
- `PANEL_VIEW_ID` — `'resist.panel'`

## Build pipeline (`scripts/generate-manifest.ts`)

Auto-generates the `contributes` section of `package.json` from code constants (`COMMANDS`, configuration definitions). Run as part of `pnpm build`:

```
npx tsx scripts/generate-manifest.ts --fix && tsgo -p ./
```

`--fix` writes updates to `package.json`. Without it, validates and exits 1 on drift. `generate-manifest.test.ts` ensures the generator's output matches the committed package.json.

## Test mock (`src/__mocks__/vscode.ts`)
Stub for the `vscode` API surface. Consumed by every test via vitest alias (`vscode` → mock path). Lets tests import the providers/managers without actual VS Code runtime.

## Locale (`src/locale/`)
- `schema.ts` — Valibot schemas for all string keys, `format(template, values)`
- `en.ts` — `en` constant: full english strings tree
- `locale.test.ts`

## Notable patterns
- **All public modules expose a class OR a factory function** — never bare singletons (testability)
- **All disposables go through LifecycleManager** with explicit priority — no manual `context.subscriptions.push`
- **All process exec goes through runner** (centralized timeout, env, stdin handling)
- **All errors go through `extractMessage` + `safeRun*`** — never direct try/catch in commands
- **Manifest is generated from code** — single source of truth for command IDs
- **All locale strings via `format(en.x.y, {values})`** — never inline
