# @resist/vscode Feature Roadmap

**Last updated**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Current state**: 20 lint features implemented, 0 shared foundation features implemented

This document tracks all identified features for the VS Code extension, split into two categories: shared foundation (tool-agnostic infrastructure) and lint-specific enhancements.

---

## Shared Foundation Features (18 total)

Features that are NOT lint-specific. They benefit ANY future tool integration (formatter, test runner, dependency analyzer, etc.). Building these first creates a reusable platform that reduces per-tool implementation cost.

---

### Configuration (3 features)

#### 1. Configuration Manager

**Priority**: High
**Complexity**: Medium
**Current pain**: `vscode.workspace.getConfiguration('resist')` is called in 6+ locations with hardcoded setting paths like `'lint.enable'`, `'lint.onSave'`, `'lint.debounceMs'`. Each call has a default value that could drift out of sync with `package.json` defaults.

**What it does**: Typed settings reader with schema validation. A single `ConfigManager` class reads all settings once, validates them against the schema, caches results, and provides typed accessors like `config.lint.enable` instead of `config.get<boolean>('lint.enable', true)`.

**Implementation notes**:
- Class `ConfigManager` in `src/shared/config.ts`
- Constructor takes configuration prefix (e.g., `'resist'`)
- Typed accessors generated from `package.json` contributes.configuration schema
- Auto-invalidates on `onDidChangeConfiguration` events
- Default values come from schema, not hardcoded in each call site

---

#### 2. Generic Config File Watcher

**Priority**: Medium
**Complexity**: Low
**Current pain**: `src/lint/watcher.ts` is lint-specific — it watches for `.resist-lint*` files and re-lints. A formatter would need its own near-identical watcher.

**What it does**: Generalized file watcher that accepts any glob pattern and callback. Multiple tools register their own config patterns; the watcher manages all of them with proper cleanup and debouncing.

**Implementation notes**:
- Move to `src/shared/file-watcher.ts`
- API: `createConfigWatcher(patterns: string[], callback: () => void): Disposable`
- Built-in debouncing (config saves often trigger multiple FS events)
- Tracks all watchers for bulk disposal

---

#### 3. Settings Change Listener

**Priority**: Medium
**Complexity**: Low
**Current pain**: `extension.ts` manually checks `event.affectsConfiguration('resist.lint')` and re-lints all documents. Each new tool would repeat this pattern.

**What it does**: Reusable helper: `onConfigurationChange(prefix, callback)` that handles the boilerplate of listening for config changes and calling the right handler.

**Implementation notes**:
- Helper in `src/shared/config.ts` or standalone
- API: `onConfigurationChange(section: string, handler: () => void): Disposable`
- Could integrate with Configuration Manager for automatic refresh

---

### Documents & Files (3 features)

#### 4. Document Filter/Selector

**Priority**: High
**Complexity**: Low
**Current pain**: The pattern `doc.uri.scheme === 'file' && !doc.isUntitled` is repeated in 5+ places across `extension.ts`, `provider.ts`, and `commands.ts`. Language-specific checks will add more repetition.

**What it does**: Reusable predicate functions for common document checks. Centralizes all document filtering logic.

**Implementation notes**:
- Module `src/shared/document-filter.ts`
- `isLintableDocument(doc)` — checks scheme, untitled, language
- `isWorkspaceDocument(doc)` — checks scheme + untitled
- `matchesSelector(doc, selector)` — VS Code DocumentSelector-style matching
- Used in event handlers, commands, and providers

---

#### 5. Document Iteration Helper

**Priority**: Medium
**Complexity**: Low
**Current pain**: `extension.ts` has two separate loops over `vscode.workspace.textDocuments` (activation + config change), each with the same filter conditions.

**What it does**: `forEachWorkspaceDocument(predicate, callback)` replacing repeated loops with a single utility.

