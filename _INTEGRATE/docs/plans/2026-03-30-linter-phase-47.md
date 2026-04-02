# @/lint Phase 47 — Cache Correctness & Default Enablement

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Fix the finalize()/cache correctness bug (stale cross-file results), then enable `--cache` by default so every lint run benefits from incremental caching.
**Architecture**: `LintCache` (framework/cache.ts) stores per-file MD5 hashes + lint results. On cache hit, `check()` is skipped. Rules with `finalize()` need cross-file state from `check()` calls — cache must not break this.

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
| Tests | 4829 total |
| Cache default | OFF (requires `--cache` flag) |
| finalize() rules | 1 (`valibot/no-duplicate-schema`) |
| Cache correctness | BUG: finalize() results cached per-file, stale on partial cache |

---

## TASK 1 — Fix finalize() cache correctness bug

**Status**: [x]

**Bug**: When `--cache` hits for a file, `check()` is skipped entirely (`cli-helpers.ts:1067`). Rules with `finalize()` (e.g. `valibot/no-duplicate-schema`) accumulate cross-file state during `check()` — skipping it means `finalize()` has incomplete data. Additionally, finalize() results get stored in per-file cache entries and become stale when other files change.

**Fix**:
- Detect which TypeScript rules have `finalize` defined
- On cache hit: return cached results for non-finalize rules, but still run `check()` for finalize-enabled rules to populate their cross-file state
- When storing to cache: exclude results from finalize() (they're cross-file aggregations that can't be correctly cached per-file)
- Write tests: finalize rule with cache produces correct results on partial cache hit

**Files**:
- Modify: `src/cli-helpers.ts`
- Test: `src/cli-run-linter-2.test.ts`

**Verification**: Tests pass, finalize+cache scenario tested

---

## TASK 2 — Enable --cache by default

**Status**: [x]

**Change**: Default `cache` to `true` in `parseCliArgs`. `--no-cache` explicitly disables. Update help text to reflect new default.

**Files**:
- Modify: `src/cli-helpers.ts` — change default from `false` to `true`
- Modify: `src/locale/locales/en.ts` — update flag descriptions
- Test: `src/cli-helpers.test.ts` — update parseCliArgs tests
- Test: `src/cli-run-linter-1.test.ts` — update cache flag tests

**Verification**: Tests pass, `--cache` is default behavior

---

## TASK 3 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules in this phase — verify existing cache-related config is correct
- Verify root `package.json` `qa:lint` script works with new cache-by-default behavior
- Verify `.resist-lint.jsonc` needs no changes

**Files**:
- Verify: `package.json`
- Verify: `.resist-lint.jsonc`

**Verification**: `pnpm -w run qa:lint` uses cache by default, config unchanged

---

## TASK 4 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 5 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify finalize+cache test covers stale-data scenario
- Verify `--cache` is default, `--no-cache` disables
- Verify no regressions in test count (≥ 4829 + new tests)
- Commit with descriptive message

**Verification**:
- Cache tests pass with finalize correctness
- Default behavior confirmed
- Test count ≥ baseline + new tests

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix finalize() cache correctness | — |
| 2 | Enable --cache by default | 1 |
| 3 | Register Rules + Config | 2 |
| 4 | Full QA + Coverage | 3 |
| 5 | Final verification + commit | 4 |
