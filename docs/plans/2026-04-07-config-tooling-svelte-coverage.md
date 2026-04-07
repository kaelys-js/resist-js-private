# Config/Tooling/Svelte Coverage — Cover All Uncovered Branches

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/config/tooling/svelte` (`packages/shared/config/tooling/svelte/src/`)
**Goal**: Cover all remaining uncovered branches in index.ts, raising branch coverage from 82.5% (33/40) toward 100%.
**Architecture**: Test-only changes. Add error-path tests for buildAliasesFromTsconfig internals and stub NODE_ENV for CSP production branch.

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
| Tests | 72 total (72 pass, 3 test files) |
| Statements | 91.04% (61/67) |
| Branches | 82.5% (33/40) |
| Functions | 100% (6/6) |
| Lines | 91.04% (61/67) |

---

## TASK 1 — Test buildAliasesFromTsconfig error paths

**Status**: [ ]

**Gap**: Four error branches inside `buildAliasesFromTsconfig()` are never exercised:
- Line 250: `!tsconfigPathResult.ok` — joinPath fails when building tsconfig.json path
- Line 262: `!jsonResult.ok` — parseJsonWithComments returns error
- Line 268: `!tsconfigResult.ok` — tsconfig content fails TsconfigJsonSchema validation
- Line 305: `!resolvedPathResult.ok` — joinPath fails for individual alias path resolution

**Plan**:
- Import `joinPath` and `parseJsonWithComments` mocks (already available in test file)
- Add 4 tests in `loader.test.ts`:
  1. Mock `joinPath` to fail on first call (tsconfig path). Assert createSvelteConfig throws.
  2. Mock `parseJsonWithComments` to return `{ ok: false, error: ... }`. Assert throws.
  3. Mock `parseJsonWithComments` to return valid JSON that fails TsconfigJsonSchema (e.g., `{ compilerOptions: { paths: 123 } }` — paths must be record). Assert throws.
  4. Mock `joinPath` to succeed for tsconfig path but fail on subsequent calls (alias resolution). Assert throws.

**Files**:
- Edit: `packages/shared/config/tooling/svelte/src/index.test.ts`

**Verification**: `pnpm --filter @/config/tooling/svelte run qa:test` — all new tests pass

---

## TASK 2 — Test CSP production branch

**Status**: [ ]

**Gap**: Line 434 `enableCsp && IS_PRODUCTION` true branch never fires because `IS_PRODUCTION` is always false in test (NODE_ENV='test').

**Plan**:
- Use `vi.stubEnv('NODE_ENV', 'production')` + `vi.resetModules()` + re-import to get `IS_PRODUCTION=true`
- Create a separate `describe('CSP in production', ...)` block
- Assert `config.kit.csp` exists and has `mode: 'auto'` and `directives`
- Restore env after test

**Files**:
- Create: `packages/shared/config/tooling/svelte/src/index-csp.test.ts` (separate file needed because IS_PRODUCTION is evaluated at module load time)

**Verification**: `pnpm --filter @/config/tooling/svelte run qa:test:coverage` — line 434 true branch now covered

---

## TASK 3 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify new test file matches vitest config-tooling-svelte project include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register
- No config file changes needed

**Verification**: All test files discovered by vitest (expect 4 test files in output)

---

## TASK 4 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all commands registered correctly — no production code modified
- Verify config settings read unchanged — only test files added/edited
- Verify no classes need instantiation changes — test-only
- Verify no unused exports or dead code — no new exports created

**Verification**:
- No production `.ts` files modified
- All existing exports unchanged
- No orphaned imports

---

## TASK 5 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @/config/tooling/svelte run qa:test:coverage`
- Verify branch coverage increased from 82.5% baseline
- Verify all thresholds still pass

**Verification**: All pnpm commands exit 0, branch coverage > 82.5%

---

## TASK 6 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all test files exist and pass
- Verify all coverage thresholds pass
- Verify no regressions
- Commit with descriptive message

**Verification**:
- Test count >= 77 (baseline 72 + 5 new)
- Branch coverage >= 95%
- `pnpm --filter @/config/tooling/svelte run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Test buildAliasesFromTsconfig error paths | -- |
| 2 | Test CSP production branch | -- |
| 3 | Register rules + config | 1-2 |
| 4 | Integration verification | 3 |
| 5 | Full QA + Coverage | 4 |
| 6 | Final verification + commit | 5 |
