# @resist/vscode Phase 57 — Descriptions, Locale, Scripts, Dev Workflow, Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Improve English descriptions in package.json, centralize user-facing strings in locale module, standardize scripts, remove local vitest.config, fix debounce error swallowing, add local extension install workflow.
**Depends on**: Phase 56 (commit `548800d3`)

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
| Extension tests | 10 files, 89 tests passing |
| Workspace suites | 21 suites |
| Package.json description | "Custom linting with real-time diagnostics and auto-fix for the Resist workspace" |
| Locale system | None — all strings hardcoded |
| Scripts | compile, watch, typecheck, qa:test, test, test:watch, package, vscode:prepublish |
| Local vitest.config | Exists (duplicates root entry) |
| Debounce error handling | Silent swallow in catch block |

## After (all tasks complete)

| Metric | Value |
|--------|-------|
| Extension tests | 11 files, 104 tests passing |
| Package.json description | "Real-time linting, auto-fix, and workspace tooling for the Resist monorepo" |
| Locale system | src/locale/{schema,en}.ts — all user-facing strings centralized |
| Scripts | build, watch, qa:lint, qa:test, qa:test:coverage, clean, package, install-local, vscode:prepublish |
| Local vitest.config | Removed (globals:true added to root entry) |
| Debounce error handling | Optional onError callback, logged to output channel |

---

## TASK 1 — Improve package.json description and English strings

**Status**: [x]

**Plan**:
- Update `description` to cover full extension scope
- Update `displayName` to reflect broader scope
- Update `categories` to include Formatters
- Improve all command titles and setting descriptions for clarity and consistency

**Files**:
- Modify: `packages/shared/config/tooling/vscode/package.json`

**Verification**: Valid JSON, tsgo type-check passes

---

## TASK 2 — Create locale module for user-facing strings

**Status**: [x]

**Plan**:
- Create `src/locale/schema.ts` with VscodeStrings type (statusBar, errors, output groups)
- Create `src/locale/en.ts` with all hardcoded English strings from source files
- Update `status-bar.ts` to read from locale
- Update `output.ts` to read from locale
- Update `commands.ts` to read from locale
- Write tests for locale module

**Files**:
- Create: `src/locale/schema.ts`
- Create: `src/locale/en.ts`
- Create: `src/locale/locale.test.ts`
- Modify: `src/shared/status-bar.ts`
- Modify: `src/shared/output.ts`
- Modify: `src/lint/commands.ts`

**Verification**: All tests pass, tsgo type-check passes

---

## TASK 3 — Standardize package.json scripts

**Status**: [x]

**Plan**:
- Rename `compile` → `build`
- Rename `typecheck` → `qa:lint`
- Remove `test:watch` and `test`
- Add `qa:test:coverage`
- Add `clean`
- Update `watch`, `vscode:prepublish`, `.vscode/tasks.json` to reference `build`

**Files**:
- Modify: `packages/shared/config/tooling/vscode/package.json`
- Modify: `.vscode/tasks.json`

**Verification**: `pnpm build` compiles, `pnpm qa:test` passes

---

## TASK 4 — Remove local vitest.config.ts

**Status**: [x]

**Plan**:
- Delete `packages/shared/config/tooling/vscode/vitest.config.ts`
- Add `globals: true` to root vitest.config.ts vscode project entry
- Verify tests still pass via workspace runner

**Files**:
- Delete: `packages/shared/config/tooling/vscode/vitest.config.ts`
- Modify: `vitest.config.ts` (root)

**Verification**: `pnpm qa:test` passes, local `pnpm vitest run` still works

---

## TASK 5 — Fix debounce error swallowing

**Status**: [x]

**Plan**:
- Add optional `onError` callback to DocumentDebouncer constructor
- When scheduled function throws, call onError if provided
- Update extension.ts to pass logError callback
- Update debounce.test.ts with error callback tests

**Files**:
- Modify: `src/shared/debounce.ts`
- Modify: `src/shared/debounce.test.ts`
- Modify: `src/extension.ts`

**Verification**: Tests pass, tsgo type-check passes

---

## TASK 6 — Dev workflow: local extension install

**Status**: [x]

**Plan**:
- Add `install-local` script that packages + installs .vsix
- Add `package` task to `.vscode/tasks.json`

**Files**:
- Modify: `packages/shared/config/tooling/vscode/package.json`
- Modify: `.vscode/tasks.json`

**Verification**: Script defined, tasks.json valid JSON

---

## Register Rules + Config

All tasks registered above.

---

## Full QA + Coverage

Run `pnpm qa:test`, `pnpm qa:lint --tools`, `pnpm qa:format:check` after all tasks.

---

## Final Verification + Commit

Verify all tasks against this plan, commit changes.
