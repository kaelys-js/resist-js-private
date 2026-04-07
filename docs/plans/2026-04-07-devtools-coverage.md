# Devtools Package — Raise Test Coverage to Pass All Thresholds

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/utils/devtools` (`packages/shared/utils/devtools/src/`)
**Goal**: Raise test coverage to pass all four thresholds (S:80% B:75% F:80% L:80%) with test-only changes.
**Architecture**: Vitest + jsdom + Svelte 5 runes; mock stores (AppStoreContract, DebugStoreContract); console spies; Result<T> pattern.

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
| Tests | 137 total (137 pass, 9 test files) |
| Statements | 73.28% (332/453) — need 80% (+31) |
| Branches | 62.18% (125/201) — need 75% (+26) |
| Functions | 62.02% (49/79) — need 80% (+14) |
| Lines | 74.76% (320/428) — need 80% (+23) |
| Thresholds | S:80% B:75% F:80% L:80% |

### Per-file breakdown

| File | Stmts | Branches | Funcs | Key Gaps |
|------|-------|----------|-------|----------|
| devtools-api.svelte.ts | 117/188 | 37/79 | 18/35 | 17 uncovered fns, 42 uncovered branches |
| init.svelte.ts | 60/85 | 16/35 | 6/11 | logWelcomeBanner, isRecognizedOverrideKey |
| state-logger.svelte.ts | 2/25 | 0/4 | 1/9 | Nearly entirely uncovered |
| dev-toolbar-registry.ts | 51/51 | 24/30 | 10/10 | 6 uncovered branches |
| debug-state-store.svelte.ts | 45/46 | 22/24 | 7/7 | 2 uncovered branches |
| console-styles.ts | 18/19 | 8/9 | 2/2 | 1 uncovered branch |
| url-params.ts | 35/35 | 18/20 | 5/5 | 2 uncovered branches |

---

## TASK 1 — devtools-api.svelte.ts: Cover Uncovered Functions and Key Branches

**Status**: [ ]

**Gap**: 17 uncovered functions, 42 uncovered branches, 71 uncovered statements — the largest coverage gap by far.

**Plan**:

Mock setup: add `vi.mock('./state-logger.svelte', ...)` for `createWatcher` (returns `vi.fn()`). Add `vi.mock('@/utils/web-vitals/vitals-diagnostics', ...)` for `formatThresholds`.

Tests to add:
- **Mutation methods**: `setMode('dark')`, `setLocale('ja')`, `setSidebarOpen(false)` — verify setter calls. Also test with store missing the setter (typeof guard false branch)
- **`set()` branches**: `set('app.unknownKey', v)` (no setter), `set('debug.enabled', true)`, `set('features.unknownFlag', true)` (not in featureKeys), `set('unknownSection.key', v)` (falls through)
- **`logState()`**: verify console.log called with state entries
- **`logFeatures()`**: verify console.table called
- **`registerWatcher`/`unregisterWatcher`**: register, re-register (cleanup called), unregister, unregister nonexistent
- **`toString()`/`Symbol.toStringTag`**: verify string representation
- **`resetToDefaults()`**: verify each app setter called with schema defaults
- **`resetAllToDefaults()`**: verify calls resetToDefaults + feature flags + logLevel
- **`copyDebugUrl()` success**: mock `navigator.clipboard.writeText`, verify called
- **`copyDebugUrl()` failure**: mock clipboard to reject, verify console fallback
- **`login()`/`logout()`**: mock window.location, verify config.goto calls
- **`perf.logVitals()` empty**: mock returns empty array, verify "No Web Vitals" message
- **`perf.logVitals()` with data**: mock returns metrics with diagnostics, timing/non-timing, findings with/without label
- **`perf.logDevice()` error**: mock getConnectionSnapshot returns error, verify early return
- **Perf error paths**: `vitals()` returns `[]`, `beacon()` returns fallback, `device()` returns fallback
- **`destroy()` with watchers**: register watchers, call destroy, verify cleanups called

**Files**:
- Edit: `src/devtools-api.svelte.test.ts`

**Verification**: `pnpm --filter @/utils/devtools run qa:test` — new tests pass, devtools-api coverage significantly improved

---

## TASK 2 — init.svelte.ts: Cover Welcome Banner and Helper Functions

**Status**: [ ]

**Gap**: 5 uncovered functions, 19 uncovered branches, 25 uncovered statements. logWelcomeBanner, isRecognizedOverrideKey, buildKVBlock all uncovered.

**Plan**:

Add console spies: `console.groupCollapsed`, `console.groupEnd`, `console.warn`.

Tests to add:
- **Build info group**: verify `console.groupCollapsed` called with "Build" content
- **URL overrides — recognized + unknown**: store with `urlOverrides: { debug: 'true', theme: 'midnight', unknownKey: 'val' }` — verify "URL Overrides" group, warn for unknown key
- **URL overrides — ff.* prefix**: `urlOverrides: { 'ff.settings': 'false' }` — covers startsWith(FF_PREFIX) and isValidFeatureFlag
- **URL overrides — logLevel**: `urlOverrides: { logLevel: 'trace' }` — covers `key === 'logLevel'` branch
- **No URL overrides**: empty urlOverrides — verify no "URL Overrides" group
- **Log level hints**: with logLevel 'debug'/'trace' — verify "State change logging active"; with 'info' — verify tip message
- **Build info error path**: mock `getBuildInfo` to return error — verify fallback

**Files**:
- Edit: `src/init.svelte.test.ts`

**Verification**: `pnpm --filter @/utils/devtools run qa:test` — new tests pass, init.svelte.ts coverage improves

---

## TASK 3 — state-logger.svelte.ts: Cover createWatcher, createStateLogger, logChange

**Status**: [ ]

**Gap**: 8 uncovered functions, 4 uncovered branches, 23 uncovered statements. Only shouldLog and LOG_LEVEL_PRIORITY tested.

**Plan**:

The test file is `.svelte.test.ts` so Svelte runes are available. Use `flushSync` from `'svelte'` to trigger effects.

Tests to add:
- **createWatcher basic**: create with `$state` source, verify returns cleanup function
- **createWatcher change detection**: mutate source, flushSync, verify console.groupCollapsed with store/section name and old/new values
- **createWatcher log level gating**: logLevel 'warn' suppresses debug-level logging — no console output on mutation
- **createWatcher no changes**: getter returns same values — no logChange called
- **createStateLogger**: pass multiple sections, verify destroy() callable
- **createStateLogger default storeName**: omit storeName, verify default 'Store' used
- **logChange format**: verify console.log called with "old:" and "new:" styled arguments

**Files**:
- Edit: `src/state-logger.svelte.test.ts`

**Verification**: `pnpm --filter @/utils/devtools run qa:test` — new tests pass, state-logger.svelte.ts coverage jumps from ~8% to ~80%+

---

## TASK 4 — Tail Coverage: Minor Branch Gaps in 4 Remaining Files

**Status**: [ ]

**Gap**: 11 uncovered branches across 4 otherwise well-covered files.

**Plan**:

**dev-toolbar-registry.ts** (6 branches):
- `introspectEntry` with raw entry NOT wrapped in optional — covers bypass of optional unwrap
- `introspectEntry` with top-level pipe (no optional wrapper) — covers pipe unwrap
- `generateDebugUrl` without explicit baseUrl — covers `window.location.href` path
- `generateDebugUrl` with flag value differing from default — covers `current !== flag.default`

**debug-state-store.svelte.ts** (2 branches):
- `load()` where localStorage.getItem throws — covers catch block
- `save()`/`load()` without storageKey — covers `!_storageKey` early return

**console-styles.ts** (1 branch):
- `diffSnapshot` with two different object instances that JSON-serialize identically — covers `JSON.stringify(oldVal) === JSON.stringify(newVal)` true

**url-params.ts** (2 branches):
- `applyUrlOverrides` with `sidebarOpen: 'true'` — covers `value === 'true'` true path
- `applyUrlOverrides` with `mockDataDelay: 'abc'` — covers `Number(value) || 0` fallback

**Files**:
- Edit: `src/dev-toolbar-registry.test.ts`
- Edit: `src/debug-state-store.svelte.test.ts`
- Edit: `src/console-styles.test.ts`
- Edit: `src/url-params.test.ts`

**Verification**: `pnpm --filter @/utils/devtools run qa:test` — all tests pass

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No new rules or commands to register — test-only changes
- Verify test files match vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/utils/devtools run qa:test` discovers all 9 test files, no orphaned tests

---

## TASK 6 — Integration Verification

**Status**: [ ]

**Plan**:
- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: N/A — no new config settings
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: No new exports introduced, verify export count unchanged from baseline

**Verification**:
- `git diff --name-only` returns no production `.ts` files (only `.test.ts`)
- Export count unchanged from baseline

---

## TASK 7 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @/utils/devtools run qa:test:coverage`
- Verify all 4 coverage thresholds pass

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 8 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all test files exist and pass
- Verify coverage meets thresholds (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions — existing 137 tests still pass
- Commit with descriptive message

**Verification**:
- Test count >= 175 (baseline 137 + ~38 new)
- All coverage metrics pass thresholds
- `pnpm --filter @/utils/devtools run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | devtools-api.svelte.ts uncovered functions/branches | -- |
| 2 | init.svelte.ts welcome banner + helpers | -- |
| 3 | state-logger.svelte.ts watcher/logger coverage | -- |
| 4 | Tail coverage: 4 remaining files | -- |
| 5 | Register rules + config | 1-4 |
| 6 | Integration verification | 5 |
| 7 | Full QA + Coverage | 6 |
| 8 | Final verification + commit | 7 |
