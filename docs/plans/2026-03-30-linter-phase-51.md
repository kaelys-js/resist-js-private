# @/lint Phase 51 — Structured Error Reporting for All Silent Failures

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Eliminate all silently swallowed errors across the linter framework. Every `catch` block that currently returns empty results or skips silently must instead emit a normalized `LintResult` diagnostic so failures are visible to the user.
**Architecture**: Extends the Phase 50 pattern (`SvelteParseResult` / `svelte5/template-parse-error`) to all 7 remaining silent-failure sites: oxc-parser loading, TypeScript parse errors, rule visitor crashes, tool execution failures, and svelte-check crashes. All diagnostics use `internal/*` ruleId namespace with `'warning'` severity.

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
| Tests | 4939 total (now 4946 — 7 new tests added) |
| Silent failure sites | 7 → 0 (all resolved) |
| Error diagnostics emitted | internal/oxc-parser-unavailable, internal/ts-parse-error, internal/rule-crash, internal/tool-crash + svelte5/template-parse-error (Phase 50) |

---

## TASK 1 — Cache oxc-parser load error + emit diagnostic on unavailability

**Status**: [x]

**Gap**: `ensureOxcParser()` in `oxc-runner.ts` has a bare `catch {}` that returns `false` with no error message. When oxc-parser is unavailable, `runTypeScriptRules` returns `[]` — ALL TypeScript rules silently disabled for ALL files with zero feedback.

**Plan**:
- Add `let oxcLoadFailed: boolean = false` and `let oxcLoadError: string = ''` module-level state (mirrors `svelte-template.ts` pattern)
- In `ensureOxcParser()` catch: set `oxcLoadFailed = true`, capture error message in `oxcLoadError`
- In `runTypeScriptRules()` when `!hasParser`: emit `internal/oxc-parser-unavailable` warning diagnostic instead of returning `[]`

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Existing 4939 tests pass

---

## TASK 2 — Emit diagnostic on TypeScript parse failure

**Status**: [x]

**Gap**: `parseSync()` call in `oxc-runner.ts` has a bare `catch {}` that returns `[]`. A `.ts` or `.svelte` file with syntax errors is silently skipped — zero diagnostics.

**Plan**:
- Capture error message in the `parseSync()` catch block
- Emit `internal/ts-parse-error` warning diagnostic with the error message and file path
- Append " — TypeScript-based lint rules were skipped for this file" to message (matches Phase 50 pattern)

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Existing tests pass

---

## TASK 3 — Emit diagnostic on rule visitor crash (TS + Svelte walks)

**Status**: [x]

**Gap**: Two bare `catch {}` blocks in `oxc-runner.ts` (lines 579, 604) silently swallow exceptions thrown by rule visitor functions. A crashed rule produces zero output with no indication of failure.

**Plan**:
- Capture error in both catch blocks
- Emit `internal/rule-crash` warning diagnostic with: rule ID, node type, file path, error message
- Use a `Set<string>` to deduplicate (only emit once per rule+file combo to avoid flooding)

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Existing tests pass

---

## TASK 4 — Emit diagnostic on file/workspace tool crash

**Status**: [x]

**Gap**: `tool-orchestrator.ts` has two `return []` branches (lines 175, 259) when `execFileSync` fails and produces no stdout. Tool crashes (timeout, ENOENT, segfault) are completely invisible.

**Plan**:
- In `runToolOnFiles()` catch: when no stdout, capture error message, emit `internal/tool-crash` warning with tool name and error
- In `runWorkspaceTool()` catch: same pattern
- Use tool name in diagnostic message for identification

**Files**:
- Modify: `src/framework/tool-orchestrator.ts`

**Verification**: Existing tests pass

---

## TASK 5 — Emit diagnostic on svelte-check crash

**Status**: [x]

**Gap**: `svelte-check.ts` line 115 — when `execFileSync('svelte-check')` fails and produces no stdout, the package is silently skipped. Type errors in that package become invisible.

**Plan**:
- In the catch block: when no stdout, capture error message, emit `internal/tool-crash` warning with package directory and error
- Message: "svelte-check crashed for {package} — type checking was skipped ({error})"

**Files**:
- Modify: `src/tools/svelte-check.ts`

**Verification**: Existing tests pass

---

## TASK 6 — Add tests for all error-reporting paths

**Status**: [x]

**Plan**:
- Test: TypeScript syntax error produces `internal/ts-parse-error` warning diagnostic
- Test: rule visitor that throws produces `internal/rule-crash` warning diagnostic
- Test: tool execution failure produces `internal/tool-crash` warning diagnostic
- Test: valid files produce no internal/* diagnostics

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`
- Modify: `src/framework/tool-orchestrator.test.ts`

**Verification**: All new tests pass, total test count increased from baseline

---

## TASK 7 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules to register — this phase modifies framework internals only
- Verify `.resist-lint.jsonc` unchanged
- Verify existing rules still load and function

**Verification**: All existing rules functional

---

## TASK 8 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm qa:test`
- Run `pnpm qa:lint`
- Run `pnpm qa:format:check`
- Verify test count increased from baseline 4939

**Verification**: All commands green, no regressions

---

## TASK 9 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 7 silent-failure sites now emit diagnostics
- Verify all new tests pass
- Verify test count ≥ 4939 + new tests
- Commit with descriptive message

**Verification**:
- `ensureOxcParser` caches error message
- TypeScript parse failure emits `internal/ts-parse-error` diagnostic
- Rule visitor crash emits `internal/rule-crash` diagnostic
- Tool crash emits `internal/tool-crash` diagnostic
- svelte-check crash emits `internal/tool-crash` diagnostic
- All tests pass
- Commit clean

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Cache oxc-parser load error | — |
| 2 | Emit TS parse error diagnostic | — |
| 3 | Emit rule visitor crash diagnostic | — |
| 4 | Emit tool crash diagnostic | — |
| 5 | Emit svelte-check crash diagnostic | — |
| 6 | Add tests | 1, 2, 3, 4, 5 |
| 7 | Register rules + config verification | 1, 2, 3, 4, 5 |
| 8 | Full QA + Coverage | 6, 7 |
| 9 | Final verification + commit | 8 |
