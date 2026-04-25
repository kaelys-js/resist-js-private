# Locale Package — Coverage to Passing Thresholds

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/locale` (`packages/shared/locale/src/`)
**Goal**: Raise coverage from 70%/56%/82%/70% to passing thresholds (80%/75%/80%/80%) or near 100%.
**Architecture**: Test-only changes. Add tests to existing test files exercising uncovered branches, error paths, and edge cases. No production code modifications.

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
| Tests | 317 total (317 pass, 8 test files) |
| Statements | 70.59% (1066/1510) |
| Branches | 56.55% (535/946) |
| Functions | 82.17% (83/101) |
| Lines | 70.55% (1064/1508) |
| Thresholds | S:80% B:75% F:80% L:80% |

### Per-file breakdown

| File | Statements | Branches | Functions |
|------|-----------|----------|-----------|
| template.ts | 60.8% | 46.8% | 78.4% |
| direction.ts | 57.6% | 36.7% | 100% |
| registry.ts | 82.4% | 66.1% | 95.2% |
| format.ts | 83.3% | 71.4% | 94.4% |
| display.ts | 83.9% | 72.2% | 100% |
| detect.ts | 89.3% | 79.5% | 100% |
| og.ts | 87.5% | 66.7% | 100% |
| t.ts | 85.7% | 75.0% | 100% |
| svelte.svelte.ts | 0% | 0% | 0% |

---

## TASK 1 — template.ts: Range, SelectOrdinal, MessageRef, and Formatter Gaps

**Status**: [ ]

**Gap**: template.ts has the biggest gap (60.8% S, 46.8% B). Entire subsystems untested: range blocks, selectordinal blocks, message references (`@:key`), title formatter, number skeleton/style in replaceNumberBlocks, time formatting in replaceDateTimeBlocks, depth limit, and array context substitution in buildLocaleEntries.

**Plan**:
- Add tests for range blocks: `{count, range, (0-5){low}(6-inf){high}}` syntax, exact range, 'inf' keyword, no-match fallback, malformed range
- Add tests for selectordinal blocks: `{count, selectordinal, one{st}two{nd}few{rd}other{th}}` with `#` replacement
- Add tests for message references: `@:greeting` and `@.upper:greeting` with resolver function, depth limit (>10 nesting), missing modifier
- Add test for title formatter: `{name|title}` pipe syntax
- Add test for capitalize with empty string (line 297-299)
- Add tests for number styles in replaceNumberBlocks: `{n, number, percent}`, `{n, number, ::compact-short}` skeleton
- Add tests for time formatting: `{when, time, short}`, `{when, time, medium}`
- Add tests for date/time skeleton: `{when, date, ::yMd}` skeleton syntax
- Add test for renderMessageInternal depth limit exceeded (>10 nested blocks)
- Add test for formatter application failure in renderMessage pipe chain
- Add tests for buildLocaleEntries: array element processing with context, param validation error path
- Add test for parsePluralBranches: malformed body, unclosed braces, offset parsing

**Files**:
- Edit: `src/template.test.ts`

**Verification**: `pnpm --filter @/locale run qa:test` — all new tests pass, template.ts coverage significantly increased

---

## TASK 2 — direction.ts: Intl.Locale Fallback Paths

**Status**: [ ]

**Gap**: direction.ts is at 57.6% S / 36.7% B. The Intl.Locale.getTextInfo() method path, Safari textInfo property path, and Intl.Locale constructor exception path are all uncovered.

**Plan**:
- Mock `Intl.Locale` to test getTextInfo() method path returning `{ direction: 'rtl' }` and `{ direction: 'ltr' }`
- Mock `Intl.Locale` with `textInfo` property (Safari path) returning `{ direction: 'rtl' }`
- Mock `Intl.Locale` constructor to throw (falls through to static lookup)
- Test getTextInfo() method that throws (falls through to textInfo property or static lookup)
- Test textInfo property with invalid data (safeParse fails)

**Files**:
- Edit: `src/direction.test.ts`

**Verification**: `pnpm --filter @/locale run qa:test` — direction.ts coverage increased significantly

---

## TASK 3 — registry.ts: Non-strict Merge, Namespace, and Error Paths

**Status**: [ ]

**Gap**: registry.ts at 82.4% S / 66.1% B. Untested: nested object merging in mergeLocaleKeys, buildLocale error propagation, namespace sub-registry creation failure, namespace list with empty registries, setActive error propagation.

**Plan**:
- Add test for mergeLocaleKeys with nested objects (schema with nested strictObject)
- Add test for mergeLocaleKeys recursive merge error
- Add test for createLocaleRegistry buildLocale failure propagation
- Add test for registry.t() when active locale is missing from built map (state invariant)
- Add test for set() when buildLocale fails
- Add test for createNamespacedRegistry: namespace name validation failure
- Add test for createNamespacedRegistry: sub-registry creation failure
- Add test for namespaced setActive error propagation
- Add test for namespaced list with empty registries
- Add test for namespaced addNamespace creation failure

**Files**:
- Edit: `src/registry.test.ts`

**Verification**: `pnpm --filter @/locale run qa:test` — registry.ts coverage increased

---

## TASK 4 — format.ts: Intl Exception Paths and Edge Cases

**Status**: [ ]

