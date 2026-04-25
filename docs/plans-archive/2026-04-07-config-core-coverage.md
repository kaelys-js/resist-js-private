# Config/Core Coverage — Cover All Uncovered Branches

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/config` (`packages/shared/config/core/src/`)
**Goal**: Cover all remaining uncovered branches in loader.ts and defaults.ts, raising branch coverage from 77.77% toward 95%+.
**Architecture**: Test-only changes. Create temp .mjs fixtures for dynamic import branches. Use vi.resetModules for module-level throw branches.

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
| Tests | 31 total (31 pass, 2 test files) |
| Statements | 85.07% (57/67) |
| Branches | 77.77% (28/36) |
| Functions | 100% (7/7) |
| Lines | 85.07% (57/67) |

---

## TASK 1 — Test loadConfig dynamic-import success branches

**Status**: [ ]

**Gap**: Three branches inside `loadConfig()`'s try block are never exercised. The existing test at line 197 only covers the catch block (import throws). Lines 144, 148, 164-170 require the import to succeed with controlled return values.

**Plan**:
- Create temp .mjs fixture files in beforeEach, clean up in afterEach
- Mock `joinPath` to return the real temp fixture path so `await import(configPath)` resolves
- Add 3 tests in a new `describe('loadConfig dynamic import branches', ...)` block in `loader.test.ts`:
  1. **Line 144 `??` right side**: Fixture exports named-only (no `.default`). Assert `result.ok === true` (module object itself passes typeof check, merge with defaults succeeds)
  2. **Line 148 false branch**: Fixture does `export default 42`. `typeof 42 !== 'object'` so `userConfig` stays `{}`. Assert `result.ok === true` and values equal defaults
  3. **Lines 164-170 `!validated.ok`**: Fixture does `export default { locales: ['fr'] }`. After merge, `defaultLocale='en'` not in `locales=['fr']` — CoreConfigSchema cross-field check fails. Assert `result.ok === false` and `result.error.code === 'CONFIG.INVALID'`

**Files**:
- Edit: `packages/shared/config/core/src/loader.test.ts`

**Verification**: `pnpm --filter @/config run qa:test:coverage` — all 3 new tests pass, lines 144/148/164-170 now covered

---

## TASK 2 — Test module-level throw branches

**Status**: [ ]

**Gap**: Two module-level `throw` statements (defaults.ts:230, loader.ts:54-57) fire at import time and are never exercised. They are integration safeguards.

**Plan**:
- Create `src/defaults-init.test.ts`: Mock `@/utils/result/safe` so `safeParse` returns `{ ok: false, error: { message: 'mocked failure' } }`. Use `vi.resetModules()` + `await import('./defaults')`. Assert import throws with message containing `'Default config validation failed'`.
- Create `src/loader-init.test.ts`: Mock `@/config/core/defaults` to provide `defaults` with `tooling.paths.configFilename = ''` (empty string fails FilenameSchema minLength(1)). Mock logger/node-imports/workspace/path. Use `vi.resetModules()` + `await import('./loader')`. Assert import throws.

**Files**:
- Create: `packages/shared/config/core/src/defaults-init.test.ts`
- Create: `packages/shared/config/core/src/loader-init.test.ts`

**Verification**: `pnpm --filter @/config run qa:test:coverage` — both new test files pass, module-level throws now covered

---

## TASK 3 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify new test files match vitest config-core project include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register
- No config file changes needed

**Verification**: All new test files discovered by vitest (expect 4 test files in output)

---

## TASK 4 — Integration Verification

**Status**: [ ]

**Plan**:
- No commands registered — test-only changes, no new command registration needed
- Config settings read check: Run `git diff --name-only HEAD -- 'packages/shared/config/core/src/*.ts' ':!*.test.ts'` — expect 0 production files modified, confirming no config changes
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: Run `grep -c 'export' packages/shared/config/core/src/index.ts` — expect same count as baseline (no new exports introduced)
- Run `pnpm --filter @/config run qa:test` — expect all test files discovered and passing

**Verification**:
- `git diff --name-only` returns no production `.ts` files
- Export count unchanged from baseline
- `pnpm --filter @/config run qa:test` exits 0

---

## TASK 5 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @/config run qa:test:coverage`
- Verify branch coverage increased from 77.77% baseline
- Verify all thresholds still pass

**Verification**: All pnpm commands exit 0, branch coverage > 77.77%

---

## TASK 6 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 4 test files exist and pass
- Verify all coverage thresholds pass
- Verify no regressions in other packages
- Commit with descriptive message

**Verification**:
- All test files exist: loader.test.ts, defaults.test.ts, loader-init.test.ts, defaults-init.test.ts
- Test count >= 36 (baseline 31 + 5 new)
- Branch coverage >= 90%
- `pnpm --filter @/config run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Test loadConfig dynamic-import success branches | -- |
| 2 | Test module-level throw branches | -- |
| 3 | Register rules + config | 1-2 |
| 4 | Integration verification | 3 |
| 5 | Full QA + Coverage | 4 |
| 6 | Final verification + commit | 5 |
