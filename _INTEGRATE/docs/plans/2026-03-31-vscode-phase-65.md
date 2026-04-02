# @resist/vscode Phase 65 — Error Swallowing, Locale Test Exhaustiveness, Code Action Safety

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-31
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/src/`)
**Goal**: Eliminate 6 silent error catches, make code-actions outputChannel required, add exhaustive locale tests covering all 29 string groups.
**Architecture**: All error handling uses `logError()` from `shared/output.ts` with localized messages from `en.ts`. Locale tests verify every field in `VscodeStrings` schema is present and non-empty.

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
| Tests | 306 total (306 pass / 0 fail) |
| Test Files | 32 |
| Type-check | Passes |
| Lint | Passes |

---

## TASK 1 — Fix state.ts observer catch — log error to output channel

**Status**: [ ]

**Gap**: `state.ts:78-80` catches observer callback errors with empty catch. The class has `this.channel` available — errors should be logged.

**Plan**:
- Replace empty catch with `logError(this.channel, ...)` using localized message
- Add locale string `en.state.observerError` with `{tool}` and `{error}` placeholders
- Add `observerError` field to `StateStrings` interface in schema.ts
- Update state.test.ts to verify error is logged when observer throws

**Files**:
- Modify: `src/shared/state.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/shared/state.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — Fix events.ts dispatcher — console.error as last resort

**Status**: [ ]

**Gap**: `events.ts:191-196` calls `format()` but discards result with `void`. When no output channel, error message is constructed and thrown away.

**Plan**:
- Replace `void format(...)` with `console.error(format(...))` as last-resort logging
- Update events.test.ts to verify console.error is called when no output channel and handler throws

**Files**:
- Modify: `src/shared/events.ts`
- Modify: `src/shared/events.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — Fix provider.ts — count and log skipped diagnostic entries

**Status**: [ ]

**Gap**: `provider.ts:249-251` bare catch silently skips malformed entries. Should count skipped entries and log a summary.

**Plan**:
- Add counter for skipped entries in the workspace lint loop
- After loop, if `skipped > 0`, log summary via `logError(outputChannel, ...)` with localized message
- Add locale string `en.diagnosticManager.skippedEntries` with `{count}` and `{file}` placeholders
- Add `skippedEntries` field to `DiagnosticManagerStrings` interface
- Update provider.test.ts to verify skipped entries are logged

**Files**:
- Modify: `src/lint/provider.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/lint/provider.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — Fix watcher.ts — log errors to output channel

**Status**: [ ]

**Gap**: `watcher.ts:38-44` bare catch for individual lint calls. Comment claims errors are "already logged at call site" but if lintFn throws synchronously before reaching safeRunAsync, the error is lost.

**Plan**:
- Add optional `outputChannel` parameter to `createConfigWatcher()`
- In catch block, log error via `logError()` if channel provided
- Add locale string `en.watcher.relintError` with `{file}` and `{error}` placeholders
- Add `relintError` field to `WatcherStrings` interface
- Update extension.ts to pass outputChannel to createConfigWatcher()
- Update watcher.test.ts to verify error is logged when lint throws

**Files**:
- Modify: `src/lint/watcher.ts`
- Modify: `src/locale/schema.ts`
- Modify: `src/locale/en.ts`
- Modify: `src/extension.ts`
- Modify: `src/lint/watcher.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — Fix extension.ts deactivate — console.error in catch

**Status**: [ ]

**Gap**: `extension.ts:268-270` bare catch in `deactivate()` silently swallows dispose errors. Output channel may already be gone, so `console.error` is the only option.

**Plan**:
- Replace empty catch with `console.error('Deactivation error:', error)`
- Update extension.test.ts (if exists) or verify no test needed (deactivate is trivial)

**Files**:
- Modify: `src/extension.ts`

**Verification**: Type-check passes

---

## TASK 6 — Make code-actions.ts outputChannel required

**Status**: [ ]

**Gap**: Constructor takes `outputChannel?` (optional). All 3 catch blocks skip error logging when missing. Extension.ts always provides it — the parameter should be required.

**Plan**:
- Change `outputChannel?: vscode.OutputChannel` to `outputChannel: vscode.OutputChannel` in constructor
- Remove all `if (this.outputChannel)` guards in catch blocks — call `logError()` directly
- Update JSDoc to remove "optional" wording
- Update code-actions.test.ts to always provide mock outputChannel

**Files**:
- Modify: `src/lint/code-actions.ts`
- Modify: `src/lint/code-actions.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — Exhaustive locale test — verify every field in all 29 groups

**Status**: [ ]

**Gap**: Locale test only checks 5 of 29 groups. 20+ groups have zero test coverage for field existence.

**Plan**:
- Add test block for each untested locale group verifying every field exists and is non-empty string
- Groups to add: `documentFilter`, `notifications`, `config`, `commands`, `lifecycle`, `watcher`, `progressHelper`, `state`, `diagnosticManager`, `runner`, `errorBoundary`, `events`, `fixOnSave`, `codeLens`, `diffPreview`, `formatting`, `profiling`, `filter`, `perFolder`, `staleCleanup`, `imports`, `inlineOverrides`, `stageIndicator`
- Each test verifies field is `typeof string` and `length > 0`

**Files**:
- Modify: `src/locale/locale.test.ts`

**Verification**: Tests pass

---

## TASK 8 — Locale test — verify parameterized strings format correctly

**Status**: [ ]

**Gap**: Most parameterized strings (with `{placeholder}` syntax) are not tested with actual format() calls. Only `messages` and `codeActions` have format tests.

**Plan**:
- Add format() tests for every parameterized string across all groups
- Verify placeholder replacement produces expected output with no leftover `{...}` tokens
- Cover: `documentFilter.iterationError`, `notifications.suppressed`, `config.*`, `commands.*`, `lifecycle.*`, `watcher.*`, `progressHelper.*`, `state.transitioned`, `diagnosticManager.*`, `runner.*`, `errorBoundary.errorLog`, `events.*`, `fixOnSave.*`, `codeLens.*`, `diffPreview.title`, `formatting.*`, `profiling.*`, `filter.*`, `perFolder.*`, `staleCleanup.*`, `imports.*`, `inlineOverrides.*`, `stageIndicator.*`

**Files**:
- Modify: `src/locale/locale.test.ts`

**Verification**: Tests pass

---

## TASK 9 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify all new locale strings added in TASKs 1-4 are present in en.ts
- Verify all new interface fields added in TASKs 1-4 are in schema.ts
- Verify validate-brand.ts still passes
- Verify generate-manifest.ts still passes

**Verification**: `pnpm run qa:lint` passes, `npx tsx scripts/generate-manifest.ts` passes

---

## TASK 10 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm run qa:lint`
- Run: `pnpm run qa:test`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline (306)

**Verification**: All commands exit 0

---

## TASK 11 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 6 error swallowing fixes applied
- Verify code-actions outputChannel is required
- Verify locale tests cover all 29 groups
- Verify test count increased from baseline
- Commit with descriptive message
