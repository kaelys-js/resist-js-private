# @resist/vscode Phase 58 — Locale Gaps, Error Visibility, Alias Docs, Feature Lists, Dev Workflow

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Localize remaining hardcoded strings, improve error visibility in code-actions, document alias import conclusion, add feature roadmap lists, improve dev workflow scripts.
**Depends on**: Phase 57 (commit `ae814a9e`)

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
| Extension tests | 11 files, 104 tests passing |
| Unlocalized strings | 2 remaining (progress message, rules header) |
| Code-actions error handling | 2 silent catches (no output channel available) |
| Alias imports | Relative imports only (no documentation of why) |
| Dev workflow | install-local hardcodes version in vsix filename |

---

## TASK 1 — Localize remaining 2 hardcoded strings

**Status**: [x]

**Plan**:
- Add `messages.progressFiles` parameterized string to `VscodeStrings` schema and `en.ts`
- Add `messages.availableRulesHeader` string to schema and `en.ts`
- Update `provider.ts` line 251 to use `format(en.messages.progressFiles, { processed, total })`
- Update `commands.ts` line 164 to use `en.messages.availableRulesHeader`
- Add tests for the new locale strings

**Files**:
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/locale/locale.test.ts`
- Modify: `src/lint/provider.ts`
- Modify: `src/lint/commands.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 2 — Inject output channel into ResistCodeActionProvider

**Status**: [x]

**Plan**:
- Add optional `outputChannel` parameter to `ResistCodeActionProvider` constructor
- Log errors in the 2 catch blocks (lines 78-82, 118-121) when channel is available
- Update `extension.ts` to pass `outputChannel` when creating the provider
- Add test for error logging in code-actions.test.ts

**Files**:
- Modify: `src/lint/code-actions.ts`
- Modify: `src/lint/code-actions.test.ts`
- Modify: `src/extension.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 3 — Document alias import conclusion

**Status**: [x]

**Plan**:
- Add "Alias Imports" section to this plan documenting why they don't work
- tsgo compiles to CommonJS, does not rewrite path aliases
- Relative imports are the correct pattern for this extension

**Files**:
- Modify: this plan file

**Verification**: N/A (documentation only)

---

## TASK 4 — Add feature roadmap lists to plan

**Status**: [x]

**Plan**:
- Add "Shared Foundation Feature Roadmap" section with all 18 identified features
- Add "Lint Feature Roadmap" section with all 12 missing features
- Organized by priority/category

**Files**:
- Modify: this plan file

**Verification**: N/A (documentation only)

---

## TASK 5 — Fix install-local script and improve dev workflow

**Status**: [x]

**Plan**:
- Fix `install-local` script to use glob (`*.vsix`) instead of hardcoded version
- Add `watch-install` convenience script for iterative dev
- Update tasks.json Package task to not depend on Watch (they're independent)

**Files**:
- Modify: `packages/shared/config/tooling/vscode/package.json`
- Modify: `.vscode/tasks.json`

**Verification**: Scripts defined, valid JSON

---

## Alias Imports — Conclusion (TASK 3)

**Cannot work with the current setup.** The VSCode extension compiles with `tsgo` to CommonJS (`"module": "commonjs"`). tsgo does **not** rewrite path aliases during emit — an `import '@/foo'` becomes `require("@/foo")` which crashes at runtime with "Cannot find module".

Only a bundler (webpack, esbuild, vite) could rewrite path aliases, but this extension deliberately avoids bundlers for simplicity. Relative imports are the correct and standard pattern for VS Code extensions compiled directly with tsc/tsgo.

**Decision:** Keep relative imports. No action needed.

---

## Shared Foundation Feature Roadmap (TASK 4)

Features that are NOT lint-specific — they would benefit ANY future tool integration (formatter, test runner, etc.).

### Configuration

1. **Configuration Manager** — Typed settings reader with schema validation, replacing scattered `getConfiguration()` calls across files
2. **Generic Config File Watcher** — Watch any config glob and trigger callbacks (current watcher is lint-specific)
3. **Settings Change Listener** — Reusable `onConfigurationChange(prefix, callback)` helper

### Documents & Files

4. **Document Filter/Selector** — Reusable predicates for scheme/language/untitled checks (currently repeated 5+ places)
5. **Document Iteration Helper** — `forEachWorkspaceDocument(predicate, callback)` replacing repeated loops in extension.ts
6. **File Watching Abstraction** — Higher-level wrapper around `createFileSystemWatcher()` with cleanup + debouncing

### Commands & Events

7. **Command Registration Pattern** — Generic `registerCommand(id, handler, deps)` with auto `safeRunAsync` wrapping
8. **Document Event Registry** — Pluggable hook system for onOpen/onSave/onChange/onClose events
9. **Lifecycle Hook Manager** — Disposable registry for guaranteed cleanup on deactivation

### Tool Execution

10. **Generic Tool Runner** — Extend `runToolJson()` to handle text/structured output, not just JSON
11. **Binary Resolution with Caching** — Generalize `getBinaryPath()` for any tool name + cache results
12. **Workspace Root Resolution** — Generalize `getWorkspaceRoot()` to search for any marker file

### Status & UX

13. **Progress Reporting Helpers** — Abstraction over `withProgress()` for file-processing operations
14. **State Manager** — Per-tool state tracking (ready/running/error/disabled) beyond global flags
15. **Multi-Item Status Bar** — Support multiple status bar items (one per tool)
16. **Notification Manager** — Auto-deduplication of warnings (replacing manual `hasWarnedMissingBinary` flag)
17. **Diagnostics Manager** — Consistent diagnostic creation, severity mapping, metadata attachment

### Localization

18. **Plural/Number Formatting** — Extend `format()` with locale-aware plural rules

---

## Lint Feature Roadmap (TASK 4)

Features that enhance the linting experience specifically. Already implemented: 20 features (real-time diagnostics, quick fixes, fix-all, status bar counts, config watcher, workspace lint, git diff lint, output logging, per-file lint, enable/disable, debounced on-type, max problems, rule listing, restart/cache-clear, severity mapping, progress bars, timing, multi-stage, category filtering, CLI flag settings).

### High Priority

1. **Auto-fix on save** — Automatically apply all fixes when file is saved (opt-in `resist.lint.fixOnSave` setting)
2. **Per-rule enable/disable quick actions** — Quick action to suppress a rule for the current line, file, or project
3. **Code lens** — Show rule category/info inline above diagnostic locations
4. **Diff preview for fixes** — Side-by-side preview before applying "Fix all"

### Medium Priority

5. **Format-on-save integration** — Hook into VS Code's format-on-save pipeline for lint-fix-as-formatter
6. **Performance profiling** — Per-rule timing breakdown (which rules are slow)
7. **Diagnostic filtering UI** — Filter Problems panel by rule category or severity
8. **Per-folder configuration** — Different lint profiles per workspace folder in multi-root workspaces
9. **Stale diagnostic cleanup** — Timeout-based cleanup for diagnostics on files not actively edited

### Lower Priority

10. **Import sorting integration** — Dedicated UI for unused import detection + auto-removal
11. **Inline severity overrides** — Support `// resist-lint: disable` comment directives
12. **Build/stage mode visual feedback** — Status bar shows which stage is currently active

---

## Register Rules + Config

All tasks registered above.

---

## Full QA + Coverage

Run `pnpm qa:test`, `pnpm qa:lint --tools`, `pnpm qa:format:check` after all tasks.

---

## Final Verification + Commit

Verify all tasks against this plan, commit changes.