**Implementation notes**:
- In `src/shared/document-filter.ts` alongside predicates
- API: `forEachOpenDocument(filter: (doc) => boolean, action: (doc) => void)`
- Handles edge cases (closed documents, invalid URIs)

---

#### 6. File Watching Abstraction

**Priority**: Low
**Complexity**: Medium
**Current pain**: Raw `vscode.workspace.createFileSystemWatcher()` calls require manual disposal and don't debounce.

**What it does**: Higher-level wrapper with automatic cleanup, debouncing, and event batching.

**Implementation notes**:
- Wraps `createFileSystemWatcher()` with `Disposable` pattern
- Built-in debounce for rapid file changes (editor autosave)
- Optional event batching (collect changes, fire once)
- Could share implementation with Generic Config File Watcher (#2)

---

### Commands & Events (3 features)

#### 7. Command Registration Pattern

**Priority**: High
**Complexity**: Low
**Current pain**: Each command in `commands.ts` manually wraps its handler with `safeRunAsync` and pushes to `context.subscriptions`. 11 commands repeat this pattern.

**What it does**: Generic `registerCommand(id, handler, deps)` that handles error wrapping, subscription management, and dependency injection automatically.

**Implementation notes**:
- Helper in `src/shared/commands.ts`
- API: `registerCommand(context, id, handler)` — auto-wraps with `safeRunAsync`
- Variant: `registerTextEditorCommand` for commands needing active editor
- All commands use the same error boundary and output channel

---

#### 8. Document Event Registry

**Priority**: Medium
**Complexity**: Medium
**Current pain**: `extension.ts` has 4 separate event listeners (onOpen, onSave, onChange, onClose), each with similar boilerplate (check config, check scheme, call handler).

**What it does**: Pluggable hook system where tools register for document lifecycle events. Each tool declares which events it cares about; the registry handles filtering, config checks, and dispatch.

**Implementation notes**:
- Class `DocumentEventRegistry` in `src/shared/events.ts`
- Tools register: `registry.onSave('lint', handler)`
- Registry handles: config checks, document filtering, error boundaries
- Single set of VS Code event listeners shared across all tools

---

#### 9. Lifecycle Hook Manager

**Priority**: Low
**Complexity**: Low
**Current pain**: `context.subscriptions.push(...)` is called 10+ times in `extension.ts`. Disposal order isn't guaranteed.

**What it does**: Disposable registry with ordered cleanup on deactivation.

**Implementation notes**:
- Wraps `context.subscriptions` with priority-based disposal
- Ensures output channel is disposed last (so errors during cleanup can be logged)
- Named disposables for debugging ("disposed: config-watcher")

---

### Tool Execution (3 features)

#### 10. Generic Tool Runner

**Priority**: High
**Complexity**: Medium
**Current pain**: `runToolJson()` in `provider.ts` only handles JSON output. A formatter tool would return plain text; a test runner might return TAP format.

**What it does**: Generalized tool execution that handles multiple output formats (JSON, text, structured), with consistent error handling, timeout management, and cancellation.

**Implementation notes**:
- Extend or replace `runToolJson()` in `src/shared/workspace.ts`
- `runTool(command, args, options)` returns `{ stdout, stderr, exitCode }`
- Format-specific wrappers: `runToolJson()`, `runToolText()`, `runToolLines()`
- Built-in timeout, cancellation token support, working directory resolution

---

#### 11. Binary Resolution with Caching

**Priority**: Medium
**Complexity**: Low
**Current pain**: `getBinaryPath()` searches `node_modules/.bin` every time it's called. No caching. Each tool would repeat this lookup.

**What it does**: Generalized binary finder for any tool name with result caching and invalidation on `node_modules` changes.

**Implementation notes**:
- Enhance `getBinaryPath()` in `src/shared/workspace.ts`
- Cache resolved paths in memory (Map keyed by tool name + workspace)
- Invalidate on `node_modules` directory changes (file watcher)
- Support fallback paths (global install, custom path setting)

---

#### 12. Workspace Root Resolution

**Priority**: Low
**Complexity**: Low
**Current pain**: `getWorkspaceRoot()` searches upward for `package.json`. Other tools might need `tsconfig.json`, `.git`, or custom marker files.

**What it does**: Generalized root finder that searches for any marker file(s).

**Implementation notes**:
- Parameterize `getWorkspaceRoot()` with marker file list
- API: `findWorkspaceRoot(startPath, markers: string[]): string | undefined`
- Cache results per (startPath, markers) pair
- Support multiple markers with priority (first match wins)

---

### Status & UX (5 features)

#### 13. Progress Reporting Helpers

**Priority**: Medium
**Complexity**: Low
**Current pain**: `commands.ts` uses `vscode.window.withProgress()` with inline configuration. The progress pattern (process N files, report count) is repeated for workspace lint, staged lint, and uncommitted lint.

**What it does**: Abstraction over `withProgress()` for file-processing operations with consistent UX.

**Implementation notes**:
- Helper in `src/shared/progress.ts`
- API: `withFileProgress(title, files, processFn)` — handles progress increment, cancellation, error collection
- Consistent progress format across all tools

---

#### 14. State Manager

**Priority**: Medium
**Complexity**: Medium
**Current pain**: Extension uses loose boolean flags (`hasWarnedMissingBinary`, global `isLinting` checks via status bar text). State is implicit and scattered.

**What it does**: Per-tool state machine (ready/running/error/disabled) with typed transitions and observers.

**Implementation notes**:
- Class `ToolStateManager` in `src/shared/state.ts`
- States: `'ready' | 'running' | 'error' | 'disabled' | 'not-installed'`
- Each tool has independent state
- Observers can react to state changes (status bar updates, command enablement)

---

#### 15. Multi-Item Status Bar

**Priority**: Low
**Complexity**: Medium
**Current pain**: Single status bar item shows lint state. Adding a formatter would need its own status bar item with similar behavior.

**What it does**: Support multiple status bar items, one per tool, with consistent styling and behavior.

**Implementation notes**:
- Factory in `src/shared/status-bar.ts`
- `createToolStatusBar(toolName, priority)` returns managed item
- Consistent icon/color conventions across tools
- Click actions per tool (show output, run command)

---

#### 16. Notification Manager

**Priority**: Low
**Complexity**: Low
**Current pain**: `hasWarnedMissingBinary` flag is a manual deduplication hack. Each new tool would need its own flag.

**What it does**: Auto-deduplication of warnings with configurable suppression windows.

**Implementation notes**:
- Class `NotificationManager` in `src/shared/notifications.ts`
- `warnOnce(key, message)` — shows warning only once per session
- `warnThrottled(key, message, cooldownMs)` — max once per time window
- Replaces ad-hoc boolean flags

---

#### 17. Diagnostics Manager

**Priority**: Medium
**Complexity**: Medium
**Current pain**: `provider.ts` manually creates `vscode.Diagnostic` objects with hardcoded severity mapping, source attribution, and data attachment. A second diagnostic source would duplicate this.

**What it does**: Consistent diagnostic creation with typed metadata, severity mapping, and source attribution.

**Implementation notes**:
- Class `DiagnosticsManager` in `src/shared/diagnostics.ts`
- `createDiagnostic(range, message, severity, metadata)` with typed metadata
- Handles severity override setting
- Source attribution per tool
- Max problems enforcement

---

### Localization (1 feature)

#### 18. Plural/Number Formatting

**Priority**: Low
**Complexity**: Medium
**Current pain**: `format()` does simple `{placeholder}` substitution. No support for plurals ("1 error" vs "2 errors") or locale-aware number formatting.

**What it does**: Extend `format()` with ICU-style plural rules and number formatting.

**Implementation notes**:
- Extend `format()` in `src/locale/schema.ts`
- Support: `{count, plural, one {# error} other {# errors}}`
- Use `Intl.PluralRules` for locale-aware plural selection
- Use `Intl.NumberFormat` for number formatting (thousands separators)
- Backwards compatible with existing `{placeholder}` syntax

---

## Lint Features (12 total)

Features that enhance the linting experience specifically. These build on the 20 already-implemented lint features: real-time diagnostics, quick fixes, fix-all, status bar counts, config watcher, workspace lint, git diff lint, output logging, per-file lint, enable/disable, debounced on-type, max problems, rule listing, restart/cache-clear, severity mapping, progress bars, timing, multi-stage, category filtering, CLI flag settings.

---

### High Priority (4 features)

#### 1. Auto-fix on save

**Priority**: High
**Complexity**: Medium
**Current pain**: Users must manually run "Fix All" or use code actions. No automatic fixing workflow.

**What it does**: Automatically apply all auto-fixable lint errors when a file is saved. Controlled by opt-in `resist.lint.fixOnSave` setting.

**Implementation notes**:
- New setting: `resist.lint.fixOnSave` (boolean, default false)
- Hook into `onDidSaveTextDocument` — after lint, if fixes exist, apply them
- Must handle the save-fix-save loop (fix triggers another save)
- Use `WorkspaceEdit` to apply fixes atomically
- Respect `editor.formatOnSave` ordering (lint fix before/after format)

---

#### 2. Per-rule enable/disable quick actions

**Priority**: High
**Complexity**: Medium
**Current pain**: No way to suppress a specific rule for a line/file from within VS Code. Users must manually edit config.

**What it does**: Quick action options on each diagnostic: "Disable [rule] for this line", "Disable [rule] for this file", "Disable [rule] for this project".

**Implementation notes**:
- Extend `ResistCodeActionProvider` with suppress actions
- Line suppress: insert `// resist-lint-disable-next-line: rule-name` comment
- File suppress: insert `// resist-lint-disable: rule-name` at top of file
- Project suppress: modify `.resist-lint.jsonc` (disable rule)
- Each action type is a separate `CodeAction` with `CodeActionKind.QuickFix`

---

#### 3. Code lens

**Priority**: Medium-High
**Complexity**: Medium
**Current pain**: Diagnostic information (rule category, documentation link) is only visible in hover tooltips. No inline visibility.

**What it does**: Show rule category and info inline above diagnostic locations as code lenses.

**Implementation notes**:
- Implement `CodeLensProvider` in `src/lint/code-lens.ts`
- Show lens above lines with diagnostics: "[category] rule-name (n issues)"
- Click action: open rule documentation or show rule details
- Refresh on diagnostic changes
- Setting to enable/disable: `resist.lint.codeLens` (default false)

---

#### 4. Diff preview for fixes

**Priority**: Medium-High
**Complexity**: High
**Current pain**: "Fix All" applies all fixes immediately with no preview. Users can't review what will change before applying.

**What it does**: Side-by-side diff preview showing all proposed changes before applying "Fix all".

**Implementation notes**:
- Create virtual document with fixes applied
- Use `vscode.commands.executeCommand('vscode.diff', originalUri, fixedUri, title)`
- Add "Apply fixes" button to diff editor
- Handle partial apply (accept some fixes, reject others)
- Alternative: show changes in a tree view with checkboxes

---

### Medium Priority (5 features)

#### 5. Format-on-save integration

**Priority**: Medium
**Complexity**: Medium
**Current pain**: Lint fixes and format-on-save are separate workflows that can conflict.

**What it does**: Register resist-lint as a document formatting provider so lint fixes run as part of VS Code's format-on-save pipeline.

**Implementation notes**:
- Implement `DocumentFormattingEditProvider`
- Register for relevant languages
- Apply only auto-fixable issues as formatting edits
- Respect `editor.defaultFormatter` settings
- Coordinate with external formatters (Biome, Prettier)

---

#### 6. Performance profiling

**Priority**: Medium
**Complexity**: Medium
**Current pain**: No visibility into which rules are slow. The CLI reports total time but not per-rule breakdown.

**What it does**: Per-rule timing breakdown showing which rules consume the most time.

**Implementation notes**:
- Parse `--timing` output from resist-lint CLI (if supported)
- Display in output channel: "Rule X: 150ms, Rule Y: 80ms, ..."
- Tree view showing rules sorted by execution time
- Setting: `resist.lint.showTiming` (boolean, default false)
- Could integrate with VS Code's built-in timeline

---

#### 7. Diagnostic filtering UI

**Priority**: Medium
**Complexity**: Medium
**Current pain**: Problems panel shows all diagnostics. No way to filter by rule category or severity within the extension.

**What it does**: Filter diagnostics in the Problems panel by rule category or severity.

**Implementation notes**:
- Custom tree view in sidebar showing diagnostics grouped by category
- Filter buttons: Error/Warning/Info toggle
- Category filter: show only specific categories
- Quick pick command: "Filter by category" with multi-select
- Filtered state persists across sessions

---

#### 8. Per-folder configuration

**Priority**: Medium
**Complexity**: High
**Current pain**: All workspace folders use the same lint settings. Multi-root workspaces with different codebases can't have different lint profiles.

**What it does**: Different lint profiles per workspace folder in multi-root workspaces.

**Implementation notes**:
- Read per-folder `.resist-lint.jsonc` config
- Settings resolution: folder config > workspace config > global config
- Each folder can have different stage, categories, rules
- Status bar shows active config for current editor's folder
- Config watcher per folder

---

#### 9. Stale diagnostic cleanup

**Priority**: Medium
**Complexity**: Low
**Current pain**: Diagnostics persist until the file is re-linted or closed. Files not actively edited can show stale diagnostics indefinitely.

**What it does**: Timeout-based cleanup for diagnostics on files not actively edited.

**Implementation notes**:
- Track last-edited timestamp per document
- Background timer clears diagnostics for files idle > N minutes
- Setting: `resist.lint.staleDiagnosticTimeoutMs` (default 300000 = 5 min)
- Clear on timer, re-lint when file becomes active again
- Don't clear diagnostics for pinned/visible editors

---

### Lower Priority (3 features)

#### 10. Import sorting integration

**Priority**: Low
**Complexity**: Medium
**Current pain**: Import organization requires separate tooling. resist-lint can detect unused imports but doesn't provide sorting/grouping.

**What it does**: Dedicated UI for unused import detection and auto-removal, plus import sorting/grouping.

**Implementation notes**:
- Detect unused imports from lint diagnostics (if rule exists)
- Code action: "Remove unused imports" (removes all at once)
- Code action: "Sort imports" (alphabetical, grouped by type)
- Setting: `resist.lint.organizeImportsOnSave` (boolean, default false)
- Must coordinate with TypeScript's built-in organize imports

---

#### 11. Inline severity overrides

**Priority**: Low
**Complexity**: Medium
**Current pain**: No way to override rule severity for specific lines/files via inline comments.

**What it does**: Support `// resist-lint: disable` and `// resist-lint: disable rule-name` comment directives for inline severity control.

**Implementation notes**:
- Parse disable comments during diagnostic processing
- Support: `disable` (all rules), `disable rule-name` (specific rule)
- Support: `disable-next-line` variant
- Highlight active disable comments (code lens or decoration)
- Auto-remove disable comments when rule is removed from config

---

#### 12. Build/stage mode visual feedback

**Priority**: Low
**Complexity**: Low
**Current pain**: The active stage (`lint`, `check`, `build`, `ci`, etc.) is a setting but not visible in the editor. Users forget which stage is active.

**What it does**: Status bar shows which stage is currently active, with click-to-change.

**Implementation notes**:
- Show stage name in status bar item: "resist: lint [stage: build]"
- Click action: quick pick to change stage
- Different icon/color per stage
- Tooltip shows which rules are active in current stage
- Integrate with State Manager (#14 in shared features)
