# VSCode Extension Phase 75 — Fix All Lint & Type Errors

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-02
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Resolve all 220 custom linter errors (oxlint + tsgo + custom rules) in the VSCode extension.
**Architecture**: Mechanical fixes — type assertions, style transforms, mock improvements, 1 feature wire (showTiming).

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
| Tests | 331 total (331 pass) |
| Lint errors | 220 |
| Type-check (tsgo) | 3 errors |

---

## TASK 1 — Fix vscode mock (foundational — cascading fixes)

**Status**: [x]

**Gap**: `__mocks__/vscode.ts` has incomplete types causing TS2540 (readonly textDocuments), TS2740 (missing LogOutputChannel methods), TS2305 (unexported test helpers).

**Plan**:
- Make `textDocuments` mutable (writable property)
- Add LogOutputChannel methods to `createMockOutputChannel()`
- Verify `__setConfigValue` and `__resetMocks` are properly exported
- Add `CodeActionTriggerKind` to mock if missing

**Files**:
- Edit: `src/__mocks__/vscode.ts`
- Test: `src/shared/runner.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test 2>&1 | grep "Tests"` shows all tests passing; `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep "vscode.ts"` shows 0 errors for the mock file

---

## TASK 2 — Fix extension.ts errors

**Status**: [x]

**Gap**: Missing COMMANDS import, mapToolState scoping, switch braces, JSDoc, duplicate imports, no-void.

**Plan**:
- Import COMMANDS from `./shared/brand`
- Move `mapToolState` to module scope
- Add braces to switch cases
- Add `@returns` JSDoc
- Merge duplicate imports (state, schema)
- Fix no-void patterns

**Files**:
- Edit: `src/extension.ts`
- Test: `src/shared/lifecycle.test.ts`

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep "extension.ts"` shows 0 errors for extension.ts

---

## TASK 3 — Fix runner.ts and runner.test.ts

**Status**: [x]

**Gap**: 6 no-multiple-resolved in runner.ts, prefer-node-protocol, numeric-separators, catch-error-name. Test: require/import, EventEmitter, JSDoc, await-in-loop.

**Plan**:
- Add `let settled = false` guard to `runTool()` and `runToolJson()` promise handlers
- `'child_process'` → `'node:child_process'`, `'path'` → `'node:path'`
- `30000` → `30_000`, etc.
- Rename `parseErr` → `error`
- In test: convert `require('events')` to dynamic import, add JSDoc params, fix TS18048

**Files**:
- Edit: `src/shared/runner.ts`
- Edit: `src/shared/runner.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test 2>&1 | grep "runner"` shows runner tests passing; `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep "runner"` shows 0 errors

---

## TASK 4 — Fix generate-manifest.ts

**Status**: [x]

**Gap**: 21 no-console, 6 no-process-exit, TS2345/TS2322 on regex captures, TS2552 COMMANDS typo, prefer-template, prefer-string-replace-all.

**Plan**:
- Replace `console.error(msg); process.exit(1)` → `throw new Error(msg)`
- Replace `console.log` with `process.stdout.write` or controlled output function
- Add `!` assertions on regex capture groups
- Fix `COMMANDS[i-1]` → `brandOrder[i-1]`
- Use template literal instead of string concat
- `.replace(/x/g, y)` → `.replaceAll(/x/g, y)`

**Files**:
- Edit: `scripts/generate-manifest.ts`
- Test: `scripts/generate-manifest.test.ts`

**Verification**: `pnpm --filter @resist/vscode build 2>&1 | tail -1` exits cleanly; `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep "generate-manifest"` shows 0 errors

---

## TASK 5 — Fix type style errors (consistent-type-definitions, consistent-type-imports, array-type)

**Status**: [x]

**Gap**: 46 interface→type, 9 import type, 7 array-type across schema.ts, types.ts, file-watcher.ts, etc.

**Plan**:
- `interface Foo { ... }` → `type Foo = { ... }` in all flagged files
- Add `import type` where imports are type-only
- `T[]` → `Array<T>` for complex types

**Files**:
- Edit: `src/locale/schema.ts`
- Edit: `src/shared/types.ts`
- Edit: `src/shared/file-watcher.ts`
- Edit: Various other files with type style errors
- Test: `src/shared/config.test.ts`

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -c "consistent-type"` outputs 0; `pnpm --filter @resist/vscode run qa:test` passes

---

## TASK 6 — Fix remaining oxlint errors in source files

**Status**: [x]

**Gap**: prefer-destructuring, switch-case-braces, no-negated-condition, numeric-separators, prefer-node-protocol, require-await, no-useless-undefined, JSDoc, catch-error-name, etc. across ~15 source files.

**Plan**:
- Apply destructuring patterns
- Add braces to switch cases (diagnostics.ts, status-bar.ts)
- Flip negated conditions (diagnostics.ts, notifications.ts)
- Add numeric separators
- Add node: protocol to imports
- Remove unnecessary async, useless undefined
- Add JSDoc @param/@returns tags
- Fix remaining singleton errors (no-lonely-if, prefer-number-properties, prefer-await-to-then, etc.)

