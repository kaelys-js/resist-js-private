# @/lint Phase 52 — Promote internal/* diagnostic severity to error

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: All 8 Phase 51 `internal/*` diagnostics incorrectly use `severity: 'warning'`. These represent hard failures (parser unavailable, parse errors, rule crashes, tool crashes) where functionality is completely skipped. They must be `'error'` severity.
**Architecture**: Pure severity field changes — no structural changes to diagnostic emission logic.

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
| Tests | 4946 total |
| internal/* diagnostics at warning | 8 sites → 0 |
| internal/* diagnostics at error | 0 sites → 9 (includes Phase 50 svelte5/template-parse-error) |

---

## TASK 1 — Change severity in oxc-runner.ts (5 sites)

**Status**: [x]

**Sites**:
- Line ~478: `internal/oxc-parser-unavailable` — `'warning'` → `'error'`
- Line ~537: `internal/ts-parse-error` (empty body) — `'warning'` → `'error'`
- Line ~552: `internal/ts-parse-error` (catch) — `'warning'` → `'error'`
- Line ~653: `internal/rule-crash` (TS walk) — `'warning'` → `'error'`
- Line ~690: `internal/rule-crash` (Svelte walk) — `'warning'` → `'error'`

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Existing tests fail (expected — assertions check for 'warning')

---

## TASK 2 — Change severity in tool-orchestrator.ts (2 sites)

**Status**: [x]

**Sites**:
- Line ~181: `internal/tool-crash` (runTool) — `'warning' as const` → `'error' as const`
- Line ~276: `internal/tool-crash` (runWorkspaceTool) — `'warning' as const` → `'error' as const`

**Files**:
- Modify: `src/framework/tool-orchestrator.ts`

**Verification**: Tool crash tests fail (expected — assertions check for 'warning')

---

## TASK 3 — Change severity in svelte-check.ts (1 site)

**Status**: [x]

**Sites**:
- Line ~121: `internal/tool-crash` — `'warning'` → `'error'`

**Files**:
- Modify: `src/tools/svelte-check.ts`

**Verification**: No direct tests for this site

---

## TASK 4 — Update test assertions

**Status**: [x]

**Plan**:
- Update oxc-runner.test.ts: `ts-parse-error` severity assertion → `'error'`
- Update oxc-runner.test.ts: `rule-crash` severity assertion → `'error'`
- Update tool-orchestrator.test.ts: `tool-crash` severity assertion → `'error'`

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`
- Modify: `src/framework/tool-orchestrator.test.ts`

**Verification**: All 4946 tests pass

---

## TASK 5 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules to register — this phase modifies framework internals only
- Verify `.resist-lint.jsonc` unchanged
- Verify existing rules still load and function

**Verification**: All existing rules functional

---

## TASK 6 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm qa:test` — all 4946 pass
- Run `pnpm qa:lint --tools`
- Run `pnpm qa:format:check`
- Verify no regressions

**Verification**: All commands green, no regressions

---

## TASK 7 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 8 `internal/*` sites now use `severity: 'error'`
- Verify all test assertions updated to match new severity
- Verify test count unchanged from baseline (4946)
- Verify no warning severity remains on any internal/* diagnostic
- Commit with descriptive message

**Verification**:
- `grep -c "severity: 'warning'" oxc-runner.ts` returns 0 for internal/* sites
- `grep -c "severity: 'error'" oxc-runner.ts` returns 5 for internal/* sites
- `grep -c "'warning' as const" tool-orchestrator.ts` returns 0
- All 4946 tests pass
- Commit clean

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Change severity in oxc-runner.ts | — |
| 2 | Change severity in tool-orchestrator.ts | — |
| 3 | Change severity in svelte-check.ts | — |
| 4 | Update test assertions | 1, 2, 3 |
| 5 | Register rules + config verification | 1, 2, 3 |
| 6 | Full QA + Coverage | 4, 5 |
| 7 | Final verification + commit | 6 |
