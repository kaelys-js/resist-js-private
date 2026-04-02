# @resist/vscode Phase 55 — Extension Hardening: Error Handling, Tests, Features, Dependencies

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Harden the unified Resist VSCode extension with: (1) comprehensive error handling — no silent failures, shared error boundary pattern, (2) full unit test coverage via vitest + mocked vscode module, (3) additional lint features — diagnostic example/url exposure, diff-mode commands, cache/quiet/debug settings, (4) latest dependencies + tsgo for ~10x faster compile/watch, (5) gitignore template update for *.vsix files.
**Depends on**: Phase 54 (commit `e23e66d4`)

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
| Tests | 4946 pass (20 suites) |
| Extension source files | 11 TypeScript files, 1503 lines |
| Error handling | Multiple silent failures: void promise calls, unprotected event listeners, no try/catch on async commands |
| Test coverage | 0% — no test files exist |
| Dependencies | `@types/vscode ^1.85.0`, `@vscode/vsce ^2.22.0`, `typescript ^5.3.0` |
| Build tool | `tsc` (TypeScript 5.x) |
| tsgo available | Yes — `@typescript/native-preview@7.0.0-dev.20260225.1` at `node_modules/.bin/tsgo` |
| CLI features not exposed | `example` field, `url` field, `--diff` modes, `--cache`, `--quiet`, `--debug`, `--severity` |
| Gitignore template | `*.vsix` not in `ignore-common.hbs` |

---

## TASK 1 — Create shared error boundary module (src/shared/errors.ts)

**Status**: [x]

**Plan**:
- Create `src/shared/errors.ts` with two utility functions:
  - `safeRun(channel: OutputChannel, label: string, fn: () => void): void` — wraps synchronous function in try/catch, logs errors to output channel with `logError(channel, "${label}: ${err.message}")`
  - `safeRunAsync(channel: OutputChannel, label: string, fn: () => Promise<void>): Promise<void>` — wraps async function in try/catch, logs errors to output channel
- Both functions extract error message via `err instanceof Error ? err.message : String(err)`
- No re-throwing — these are boundary handlers for VSCode event listeners where throwing would kill the listener

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/errors.ts`

**Verification**: Compiles, both sync and async variants handle errors correctly

---

## TASK 2 — Add error boundaries to extension.ts

**Status**: [x]

**Plan**:
- Import `safeRun` and `safeRunAsync` from `shared/errors`
- Wrap all event listener bodies:
  - `onDidOpenTextDocument` callback → `safeRun(outputChannel, 'onDidOpen', () => { ... })`
  - `onDidSaveTextDocument` callback → `safeRun(outputChannel, 'onDidSave', () => { ... })`
  - `onDidChangeTextDocument` callback → `safeRun(outputChannel, 'onDidChange', () => { ... })`
  - `onDidCloseTextDocument` callback → `safeRun(outputChannel, 'onDidClose', () => { ... })`
  - `onDidChangeActiveTextEditor` callback → `safeRun(outputChannel, 'onDidChangeEditor', () => { ... })`
  - `onDidChangeConfiguration` callback → `safeRun(outputChannel, 'onDidChangeConfig', () => { ... })`
- Replace `void lintDocument(...)` calls with `safeRunAsync(outputChannel, 'lintDocument', () => lintDocument(...))`
- Wrap `deactivate()` body in try/catch

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/extension.ts`

**Verification**: All event listeners wrapped, no bare `void` promise calls remain

---

## TASK 3 — Add error handling to provider.ts

**Status**: [x]

**Plan**:
- Add `log()` calls before every silent early return:
  - Missing binary: `log(outputChannel, 'Skipping lint: resist-lint binary not found')`
  - Missing workspace root: `log(outputChannel, 'Skipping lint: workspace root not found for ${doc.uri.fsPath}')`
- Wrap `mapEntryToDiagnostic()` call in try/catch inside the mapping loop — if one entry fails, skip it and log warning, don't abort entire file
- Distinguish error types in failure log: include whether timeout, spawn error, or parse error
- Log info-level message when runner returns empty array (no diagnostics) for traceability

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/lint/provider.ts`

**Verification**: No silent returns, malformed diagnostic entries logged and skipped

---

## TASK 4 — Add error handling to commands.ts

**Status**: [x]

**Plan**:
- Wrap `resist.lint.workspace` handler body in try/catch, show error message to user on failure
- Wrap `resist.lint.fix` handler body in try/catch:
  - Check `applyEdit()` return value: if false, show `vscode.window.showErrorMessage('Failed to apply fixes')`
  - Log the error to output channel
- Wrap `resist.lint.listRules` handler in try/catch with error message

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/lint/commands.ts`

