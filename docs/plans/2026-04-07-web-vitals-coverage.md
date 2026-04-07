# Web-Vitals Package — Near-100% Test Coverage

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/utils/web-vitals` (`packages/shared/utils/web-vitals/src/`)
**Goal**: Raise coverage from S:92.41% B:83.89% F:93.1% L:94.71% to near-100% by covering uncovered branches across 5 files.
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
| Tests | 165 total (165 pass, 7 test files) |
| Statements | 92.41% (512/554) |
| Branches | 83.89% (224/267) |
| Functions | 93.1% (54/58) |
| Lines | 94.71% (466/492) |
| Thresholds | S:80% B:75% F:80% L:80% |

### Per-file breakdown

| File | Stmts | Branches | Funcs | Uncovered Lines |
|------|-------|----------|-------|-----------------|
| perfume.ts | 100% | 100% | 100% | none |
| vitals-panel-store.svelte.ts | 100% | 100% | 100% | none |
| vitals-beacon.ts | 51/52 | 21/22 | 8/8 | S:176 B:176 |
| vitals-logger.ts | 52/54 | 27/31 | 3/3 | S:103,118 B:102,117,216,217 |
| vitals-payload.ts | 30/34 | 14/18 | 2/2 | S:171,175,179,186 B:171,175,179,186 |
| connection.svelte.ts | 79/81 | 23/26 | 16/16 | S:116,196 B:116,196 |
| vitals-diagnostics.ts | 277/310 | 129/160 | 21/25 | many (see tasks) |

---

## TASK 1 — vitals-diagnostics.ts: Cover PerformanceObserver callbacks (4 uncovered functions)

**Status**: [x]

**Gap**: setupDiagnosticObservers creates 4 PerformanceObserver instances with callbacks (lines 784-789 LCP, 802-808 CLS, 820-828 longtask, 838-850 event timing). In the test env, PerformanceObserver doesn't fire so these 4 anonymous functions are never executed. Also: each observer has a try/catch where the catch (lines 796, 814, 832, 853) is uncovered.

**Plan**:
- Mock `PerformanceObserver` constructor to capture the callback, then invoke it with mock entries
- The mock should call `callback({ getEntries: () => [...mockEntries] })` to trigger the observer body
- For the event timing observer, include entries with interactionId=0 (filtered out) and interactionId>0 (kept) to cover the filter branch at line 843
- Add a separate test where the PerformanceObserver constructor throws for each observer type to cover the 4 catch blocks (lines 796, 814, 832, 853)
- Assert that after the observer fires, the injected data is reflected in collectDiagnostics output

**Files**:
- Edit: `src/vitals-diagnostics.test.ts`

**Verification**: `pnpm --filter @/utils/web-vitals run qa:test` — new tests pass, 4 previously uncovered functions now covered

---

## TASK 2 — vitals-diagnostics.ts: Cover remaining diagnostic branches

**Status**: [x]

**Gap**: Multiple uncovered branches in diagnostic helpers:
1. Line 217: describeElement fallback `<tag>` — element with no id and no className
2. Line 213: describeElement className not a string (SVG element where className is SVGAnimatedString)
3. Line 229: describeNode for non-Element node (Text node in CLS sources)
4. Line 251: shortenUrl error path — LCP entry with malformed URL triggers err
5. Line 316-318: diagnoseLCP catch block
6. Line 336: diagnoseCLS empty entries path (true branch)
7. Line 393-395: diagnoseCLS catch block
8. Line 554-556: diagnoseFCP catch block
9. Line 754: getThresholds with invalid input (non-string)
10. Lines 894, 916, 938, 960: _inject* error paths (pass non-array)

**Plan**:
- Add test: LCP element with no id and empty className → `<tag>` output (covers line 217)
- Add test: LCP element with className as object (SVG-like) → `<tag>` output (covers line 213 false branch)
- Add test: CLS source with Text node (not instanceof Element) → `[#text]` output (covers line 229)
- Add test: LCP entry with malformed URL (e.g. `'not://valid url\x00'`) — shortenUrl returns err, but diagnoseLCP uses fallback url (covers line 251)
- Add test: inject LCP entries that throw on property access → covers diagnoseLCP catch (lines 316-318)
- Add test: collectDiagnostics('CLS', 0.3, 'poor') with no injected entries → covers line 336 true branch
- Add test: inject layout shift entry that throws on property access → covers diagnoseCLS catch (lines 393-395)
- Add test: mock performance.getEntriesByType to throw only for 'resource' → covers diagnoseFCP catch (lines 554-556)
- Add test: `getThresholds(123 as unknown as Str)` → covers line 754
- Add tests: `_injectLCPEntries('bad')`, `_injectLayoutShiftEntries('bad')`, `_injectLongTasks('bad')`, `_injectEventTimings('bad')` → covers lines 894, 916, 938, 960

**Files**:
- Edit: `src/vitals-diagnostics.test.ts`

**Verification**: `pnpm --filter @/utils/web-vitals run qa:test` — new tests pass, vitals-diagnostics.ts branches coverage significantly improved

---

## TASK 3 — vitals-beacon.ts: Cover safeStringify failure (line 176)

**Status**: [x]

**Gap**: vitals-beacon.ts line 176 — `if (!jsonResult.ok) return jsonResult;` in flushVitals when `safeStringify` returns an error. Uncovered because safeStringify only fails on circular references or extremely large payloads.

**Plan**:
- Mock `safeStringify` via `vi.spyOn` on the imported `@/utils/core/object` module to return an error result for one call
- Queue a metric, set device info, call flushVitals — assert result.ok is false
- Verify sendBeacon was NOT called (stringify failed before beacon)

**Files**:
- Edit: `src/vitals-beacon.test.ts`

**Verification**: `pnpm --filter @/utils/web-vitals run qa:test` — new test passes, vitals-beacon.ts line 176 covered

---

## TASK 4 — vitals-logger.ts: Cover unknown rating fallback (lines 216-217)

**Status**: [x]

**Gap**: vitals-logger.ts lines 216-217 — `RATING_ICONS[rating] ?? '?'` and `RATING_STYLES[rating] ?? vitalsStyles.reset` fallback when rating is not 'good', 'needsImprovement', or 'poor'. Never tested because all tests use known ratings.

**Plan**:
- Add test in dev mode: `logVital('LCP', 100, 'custom-rating', null)` — the format string should contain '?' icon and use reset style
- Assert console.log was called (dev mode, non-poor rating)
- Assert format string contains '?' and 'custom-rating'

**Files**:
- Edit: `src/vitals-logger.test.ts`

**Verification**: `pnpm --filter @/utils/web-vitals run qa:test` — new test passes, vitals-logger.ts lines 216-217 covered

---

## TASK 5 — vitals-payload.ts: Cover defensive validation branches (lines 171, 175, 179, 186)

**Status**: [x]

**Gap**: vitals-payload.ts has 4 uncovered defensive error branches in toVitalsPayload:
- Line 171: `if (!sessionIdResult.ok)` — crypto.randomUUID returns invalid UUID
- Line 175: `if (!urlResult2.ok)` — stripped URL fails RelativeUrlSchema
- Line 179: `if (!timestampResult.ok)` — Date.toISOString returns invalid
- Line 186: `if (!timestampResult.ok)` — same timestamp check

These are hard to trigger because `crypto.randomUUID()` always returns a valid UUID, `Date.toISOString()` always returns valid ISO, and stripped URLs from valid paths pass RelativeUrlSchema. The approach: mock `crypto.randomUUID` and `Date.prototype.toISOString` to return invalid values.

**Plan**:
- Add test: mock `crypto.randomUUID` to return `'not-a-uuid'` → covers line 171
- Add test: pass url=`''` (empty string) — after stripUrlParams, result is `''` which may fail RelativeUrlSchema → covers line 175 (if RelativeUrlSchema rejects empty string)
- Add test: mock `Date.prototype.toISOString` to return `'invalid'` → covers line 179/186

**Files**:
- Edit: `src/vitals-payload.test.ts`

**Verification**: `pnpm --filter @/utils/web-vitals run qa:test` — new tests pass, vitals-payload.ts coverage improved

---

## TASK 6 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules or commands to register — test-only changes
- Verify test files match vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/utils/web-vitals run qa:test` discovers all 7 test files, no orphaned tests

---

## TASK 7 — Integration Verification

**Status**: [x]

**Plan**:
- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: Run `git diff --name-only HEAD -- 'packages/shared/utils/web-vitals/src/*.ts' ':!*.test.ts'` — expect 0 production files modified
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: No new exports introduced, verify export count unchanged from baseline

**Verification**:
- `git diff --name-only` returns no production `.ts` files (only `.test.ts`)
- Export count unchanged from baseline

---

## TASK 8 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @/utils/web-vitals run qa:test:coverage`
- Verify coverage improved from baseline

**Verification**: All pnpm commands exit 0, coverage at or near 100%

---

## TASK 9 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all test files exist and pass
- Verify coverage improved (target: S/B/F/L all improved from baseline)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions — existing 165 tests still pass
- Commit with descriptive message

**Verification**:
- Test count >= 180 (baseline 165 + ~15 new)
- All coverage metrics improved from baseline
- `pnpm --filter @/utils/web-vitals run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | vitals-diagnostics.ts observer callbacks (4 funcs) | -- |
| 2 | vitals-diagnostics.ts remaining branches | 1 |
| 3 | vitals-beacon.ts safeStringify failure | -- |
| 4 | vitals-logger.ts unknown rating fallback | -- |
| 5 | vitals-payload.ts defensive validation | -- |
| 6 | Register rules + config | 1-5 |
| 7 | Integration verification | 6 |
| 8 | Full QA + Coverage | 7 |
| 9 | Final verification + commit | 8 |
