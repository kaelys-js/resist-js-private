# Beacon Package — 100% Test Coverage

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/utils/beacon` (`packages/shared/utils/beacon/src/`)
**Goal**: Raise coverage from S:94.56% B:92.85% F:100% L:96.1% to 100% (or near-100%) by covering 4 remaining uncovered branches.
**Architecture**: Test-only changes. Add tests to existing test files exercising uncovered branches. No production code modifications.

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
| Tests | 55 total (55 pass, 4 test files) |
| Statements | 94.56% (87/92) |
| Branches | 92.85% (52/56) |
| Functions | 100% (10/10) |
| Lines | 96.1% (74/77) |
| Thresholds | S:80% B:75% F:80% L:80% |

### Per-file breakdown

| File | Statements | Branches | Functions | Uncovered Lines |
|------|-----------|----------|-----------|-----------------|
| beacon-payload.ts | 100% (11/11) | 100% (12/12) | 100% (2/2) | none |
| beacon.ts | 91.7% (22/24) | 92.9% (13/14) | 100% (1/1) | S:70,72 B:69 |
| breadcrumbs.ts | 94.7% (54/57) | 90% (27/30) | 100% (7/7) | S:56,165,169 B:165,169 |

---

## TASK 1 — beacon.ts: Cover toBeaconPayload failure path (line 69)

**Status**: [ ]

**Gap**: beacon.ts line 69-72 — the `!payloadResult.ok` branch in `beaconError` when `toBeaconPayload()` returns an error. The existing test "returns error when toBeaconPayload fails" at beacon.test.ts:203 passes an empty error code, but this causes `safeParse(CapturedErrorSchema, captured)` to fail on line 47 (before reaching toBeaconPayload). Need to make the CapturedError pass initial validation but still cause `toBeaconPayload` to fail.

**Plan**:
- Mock `toBeaconPayload` via `vi.spyOn` on the imported module to return an error result, ensuring `safeParse(CapturedErrorSchema, captured)` passes (line 47) but `toBeaconPayload` fails (line 69)
- Assert `result.ok === false` and `result.error.code === 'INTERNAL.UNEXPECTED'`

**Files**:
- Edit: `src/beacon.test.ts`

**Verification**: `pnpm --filter @/utils/beacon run qa:test` — new test passes, beacon.ts lines 69-72 covered

---

## TASK 2 — breadcrumbs.ts: Cover extractUrl fallback (line 56) and wrapped fetch error paths (lines 165, 169)

**Status**: [ ]

**Gap**: Three uncovered branches in breadcrumbs.ts:
1. Line 56: `extractUrl` returns `ok(StrSchema, '(unknown)')` when input is not string, URL, or Request — reached when the wrapped fetch receives an exotic input type
2. Line 165: `!urlResult.ok` in the wrapped fetch — when `extractUrl` returns an error (but extractUrl always returns ok, so this is unreachable)
3. Line 169: `!methodResult.ok` in wrapped fetch — when `extractMethod` returns an error (but extractMethod always returns ok, so this is unreachable)

Lines 165 and 169 are defensive guards on internal functions that always return ok. The only coverable branch is line 56 (extractUrl fallback for exotic input types).

**Plan**:
- Add test: call wrapped fetch with an exotic input type (e.g., a number cast to `RequestInfo`) — this triggers extractUrl's fallback `return ok(StrSchema, '(unknown)')` at line 56
- For lines 165/169: these are unreachable because `extractUrl` and `extractMethod` always return ok. Document in a test comment that these are defensive/unreachable branches.

**Files**:
- Edit: `src/breadcrumbs.test.ts`

**Verification**: `pnpm --filter @/utils/beacon run qa:test` — new test passes, breadcrumbs.ts line 56 covered

---

## TASK 3 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No new rules or commands to register — test-only changes
- Verify test files match vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/utils/beacon run qa:test` discovers all 4 test files, no orphaned tests

---

## TASK 4 — Integration Verification

**Status**: [ ]

**Plan**:
- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: Run `git diff --name-only HEAD -- 'packages/shared/utils/beacon/src/*.ts' ':!*.test.ts'` — expect 0 production files modified
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: No new exports introduced, verify export count unchanged from baseline

**Verification**:
- `git diff --name-only` returns no production `.ts` files (only `.test.ts`)
- Export count unchanged from baseline

---

## TASK 5 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @/utils/beacon run qa:test:coverage`
- Verify coverage improved from baseline

**Verification**: All pnpm commands exit 0, coverage at or near 100%

---

## TASK 6 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all test files exist and pass
- Verify coverage improved (target: S/B/F/L all >= 96%)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions — existing 55 tests still pass
- Commit with descriptive message

**Verification**:
- Test count >= 57 (baseline 55 + ~2 new)
- All coverage metrics improved
- `pnpm --filter @/utils/beacon run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | beacon.ts toBeaconPayload failure path | -- |
| 2 | breadcrumbs.ts extractUrl fallback + defensive guards | -- |
| 3 | Register rules + config | 1-2 |
| 4 | Integration verification | 3 |
| 5 | Full QA + Coverage | 4 |
| 6 | Final verification + commit | 5 |
