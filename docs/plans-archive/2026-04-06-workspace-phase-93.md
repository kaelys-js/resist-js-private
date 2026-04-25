# Workspace Phase 93 — Fix 11 Remaining qa:lint Errors (Excluding shared/utils/cli)

**Date**: 2026-04-06
**Package**: Workspace-wide (3 test files across `packages/`)
**Goal**: Resolve the remaining 11 `qa:lint` tsgo errors outside of `shared/utils/cli` so the workspace linter exits cleanly.
**Architecture**: Minimum type-level fixes — correct return types on test helpers, remove duplicate `declare global`, add typed mock parameters. No runtime behavior changes.

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
| Tests | All passing (`pnpm -w run qa:test`, except pre-existing workspace.test.ts failure) |
| qa:lint errors (excl. shared/utils/cli) | 11 |
| qa:lint exit code | 1 (failure) |

---

## TASK 1 — Fix template-literal test asParts() return type (5 errors)

**Status**: [ ]

**Gap**: `packages/shared/schemas/template-literal/src/template-literal.test.ts` lines 210, 226, 236, 246, 257 — 5x TS2345. The `asParts()` helper returns `readonly (string | v.GenericSchema)[]` but `templateLiteral()` expects `readonly TemplateLiteralPart[]`. `v.GenericSchema` is broader than `TemplateLiteralPartSchema`.

**Plan**:
- Import `type TemplateLiteralPart` from `@/schemas/template-literal/types`
- Change `asParts()` return type from `readonly (string | v.GenericSchema)[]` to `readonly TemplateLiteralPart[]`

**Files**:
- Edit: `packages/shared/schemas/template-literal/src/template-literal.test.ts` (lines 14, 22-24)
- Test: `packages/shared/schemas/template-literal/src/template-literal.test.ts`

**Verification**: `pnpm -w run qa:lint --tools 2>&1 | grep "template-literal"` returns zero matches; `pnpm --filter @/schemas/template-literal run qa:test` passes

---

## TASK 2 — Fix build-info.test.ts duplicate declare global (2 errors)

**Status**: [ ]

**Gap**: `packages/shared/utils/core/src/build-info.test.ts` lines 13, 15 — 2x TS2403. Test re-declares `__APP_VERSION__: string | undefined` and `__GIT_COMMIT__: string | undefined` but `build-globals.d.ts` already declares them as `string`. Duplicate declarations with incompatible types.

**Plan**:
- Remove the entire `declare global { ... }` block (lines 10-16) from the test file
- The declarations from `src/build-globals.d.ts` (which is included via `tsconfig.json` `"include": ["src"]`) are sufficient
- The `@ts-expect-error` comments on lines 91 and 93 already handle the `undefined` assignment

**Files**:
- Edit: `packages/shared/utils/core/src/build-info.test.ts` (remove lines 10-16)
- Test: `packages/shared/utils/core/src/build-info.test.ts`

**Verification**: `pnpm -w run qa:lint --tools 2>&1 | grep "build-info"` returns zero matches; `pnpm --filter @/utils/core run qa:test` passes

---

## TASK 3 — Fix git.test.ts mock parameter types (4 errors)

**Status**: [ ]

**Gap**: `packages/shared/utils/core/src/git.test.ts` lines 39, 43, 45, 49 — 4x TS2554. Mock functions are defined with 0 parameters (`vi.fn((): Result<Str> => ...)`) but called with 1-2 arguments via spread (`execSyncSafeMock(...(args as [Str]))`).

**Plan**:
- `execSyncSafeMock` (line 33): Change `vi.fn((): Result<Str> => mockOk(''))` to `vi.fn((_cmd: Str): Result<Str> => mockOk(''))`
- `readFileMock` (line 34): Change to `vi.fn((_path: Str): Result<Str> => mockOk('{}'))`
- `parseJsonWithCommentsMock` (line 35): Change to `vi.fn((_content: Str): Result<Record<Str, unknown>> => mockOk({}))`
- `joinPathMock` (line 36): Change to `vi.fn((_a: Str, _b: Str): Result<Str> => mockOk(''))`

**Files**:
- Edit: `packages/shared/utils/core/src/git.test.ts` (lines 33-36)
- Test: `packages/shared/utils/core/src/git.test.ts`

**Verification**: `pnpm -w run qa:lint --tools 2>&1 | grep "git.test"` returns zero matches; `pnpm --filter @/utils/core run qa:test` passes

---

## TASK 4 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No new rules, config, or exports to register — all changes are type-level fixes in existing test files
- Verify no new files created that need barrel registration

**Verification**:
- `git diff --name-only | wc -l` shows exactly 3 modified test files
- `git diff --name-only | grep -v '\.test\.ts$' | wc -l` returns 0 (no non-test files modified)

---

## TASK 5 — Integration Verification

**Status**: [ ]

**Plan**:
- N/A — no production code modified, only test-internal type annotations changed
- Command registration check: no registerCommand calls modified (0 test files contain registerCommand)
- Config settings read check: no config.get calls modified (changes are type-only in test helpers)
- Class instantiation check: no constructors modified (changes are vi.fn parameter types and return type annotations)
- Unused exports / dead code check: no exports added or removed — all changes are test-internal (local functions and vi.fn declarations)

**Verification**:
- `git diff --name-only | grep -c 'index\.ts$'` returns 0 (no barrel files modified)
- `grep -r "registerCommand" packages/shared/schemas/template-literal/src/template-literal.test.ts packages/shared/utils/core/src/build-info.test.ts packages/shared/utils/core/src/git.test.ts | wc -l` returns 0
- `grep -rn "^export" packages/shared/schemas/template-literal/src/template-literal.test.ts packages/shared/utils/core/src/build-info.test.ts packages/shared/utils/core/src/git.test.ts | wc -l` returns 0 (no exports in test files)
- `pnpm -w run qa:lint --tools 2>&1 | grep ",-\[" | grep -v "utils/cli" | wc -l` returns 0

---

## TASK 6 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:test`
- Verify zero lint errors outside shared/utils/cli
- Verify all tests still pass

**Verification**: All pnpm commands exit 0; `pnpm -w run qa:lint --tools 2>&1 | grep -v "utils/cli" | grep -c "✗"` returns 0

---

## TASK 7 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 3 test files have zero lint errors
- Verify all modified test files pass their test suites
- Verify no regressions in any package
- Commit with descriptive message

**Verification**:
- All 3 test files saved and correct
- `pnpm -w run qa:lint --tools` exits with only shared/utils/cli errors
- `pnpm -w run qa:test` exits 0
- Test count >= baseline

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix template-literal test asParts() return type (5 errors) | -- |
| 2 | Fix build-info.test.ts duplicate declare global (2 errors) | -- |
| 3 | Fix git.test.ts mock parameter types (4 errors) | -- |
| 4 | Register rules + config | 1-3 |
| 5 | Integration verification | 4 |
| 6 | Full QA + Coverage | 5 |
| 7 | Final verification + commit | 6 |