**Files**:
- Edit: `src/shared/diagnostics.ts`, `src/shared/status-bar.ts`, `src/shared/notifications.ts`
- Edit: `src/shared/workspace.ts`, `src/shared/lifecycle.ts`, `src/shared/document-filter.ts`
- Edit: `src/shared/state.ts`, `src/shared/events.ts`, `src/shared/output.ts`
- Edit: `src/lint/provider.ts`, `src/lint/profiling.ts`, `src/lint/commands.ts`
- Edit: `src/lint/code-actions.ts`, `src/lint/code-lens.ts`, `src/lint/formatting-provider.ts`
- Edit: `src/lint/diagnostic-filter.ts`, `src/lint/diff-preview.ts`, `src/lint/fix-on-save.ts`
- Edit: `src/lint/import-sorting.ts`, `src/lint/stale-cleanup.ts`, `src/lint/stage-indicator.ts`
- Edit: `src/shared/debounce.ts`, `src/shared/config.test.ts`
- Edit: `src/shared/command-registration.ts`
- Test: `src/shared/diagnostics.test.ts`

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -c "oxlint"` outputs 0 for source files; `pnpm --filter @resist/vscode run qa:test` passes

---

## TASK 7 — Fix oxlint errors in test files

**Status**: [x]

**Gap**: prefer-destructuring, no-useless-undefined, require-await, curly, TS2532/TS18048/TS2352/TS2345 in test files.

**Plan**:
- Add `!` non-null assertions on array accesses in test assertions
- Add complete CodeActionContext properties (triggerKind, only) for TS2352
- Type-annotate vi.fn() mocks for TS2345
- Apply destructuring, remove useless undefined, add braces
- Fix no-immediate-mutation, no-param-reassign, prefer-promise-reject-errors

**Files**:
- Edit: `src/lint/code-actions.test.ts`
- Edit: `src/lint/code-lens.test.ts`
- Edit: `src/lint/commands.test.ts`
- Edit: `src/lint/diagnostic-filter.test.ts`
- Edit: `src/lint/provider.test.ts`
- Edit: `src/lint/watcher.test.ts`
- Edit: `src/lint/per-folder.test.ts`
- Edit: `src/shared/diagnostics.test.ts`
- Edit: `src/shared/errors.test.ts`
- Edit: `src/shared/events.test.ts`
- Edit: `src/shared/config.test.ts`
- Edit: `src/shared/command-registration.test.ts`
- Edit: `src/shared/workspace.test.ts`
- Edit: `src/shared/state.test.ts`
- Edit: `src/shared/progress.test.ts`
- Edit: `src/locale/locale.test.ts`
- Edit: `src/lint/diff-preview.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test 2>&1 | grep "Tests"` shows all tests passing; `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -E "test\.ts"` shows 0 lint errors in test files

---

## TASK 8 — Wire resist.lint.showTiming setting

**Status**: [x]

**Gap**: Setting declared in package.json but never read — unimplemented feature.

**Plan**:
- Read `config.get('lint.showTiming')` in the lint options
- Pass to lint runner so timing is included in output when enabled

**Files**:
- Edit: `src/lint/per-folder.ts` or `src/extension.ts` (where lint options are built)
- Test: `src/lint/per-folder.test.ts`

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -c "no-unread-settings"` outputs 0; `pnpm --filter @resist/vscode run qa:test 2>&1 | grep "per-folder"` shows tests passing

---

## TASK 9 — Register Rules + Config

**Status**: [x]

**Plan**:
- Verify all changes registered properly
- No new rules/features to register (this phase is fixes only)
- Verify no orphaned code

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -c "no-unregistered"` outputs 0; `grep -c "registerCommand" packages/shared/config/tooling/vscode/src/extension.ts` confirms all commands wired

---

## TASK 10 — Integration Verification

**Status**: [x]

**Plan**:
- Verify all declared commands have matching registerCommand calls
- Verify all config settings are read via config.get somewhere in code
- Verify all feature classes are instantiated in the entry point
- Verify no unused exports or dead code (created but never imported)

**Verification**:
- `grep -c "registerCommand" packages/shared/config/tooling/vscode/src/lint/commands.ts` matches declared command count
- `grep -c "config.get" packages/shared/config/tooling/vscode/src/shared/config.ts` confirms all config settings read
- `pnpm --filter @resist/vscode run qa:test` passes with no orphaned exports

---

## TASK 11 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @resist/vscode run qa:test`
- Verify 0 lint errors, tests still pass

**Verification**: All commands exit 0, pnpm qa passes

---

## TASK 12 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all implementation files modified
- Verify lint error count dropped from 220 to 0
- Verify test count >= 331
- Verify tsgo type-check passes
- Commit with descriptive message

**Verification**:
- `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -c "error"` outputs 0
- `pnpm --filter @resist/vscode run qa:test 2>&1 | grep "Tests"` shows >= 331 tests passing
- `pnpm -w run qa:typecheck 2>&1 | grep "vscode"` shows 0 type errors

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix vscode mock | -- |
| 2 | Fix extension.ts | 1 |
| 3 | Fix runner.ts + test | 1 |
| 4 | Fix generate-manifest.ts | -- |
| 5 | Fix type style errors | -- |
| 6 | Fix oxlint source errors | 2, 3 |
| 7 | Fix oxlint test errors | 1, 6 |
| 8 | Wire showTiming setting | 6 |
| 9 | Register rules + config | 1-8 |
| 10 | Integration verification | 9 |
| 11 | Full QA + Coverage | 10 |
| 12 | Final verification + commit | 11 |