**Verification**: All async command handlers wrapped, applyEdit failure reported

---

## TASK 5 — Add byte offset validation to code-actions.ts

**Status**: [x]

**Plan**:
- Before calling `document.positionAt(offset)`, validate:
  - `offset >= 0`
  - `offset <= document.getText().length` (byte length)
  - If invalid: skip this fix, log warning (but don't crash the entire code action provider)
- Wrap each fix creation in try/catch to prevent one bad fix from killing all fixes

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/lint/code-actions.ts`

**Verification**: Invalid offsets handled gracefully, valid fixes still work

---

## TASK 6 — Add error handling to debounce.ts and watcher.ts

**Status**: [x]

**Plan**:
- `debounce.ts`: Wrap `fn()` call in try/catch inside the setTimeout callback (line 30). If fn throws, the timer map is already cleaned up (delete happens before call), but the error must not propagate to setTimeout's global handler
- `watcher.ts`: Wrap `lintFn(doc)` call in try/catch inside the debounced callback. Log errors but don't crash the watcher

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/shared/debounce.ts`
- Modify: `packages/shared/config/tooling/vscode/src/lint/watcher.ts`

**Verification**: Scheduled functions wrapped, watcher lint calls wrapped

---

## TASK 7 — Improve runner.ts error context

**Status**: [x]

**Plan**:
- JSON parse failure (line 74): Include the actual `SyntaxError` message from `JSON.parse`, not just the truncated stdout. Change to: `Failed to parse JSON output (${parseErr.message}): ${stdout.slice(0, 200)}`
- Empty stdout + code 0 (line 83): This is a valid case (no diagnostics found), but add a comment documenting why `[] as T` is correct here
- Non-zero exit code with stdout (currently falls through to JSON parse): After successful JSON parse, also log stderr if present (some CLI tools write warnings to stderr even on success)

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/shared/runner.ts`

**Verification**: Parse errors include error message, empty stdout documented

---

## TASK 8 — Update package.json: tsgo, latest deps, vitest

**Status**: [x]

**Plan**:
- Replace build scripts:
  - `"compile": "tsgo -p ./"` (was `tsc -p ./`)
  - `"watch": "tsgo -w -p ./"` (was `tsc -watch -p ./`)
  - `"typecheck": "tsgo --noEmit -p ./"` (new)
  - `"test": "vitest run"` (new)
  - `"test:watch": "vitest"` (new)
  - `"vscode:prepublish": "pnpm compile"` (unchanged)
  - `"package": "vsce package --no-dependencies"` (unchanged)
- Update dependency versions:
  - `@types/vscode`: `^1.85.0` → `^1.100.0`
  - `@vscode/vsce`: `^2.22.0` → `^3.7.0`
  - Remove `typescript` (tsgo at workspace root handles compilation)
  - Add `vitest`: `"catalog:"` or `"*"` (use workspace version)
- Update engine: `engines.vscode`: `^1.85.0` → `^1.100.0`
- Run `pnpm install` to update lockfile

**Files**:
- Modify: `packages/shared/config/tooling/vscode/package.json`

**Verification**: `pnpm install` succeeds, `pnpm compile` uses tsgo, `pnpm test` runs vitest

---

## TASK 9 — Create VSCode mock for tests (src/__mocks__/vscode.ts)

**Status**: [x]

**Plan**:
- Create `src/__mocks__/vscode.ts` with minimal mock implementations:
  - `DiagnosticSeverity` enum: `Error = 0, Warning = 1, Information = 2, Hint = 3`
  - `Range` class: constructor `(startLine, startCol, endLine, endCol)`, stores as properties
  - `Position` class: constructor `(line, character)`, stores as properties
  - `Uri` class: static `file(path)` returns `{ scheme: 'file', fsPath: path, toString: () => path }`
  - `CodeActionKind.QuickFix` constant
  - `StatusBarAlignment.Right` constant
  - `workspace.getConfiguration()` returns mock config with `get(key, default)` method
  - `workspace.workspaceFolders` as settable array
  - `workspace.createFileSystemWatcher()` returns mock disposable
  - `workspace.textDocuments` as settable array
  - `window.createOutputChannel()` returns mock with `appendLine()`, `show()`, `dispose()`
  - `window.createStatusBarItem()` returns mock with settable text/tooltip/command/show/hide/dispose
  - `window.showWarningMessage()`, `showErrorMessage()`, `showInformationMessage()` as `vi.fn()`
  - `languages.createDiagnosticCollection()` returns mock with `set()`, `get()`, `delete()`, `clear()`, `dispose()`
  - `commands.registerCommand()` as `vi.fn()`
  - `ThemeColor` class: constructor stores id
  - `Diagnostic` class: constructor `(range, message, severity)`
  - `CodeAction` class: constructor `(title, kind)`
  - `WorkspaceEdit` class: `replace()`, `entries()` methods
- Configure vitest to use this mock via `vi.mock('vscode', ...)` in test setup

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/__mocks__/vscode.ts`
- Create: `packages/shared/config/tooling/vscode/vitest.config.ts` (if needed for module resolution)

**Verification**: Mock compiles, provides all APIs used by extension code

---

## TASK 10 — Test: debounce.test.ts

**Status**: [x]

**Plan**:
- Create `src/shared/__tests__/debounce.test.ts`
- Tests:
  - `schedule()` executes fn after delay (use `vi.useFakeTimers()`)
  - `schedule()` replaces previous timer for same URI
  - `schedule()` handles different URIs independently
  - `cancel()` prevents execution
  - `cancel()` is no-op for unknown URI
  - `dispose()` clears all timers
  - `fn()` throwing does not crash (after error handling fix)

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/__tests__/debounce.test.ts`

**Verification**: All tests pass

---

## TASK 11 — Test: runner.test.ts

**Status**: [x]

**Plan**:
- Create `src/shared/__tests__/runner.test.ts`
- Mock `child_process.spawn` via `vi.mock('child_process')`
- Tests:
  - Successful JSON parse returns `{ ok: true, data }`
  - Failed JSON parse returns error with parse message
  - Non-zero exit code returns `{ ok: false }` with stderr
  - Timeout kills process and returns timeout error
  - Spawn error returns `{ ok: false }` with error message
  - Empty stdout + code 0 returns `{ ok: true, data: [] }`
  - PATH augmented with node_modules/.bin
  - FORCE_COLOR=0 set in env

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/__tests__/runner.test.ts`

**Verification**: All tests pass

---

## TASK 12 — Test: workspace.test.ts

**Status**: [x]

**Plan**:
- Create `src/shared/__tests__/workspace.test.ts`
- Mock `vscode` module and `fs.existsSync`
- Tests:
  - `getWorkspaceRoot()` walks up to find pnpm-workspace.yaml
  - `getWorkspaceRoot()` returns undefined when no workspace folder
  - `getWorkspaceRoot()` caches results per folder
  - `getWorkspaceRoot()` falls back to start dir if no marker found
  - `getBinaryPath()` returns path when binary exists
  - `getBinaryPath()` returns undefined when binary missing
  - `clearCache()` invalidates cached workspace roots

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/__tests__/workspace.test.ts`

**Verification**: All tests pass

---

## TASK 13 — Test: status-bar.test.ts

**Status**: [x]

**Plan**:
- Create `src/shared/__tests__/status-bar.test.ts`
- Tests:
  - `createStatusBar()` creates item with correct alignment, command, text
  - `updateStatusBar('ready')` shows check icon
  - `updateStatusBar('ready', { errors: 3, warnings: 7 })` shows counts
  - `updateStatusBar('linting')` shows spinner
  - `updateStatusBar('error')` shows error background
  - `updateStatusBar('disabled')` shows slash icon
  - `getFileDiagnosticCounts()` counts errors and warnings correctly

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/__tests__/status-bar.test.ts`

**Verification**: All tests pass

---

## TASK 14 — Test: output.test.ts

**Status**: [x]

**Plan**:
- Create `src/shared/__tests__/output.test.ts`
- Tests:
  - `createOutputChannel()` creates channel named 'Resist'
  - `log()` appends timestamped line `[HH:MM:SS] message`
  - `logError()` appends `[HH:MM:SS] ERROR: message`
  - `logCommand()` appends `[HH:MM:SS] $ cmd arg1 arg2`
  - `logTiming()` appends `[HH:MM:SS] label: Nms`

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/__tests__/output.test.ts`

**Verification**: All tests pass

---

## TASK 15 — Test: code-actions.test.ts

**Status**: [x]

**Plan**:
- Create `src/lint/__tests__/code-actions.test.ts`
- Tests:
  - Creates individual fix action with correct title and edit
  - Skips diagnostics without fix data
  - Skips no-op fixes (start === end && text === '')
  - Creates "Fix all" action when multiple fixable diagnostics
  - Sorts fixes descending by offset in "Fix all"
  - Includes tip in title when present
  - Handles invalid byte offsets gracefully (after error handling fix)
  - Filters out non-resist-linter diagnostics

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/lint/__tests__/code-actions.test.ts`

**Verification**: All tests pass

---

## TASK 16 — Test: provider.test.ts (diagnostic mapping)

**Status**: [x]

**Plan**:
- Create `src/lint/__tests__/provider.test.ts`
- Focus on `mapEntryToDiagnostic()` function (export it for testing):
  - Maps severity correctly: error → Error, warning → Warning, info → Information
  - Uses endLine/endColumn for precise range when present
  - Falls back to line range when endLine/endColumn absent
  - Stores fix/tip/example/url in diagnostic.data
  - Sets source to 'resist-linter'
  - Sets code to ruleId
  - Handles 1-based → 0-based line/column conversion

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/lint/provider.ts` (export `mapEntryToDiagnostic` for testing)
- Create: `packages/shared/config/tooling/vscode/src/lint/__tests__/provider.test.ts`

**Verification**: All tests pass

---

## TASK 17 — Expose example and url fields in diagnostics

**Status**: [x]

**Plan**:
- In `provider.ts` `mapEntryToDiagnostic()`:
  - If `entry.url` is present: set `diagnostic.code = { value: entry.ruleId, target: vscode.Uri.parse(entry.url) }` — this makes the rule ID clickable in the Problems panel, opening the docs URL
  - If `entry.example` is present: append to diagnostic message: `\n\nExample:\n${entry.example}`
- These fields are already stored in `diagnostic.data` — this task makes them visible to the user without clicking

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/lint/provider.ts`

**Verification**: Diagnostics show example text, rule IDs are clickable links when url present

---

## TASK 18 — Add diff-mode lint commands

**Status**: [x]

**Plan**:
- Add two new commands to `package.json`:
  - `resist.lint.staged` — "Lint Staged Changes" — runs `resist-lint --format=json --diff=staged`
  - `resist.lint.uncommitted` — "Lint Uncommitted Changes" — runs `resist-lint --format=json --diff=head`
- Register commands in `commands.ts`:
  - Both use similar pattern to `resist.lint.workspace` — spawn with progress, parse results, set diagnostics
  - Difference: pass `--diff=staged` or `--diff=head` flag to CLI

**Files**:
- Modify: `packages/shared/config/tooling/vscode/package.json` (add 2 commands)
- Modify: `packages/shared/config/tooling/vscode/src/lint/commands.ts` (register 2 commands)

**Verification**: Commands registered, pass correct flags to CLI

---

## TASK 19 — Add new settings (cache, quiet, debug, severityOverride)

**Status**: [x]

**Plan**:
- Add settings to `package.json` `contributes.configuration.properties`:
  - `resist.lint.cache` (boolean, default: true) — maps to `--cache`/`--no-cache`
  - `resist.lint.quiet` (boolean, default: false) — maps to `--quiet` (errors only)
  - `resist.lint.debug` (boolean, default: false) — maps to `--debug` (verbose stderr)
  - `resist.lint.severityOverride` (enum: `""`, `"error"`, `"warn"`, `"off"`, default: `""`) — maps to `--severity=<value>`
- Read these settings in `provider.ts` `lintDocument()` and pass as CLI args:
  - If `cache` is false: add `--no-cache`
  - If `quiet` is true: add `--quiet`
  - If `debug` is true: add `--debug`
  - If `severityOverride` is non-empty: add `--severity=<value>`

**Files**:
- Modify: `packages/shared/config/tooling/vscode/package.json` (add 4 settings)
- Modify: `packages/shared/config/tooling/vscode/src/lint/provider.ts` (read + pass settings)

**Verification**: Settings appear in VS Code settings UI, flags passed to CLI correctly

---

## TASK 20 — Add *.vsix to ignore-common.hbs template

**Status**: [x]

**Plan**:
- Add `*.vsix` to `packages/shared/utils/cli/src/tools/sync/template/packages/_partials/ignore-common.hbs` in the "Misc" section alongside `*.tgz`, `*.zip`, `*.tar.gz`

**Files**:
- Modify: `packages/shared/utils/cli/src/tools/sync/template/packages/_partials/ignore-common.hbs`

**Verification**: `*.vsix` present in template, sync regeneration picks it up

---

## TASK 21 — Register Rules + Config

**Status**: [x]

**Plan**:
- No lint rules to register — this is an extension enhancement, not a linter rule
- Verify all new commands are registered in `package.json` contributes.commands (9 total: 7 original + 2 diff-mode)
- Verify all new settings are registered in `package.json` contributes.configuration (13 total: 9 original + 4 new)
- Verify vitest.config.ts is valid (if created)
- Verify tsgo compiles the extension: `pnpm compile`
- Verify all test files import correctly

**Verification**: Extension manifest valid, all features registered

---

## TASK 22 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm qa:test` — verify no test regressions + new tests pass
- Run `pnpm qa:lint --tools` — verify no lint errors in new/modified files
- Run `pnpm qa:format:check` — verify formatting
- Compile extension with tsgo: `cd packages/shared/config/tooling/vscode && pnpm compile`
- Run extension tests: `cd packages/shared/config/tooling/vscode && pnpm test`
- Verify test count increased from baseline (4946 + new tests)

**Verification**: All commands green, extension compiles with tsgo, all new tests pass

---

## TASK 23 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify error handling module exists: `src/shared/errors.ts`
- Verify all event listeners wrapped in error boundaries
- Verify all 7 test files exist and pass
- Verify vscode mock exists: `src/__mocks__/vscode.ts`
- Verify package.json uses tsgo scripts
- Verify `*.vsix` in ignore-common.hbs
- Verify 2 new diff-mode commands registered
- Verify 4 new settings registered
- Verify example/url exposed in diagnostics
- Commit with descriptive message

**Verification**:
- `packages/shared/config/tooling/vscode/src/shared/errors.ts` exists
- `packages/shared/config/tooling/vscode/src/__mocks__/vscode.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/__tests__/debounce.test.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/__tests__/runner.test.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/__tests__/workspace.test.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/__tests__/status-bar.test.ts` exists
- `packages/shared/config/tooling/vscode/src/shared/__tests__/output.test.ts` exists
- `packages/shared/config/tooling/vscode/src/lint/__tests__/code-actions.test.ts` exists
- `packages/shared/config/tooling/vscode/src/lint/__tests__/provider.test.ts` exists
- All tests pass
- Extension compiles with tsgo
- Commit clean

---

## File Inventory

### New Files
| File | Purpose |
|------|---------|
| `src/shared/errors.ts` | Shared error boundary helpers (safeRun, safeRunAsync) |
| `src/__mocks__/vscode.ts` | VSCode API mock for vitest |
| `vitest.config.ts` | Vitest configuration for module resolution |
| `src/shared/__tests__/debounce.test.ts` | Debounce timer tests |
| `src/shared/__tests__/runner.test.ts` | CLI runner tests |
| `src/shared/__tests__/workspace.test.ts` | Workspace resolution tests |
| `src/shared/__tests__/status-bar.test.ts` | Status bar state tests |
| `src/shared/__tests__/output.test.ts` | Output channel log tests |
| `src/lint/__tests__/code-actions.test.ts` | Code action provider tests |
| `src/lint/__tests__/provider.test.ts` | Diagnostic mapping tests |

### Modified Files
| File | Changes |
|------|---------|
| `package.json` | tsgo scripts, latest deps, add vitest, 2 new commands, 4 new settings |
| `src/extension.ts` | Error boundaries on all event listeners |
| `src/shared/runner.ts` | Better error context in parse failures |
| `src/shared/debounce.ts` | try/catch around scheduled fn |
| `src/lint/provider.ts` | Log silent returns, protect mapping, expose example/url, read new settings |
| `src/lint/commands.ts` | try/catch async handlers, applyEdit check, 2 new commands |
| `src/lint/code-actions.ts` | Byte offset validation |
| `src/lint/watcher.ts` | try/catch around lint calls |
| `_partials/ignore-common.hbs` | Add *.vsix |

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Shared: errors.ts | — |
| 2 | Error boundaries: extension.ts | 1 |
| 3 | Error handling: provider.ts | 1 |
| 4 | Error handling: commands.ts | 1 |
| 5 | Error handling: code-actions.ts | — |
| 6 | Error handling: debounce.ts + watcher.ts | — |
| 7 | Error context: runner.ts | — |
| 8 | Dependencies: package.json | — |
| 9 | Vscode mock: __mocks__/vscode.ts | 8 |
| 10 | Test: debounce.test.ts | 6, 9 |
| 11 | Test: runner.test.ts | 7, 9 |
| 12 | Test: workspace.test.ts | 9 |
| 13 | Test: status-bar.test.ts | 9 |
| 14 | Test: output.test.ts | 9 |
| 15 | Test: code-actions.test.ts | 5, 9 |
| 16 | Test: provider.test.ts | 3, 9 |
| 17 | Feature: example/url in diagnostics | 3 |
| 18 | Feature: diff-mode commands | 4 |
| 19 | Feature: new settings | 3 |
| 20 | Template: *.vsix in gitignore | — |
| 21 | Register + Config verification | 1-20 |
| 22 | Full QA + Coverage | 21 |
| 23 | Final verification + commit | 22 |