**Gap**: format.ts at 83.3% S / 71.4% B. All Intl constructor/format catch blocks untested. formatDisplayName undefined return untested. DurationFormat availability check untested. group-min2 skeleton token untested.

**Plan**:
- Add tests for Intl.NumberFormat exception (mock to throw in formatNumber catch block)
- Add tests for Intl.DateTimeFormat exception (mock to throw in formatDate catch block)
- Add test for Intl.DateTimeFormat exception in formatTime
- Add test for Intl.RelativeTimeFormat exception in formatRelativeTime
- Add test for Intl.ListFormat exception in formatList
- Add test for formatDateRange exception
- Add test for formatDisplayName with code returning undefined
- Add test for formatDisplayName exception
- Add test for formatDuration when Intl.DurationFormat unavailable
- Add test for formatDuration exception
- Add test for parseNumberSkeleton group-min2 token
- Add test for styleToOptions with invalid style (fallback to medium via ??)

**Files**:
- Edit: `src/format.test.ts`

**Verification**: `pnpm --filter @/locale run qa:test` — format.ts coverage increased

---

## TASK 5 — display.ts, og.ts, t.ts: Remaining Edge Cases

**Status**: [ ]

**Gap**: display.ts line 109 (null display names), line 159 (loop error). og.ts line 78 (schema validation). t.ts line 35 (fallback validation failure).

**Plan**:
- display.ts: Add test for Intl.DisplayNames returning undefined for a code (mock DisplayNames.of to return undefined)
- display.ts: Add test for getLanguageDisplayNames mid-loop failure
- og.ts: Add test for safeParse of MaximizedLocaleDataSchema failing (mock Intl.Locale maximize to return invalid data)
- t.ts: Add test for t() with non-string fallback that fails StrSchema validation (e.g., number cast)

**Files**:
- Edit: `src/display.test.ts`
- Edit: `src/og.test.ts`
- Edit: `src/t.test.ts`

**Verification**: `pnpm --filter @/locale run qa:test` — all three files' coverage increased

---

## TASK 6 — svelte.svelte.ts: Cover Store Reactivity

**Status**: [ ]

**Gap**: svelte.svelte.ts is at 0% (completely uncovered). Tests exist in svelte.svelte.test.ts but only run under `--project locale-svelte` (jsdom + Svelte plugin), NOT under `--project locale`. The qa:test:coverage script only runs `--project locale`.

**Plan**:
- Update package.json qa:test:coverage to run BOTH projects: `pnpm -w exec vitest run --project locale --project locale-svelte --coverage`
- Add tests for createLocaleStore error paths: registry.active() failure, registry.t() failure
- Add tests for setLocale error paths: invalid code (safeParse fails), setActive fails, registry.t() fails after setActive
- Add tests for set() when updating active locale (code === currentLocale path, line 188)
- Add tests for set() when registry.set() fails

**Files**:
- Edit: `src/svelte.svelte.test.ts`
- Edit: `package.json` (qa:test:coverage script only)

**Verification**: `pnpm --filter @/locale run qa:test:coverage` — svelte.svelte.ts shows significant coverage

---

## TASK 7 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No new rules or commands to register — test-only changes
- Verify test files match vitest config include pattern (`src/**/*.test.ts` and `src/**/*.svelte.test.ts`)
- Verify package.json qa:test:coverage includes both locale and locale-svelte projects
- No production code changes — no new exports to register

**Verification**: All test files discovered by vitest, no orphaned tests

---

## TASK 8 — Integration Verification

**Status**: [ ]

**Plan**:
- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: Run `git diff --name-only HEAD -- 'packages/shared/locale/src/*.ts' ':!*.test.ts'` — expect 0 production files modified (only package.json allowed)
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: No new exports introduced, verify export count unchanged from baseline

**Verification**:
- `git diff --name-only` returns no production `.ts` files (only `.test.ts` and `package.json`)
- Export count unchanged from baseline
- `pnpm --filter @/locale run qa:test` exits 0

---

## TASK 9 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @/locale run qa:test:coverage`
- Verify coverage exceeds thresholds: Statements >= 80%, Branches >= 75%, Functions >= 80%, Lines >= 80%

**Verification**: All pnpm commands exit 0, coverage meets or exceeds all 4 thresholds

---

## TASK 10 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all test files exist and pass
- Verify all coverage thresholds met (S:80% B:75% F:80% L:80%)
- Verify no production source files modified (only .test.ts files + package.json)
- Verify no regressions — existing 317 tests still pass
- Commit with descriptive message

**Verification**:
- Test count >= 400 (baseline 317 + ~80-100 new)
- All 4 coverage thresholds exceeded
- `pnpm --filter @/locale run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | template.ts range/ordinal/ref/formatter gaps | -- |
| 2 | direction.ts Intl.Locale fallback paths | -- |
| 3 | registry.ts merge/namespace/error paths | -- |
| 4 | format.ts Intl exception paths | -- |
| 5 | display.ts, og.ts, t.ts edge cases | -- |
| 6 | svelte.svelte.ts store coverage | -- |
| 7 | Register rules + config | 1-6 |
| 8 | Integration verification | 7 |
| 9 | Full QA + Coverage | 8 |
| 10 | Final verification + commit | 9 |
