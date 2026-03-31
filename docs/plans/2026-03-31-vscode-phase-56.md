# @resist/vscode Phase 56 — Test Coverage, Dev Workflow, Error Consistency

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Co-locate test files, integrate with workspace vitest, add single-command dev workflow, fill test coverage gaps, standardize error handling, expose remaining CLI features as VSCode settings.
**Depends on**: Phase 55 (commit `8d1ba5ab`)

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
| Workspace tests | 20 suites passing (4946+ tests) |
| Extension tests | 7 files, 63 tests passing (238ms) |
| Test location | `__tests__/` subdirectories (non-standard) |
| Workspace vitest | Extension NOT in root projects array |
| Dev workflow | Manual compile required before F5 |
| Untested modules | errors.ts, watcher.ts, commands.ts |
| Error handling | 7+ bare try/catch in commands.ts, 2 in code-actions.ts, 1 in watcher.ts |
| CLI features exposed | 13 settings, 9 commands |
| CLI features missing | --rule, --ignore, --jobs, --tools, --locale, --bail |

---

## TASK 1 — Co-locate test files (move from __tests__/ to next-to-source)

**Status**: [x]

**Plan**:
- Move all 7 test files from `__tests__/` subdirectories to sit next to their source files
- Delete empty `__tests__/` directories
- Update `vitest.config.ts` include pattern from `['**/__tests__/**/*.test.ts']` to `['**/*.test.ts']`
- Update `tsconfig.json` excludes: replace `"src/**/__tests__"` with `"src/**/*.test.ts"`

**Files**:
- Move: `src/shared/__tests__/*.test.ts` → `src/shared/*.test.ts` (5 files)
- Move: `src/lint/__tests__/*.test.ts` → `src/lint/*.test.ts` (2 files)
- Modify: `packages/shared/config/tooling/vscode/vitest.config.ts`
- Modify: `packages/shared/config/tooling/vscode/tsconfig.json`

**Verification**: All 63 tests still pass, tsgo type-check passes

---

## TASK 2 — Add vscode extension to workspace vitest projects

**Status**: [x]

**Plan**:
- Add `config-tooling-vscode` project entry to root `vitest.config.ts` projects array
- Include the vscode mock alias so tests can import the mock vscode module
- Verify `pnpm qa:test` now discovers and runs vscode extension tests

**Files**:
- Modify: `vitest.config.ts` (root)

**Verification**: `pnpm qa:test` runs 21 suites, vscode tests included

---

## TASK 3 — Single dev command (auto-rebuild + F5)

**Status**: [x]

**Plan**:
- Create `.vscode/tasks.json` with a tsgo watch task
- Add `preLaunchTask` to `.vscode/launch.json` pointing to the watch task
- F5 will automatically start `tsgo -w` and wait for compilation before launching extension host

**Files**:
- Create: `.vscode/tasks.json`
- Modify: `.vscode/launch.json`

**Verification**: launch.json references correct task label

---

## TASK 4 — Test coverage: errors.ts

**Status**: [x]

**Plan**:
- Create `src/shared/errors.test.ts` with tests for:
  - `safeRun` catches sync errors and logs via logError
  - `safeRun` executes function normally when no error
  - `safeRunAsync` catches async errors and logs via logError
  - `safeRunAsync` executes async function normally when no error
  - extractMessage handles Error instances and non-Error values (string, number, null)

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/shared/errors.test.ts`

**Verification**: Tests pass

---

## TASK 5 — Test coverage: watcher.ts

**Status**: [x]

**Plan**:
- Create `src/lint/watcher.test.ts` with tests for:
  - Creates file watchers for resist.config.ts and .resist-lint.jsonc
  - Triggers re-lint on file change/create/delete events
  - Returns disposables array for cleanup
  - Individual lint errors don't stop re-linting other files

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/lint/watcher.test.ts`

**Verification**: Tests pass

---

## TASK 6 — Test coverage: commands.ts

**Status**: [x]

**Plan**:
- Create `src/lint/commands.test.ts` with tests for:
  - All 9 commands are registered
  - lint.file calls lintDocumentFn for active editor
  - lint.clear clears diagnostics and updates status bar
  - lint.restart clears cache and re-lints open documents
  - lint.showOutput shows the output channel
  - lint.staged passes --diff=staged to lint options
  - lint.uncommitted passes --diff=head to lint options

**Files**:
- Create: `packages/shared/config/tooling/vscode/src/lint/commands.test.ts`

**Verification**: Tests pass

---

## TASK 7 — Standardize error handling in commands.ts

**Status**: [x]

**Plan**:
- Replace bare try/catch in async command callbacks with safeRunAsync
- Keep user-facing vscode.window.showErrorMessage calls as they are intentional UX
- Add clarifying comments to intentional bare catches in code-actions.ts and watcher.ts

**Files**:
- Modify: `packages/shared/config/tooling/vscode/src/lint/commands.ts`
- Modify: `packages/shared/config/tooling/vscode/src/lint/code-actions.ts`
- Modify: `packages/shared/config/tooling/vscode/src/lint/watcher.ts`

**Verification**: Tests still pass, tsgo type-check passes

---

## TASK 8 — Expose remaining CLI features as settings

**Status**: [x]

**Plan**:
- Add 6 new settings to package.json contributes.configuration:
  - resist.lint.rule (string, default: "") — run only specific rule
  - resist.lint.ignorePatterns (array of strings, default: []) — ignore file patterns
  - resist.lint.jobs (number, default: 0 = auto) — parallelism
  - resist.lint.tools (boolean, default: false) — enable external tools
  - resist.lint.locale (string, default: "") — message locale
  - resist.lint.bail (boolean, default: false) — stop on first error
- Wire into provider.ts args building in lintDocument() and lintWorkspace()

**Files**:
- Modify: `packages/shared/config/tooling/vscode/package.json`
- Modify: `packages/shared/config/tooling/vscode/src/lint/provider.ts`

**Verification**: tsgo type-check passes, existing tests pass

---

## Register Rules + Config

All rules registered, config updated above.

---

## Full QA + Coverage

Run `pnpm qa:test`, `pnpm qa:lint --tools`, `pnpm qa:format:check` after all tasks.

---

## Final Verification + Commit

Verify all tasks against this plan, commit changes.
