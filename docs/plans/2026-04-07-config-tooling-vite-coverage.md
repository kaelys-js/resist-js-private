# Config/Tooling/Vite Coverage — Cover All Uncovered Branches

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/config/tooling/vite` (`packages/shared/config/tooling/vite/src/`)
**Goal**: Cover all remaining uncovered branches in 3 source files, raising coverage from 61.9%/40%/80%/61.9% to passing thresholds (80%/75%/80%/80%).
**Architecture**: Test-only changes. Mock `readFile`/`writeFile` for plugin lifecycle hooks, exercise error branches in resolve/helper functions, and test `jsonDefine` error path.

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
| Tests | 44 total (44 pass, 3 test files) |
| Statements | 61.9% (78/126) |
| Branches | 40% (24/60) |
| Functions | 80% (16/20) |
| Lines | 61.9% (78/126) |

---

## TASK 1 — Test templateErrorHtml plugin lifecycle hooks

**Status**: [ ]

**Gap**: The `config()` build-mode path, `closeBundle()`, `restore()`, and `process.on('exit')` in `templateErrorHtml` (lines 349-385) are completely untested. This includes:
- Line 349-352: `config()` hook with `env.command === 'build'` — readFile, resolveErrorHtml, writeFile
- Line 356: readFile error branch
- Line 365: resolveErrorHtml error branch
- Line 371: writeFile error branch
- Line 378: `process.on('exit', restore)` registration
- Lines 381-384: `closeBundle()` — calls restore + removes exit listener
- Lines 330-342: `restore()` — writes originalContent back, handles writeFile error

**Plan**:
- Mock `@/utils/core/fs` (readFile, writeFile) in the existing `vite-plugin-template-html.test.ts`
- Add tests that:
  1. Call `config()` with `{ command: 'build' }` — readFile succeeds, resolveErrorHtml succeeds, writeFile succeeds. Verify writeFile called with resolved content.
  2. Call `config()` with readFile returning error. Assert throws.
  3. Call `config()` with writeFile returning error. Assert throws.
  4. Call `closeBundle()` after `config()` — verify restore writes originalContent back.
  5. Call `restore()` when originalContent is null (no-op path).
  6. Test restore() writeFile error path — assert throws.

**Files**:
- Edit: `packages/shared/config/tooling/vite/src/vite-plugin-template-html.test.ts`

**Verification**: `pnpm --filter @/config/tooling/vite run qa:test` — all new tests pass

---

## TASK 2 — Test templateAppHtml plugin lifecycle hooks

**Status**: [ ]

**Gap**: Same pattern as TASK 1 but for `templateAppHtml` (lines 405-472):
- Line 436-465: `config()` hook build-mode path — readFile, resolveAppHtml, writeFile
- Line 442: readFile error branch
- Line 451: resolveAppHtml error branch (requires template to fail validation — not easy since string always passes; instead test writeFile error)
- Line 458: writeFile error branch
- Line 464: `process.on('exit', restore)` registration
- Lines 467-469: `closeBundle()` — calls restore + removes exit listener
- Lines 417-429: `restore()` — writes originalContent back, handles writeFile error

**Plan**:
- Same mock pattern as TASK 1
- Add tests that:
  1. Call `config()` with `{ command: 'build' }` — full success path. Verify writeFile called.
  2. Call `config()` with readFile error. Assert throws.
  3. Call `config()` with writeFile error on initial write. Assert throws.
  4. Call `closeBundle()` after successful `config()` — verify restore writes back.
  5. Test restore() no-op when originalContent is null.
  6. Test restore() writeFile error — assert throws.

**Files**:
- Edit: `packages/shared/config/tooling/vite/src/vite-plugin-template-html.test.ts`

**Verification**: `pnpm --filter @/config/tooling/vite run qa:test` — all new tests pass

---

## TASK 3 — Test error paths in resolve/helper functions and plugin validation

**Status**: [ ]

**Gap**: Several validation error branches are untested:
- `templateErrorHtml()` line 322: configResult validation error — invalid config
- `templateAppHtml()` line 409: configResult validation error — invalid config
- `resolveErrorHtml()` line 220: cfgResult error (invalid ErrorHtmlConfig)
- `resolveAppHtml()` line 280: cfgResult error (invalid AppHtmlConfig)
- `generateFontFaceCss()` line 154: validation error for invalid entries (e.g. missing required field)

**Plan**:
- Add tests passing invalid configs:
  1. `templateErrorHtml({} as any)` — assert throws (line 322-325)
  2. `templateAppHtml({} as any)` — assert throws (line 409-412)
  3. `resolveErrorHtml('template', {} as any)` — assert `result.ok === false` (line 220)
  4. `resolveAppHtml('template', {} as any)` — assert `result.ok === false` (line 280)
  5. `generateFontFaceCss([{} as any])` — assert `result.ok === false` (line 154)

**Files**:
- Edit: `packages/shared/config/tooling/vite/src/vite-plugin-template-html.test.ts`

**Verification**: `pnpm --filter @/config/tooling/vite run qa:test` — all new tests pass

---

## TASK 4 — Test index.ts remaining error paths

**Status**: [ ]

**Gap**: `jsonDefine()` error path (line 53-55) and options validation error (line 119-121) are untested. `getGitInfo` error and `getPackageVersion` error are already tested.
- Line 53: `!result.ok` in jsonDefine — safeStringify returns error
- Line 119: `!optionsResult.ok` — invalid options

Note: `jsonDefine` error IS tested indirectly via "throws when safeStringify fails" test in `index.test.ts`. The `options` validation error IS tested via "throws when options are invalid" test. These may already cover the branches — need to verify the actual coverage report to confirm.

**Plan**:
- Run coverage with per-file detail to check if lines 53 and 119 of index.ts are actually uncovered
- If uncovered, add explicit tests; if covered, skip (existing tests may cover them)

**Files**:
- Edit: `packages/shared/config/tooling/vite/src/index.test.ts` (if needed)

**Verification**: `pnpm --filter @/config/tooling/vite run qa:test` — all tests pass

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify test files match vitest config-tooling-vite project include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register
- No config file changes needed

**Verification**: All test files discovered by vitest (expect 3 test files in output)

---

## TASK 6 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all commands registered correctly — no production code modified
- Verify config settings read unchanged — only test files edited
- Verify no classes need instantiation changes — test-only
- Verify no unused exports or dead code — no new exports created

**Verification**:
- No production `.ts` files modified
- All existing exports unchanged
- No orphaned imports

---

## TASK 7 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @/config/tooling/vite run qa:test:coverage`
- Verify coverage increased from baseline (61.9%/40%/80%/61.9%)
- Verify all thresholds pass (80%/75%/80%/80%)

**Verification**: All pnpm commands exit 0, all coverage thresholds pass

---

## TASK 8 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all test files exist and pass
- Verify all coverage thresholds pass
- Verify no regressions across monorepo
- Commit with descriptive message

**Verification**:
- Test count >= 60 (baseline 44 + ~16 new)
- All coverage thresholds pass (80%/75%/80%/80%)
- `pnpm --filter @/config/tooling/vite run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Test templateErrorHtml plugin lifecycle hooks | -- |
| 2 | Test templateAppHtml plugin lifecycle hooks | -- |
| 3 | Test error paths in resolve/helper/validation | -- |
| 4 | Test index.ts remaining error paths | -- |
| 5 | Register rules + config | 1-4 |
| 6 | Integration verification | 5 |
| 7 | Full QA + Coverage | 6 |
| 8 | Final verification + commit | 7 |
