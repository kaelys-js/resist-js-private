# Config/Tooling/VSCode Coverage — Cover All Uncovered Branches

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/src/`)
**Goal**: Cover all remaining uncovered branches in source files, raising coverage from ~94/83/88/94% toward 100%.
**Architecture**: Test-only changes. Add tests to existing test files exercising error branches, guard clauses, and edge-case conditional paths. No production code modifications.

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
| Tests | 748 total (748 pass, 38 test files) |
| Statements | 93.73% (1779/1898) |
| Branches | 83.24% (805/967) |
| Functions | 88.12% (334/379) |
| Lines | 94.21% (1759/1867) |

---

## TASK 1 — Lint Feature Edge Cases

**Status**: [ ]

**Gap**: 11 lint-layer source files contain uncovered error/edge branches (~40 lines): code-actions.ts, code-lens.ts, commands.ts, diagnostic-filter.ts, diff-preview.ts, fix-on-save.ts, hover.ts, import-sorting.ts, per-folder.ts, stage-indicator.ts, stale-cleanup.ts.

**Plan**:
- Add tests for exception catch blocks: code-actions.ts:95-103 (mock positionAt to throw), code-actions.ts:143 (Fix all catch)
- Add test for object-type diagnostic code: code-lens.ts:65-67 (code as `{ value, target }` object)
- Add tests for command execution paths: commands.ts:98-100 (applyEdit fails), commands.ts:233 (filter command), commands.ts:238-239 (clear filter), commands.ts:244 (stage change)
- Add tests for non-resist diagnostic handling: diagnostic-filter.ts:70, 94-110, 143 (foreign source skip, category matching, preservation)
- Add tests for diff-preview edge cases: diff-preview.ts:131 (no editor), 147-148 (no fixes log), 152-154 (diff command)
- Add test for timer cleanup: fix-on-save.ts:40-44 (vi.useFakeTimers, advance past threshold)
- Add tests for hover edge cases: hover.ts:48 (position outside range), 71 (empty matching), 136-137 (object code)
- Add tests for import-sorting: import-sorting.ts:36 (non-resist filter), 99 (no imports log), 133 (success log)
- Add test for per-folder fallback: per-folder.ts:44 (no workspace folder log)
- Add test for stage change logging: stage-indicator.ts:80 (channel log on change)
- Add tests for stale cleanup: stale-cleanup.ts:56 (double-start guard), 63 (timer callback)

**Files**:
- Edit: `src/lint/code-actions.test.ts`
- Edit: `src/lint/code-lens.test.ts`
- Edit: `src/lint/commands.test.ts`
- Edit: `src/lint/diagnostic-filter.test.ts`
- Edit: `src/lint/diff-preview.test.ts`
- Edit: `src/lint/fix-on-save.test.ts`
- Edit: `src/lint/hover.test.ts`
- Edit: `src/lint/import-sorting.test.ts`
- Edit: `src/lint/per-folder.test.ts`
- Edit: `src/lint/stage-indicator.test.ts`
- Edit: `src/lint/stale-cleanup.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test` — all new tests pass, uncovered lines confirmed covered

---

## TASK 2 — Shared Infrastructure Edge Cases

**Status**: [ ]

**Gap**: 11 shared-layer source files contain uncovered guard clauses, error paths, and conditional branches (~30 lines): config.ts, diagnostics.ts, events.ts, file-watcher.ts, lifecycle.ts, notifications.ts, output.ts, runner.ts, state.ts, status-bar.ts, workspace.ts.

**Plan**:
- Add tests for config change logging: config.ts:89-123 (channel log on refresh, no-channel branch)
- Add tests for invalid diagnostic entries: diagnostics.ts:113-125 (missing message/line with and without channel), 130 (default severity fallback)
- Add test for event dispatch without channel: events.ts:189
- Add tests for file watcher disposal: file-watcher.ts:114-116 (dispose with undefined timer), 170 (batched watcher dispose mid-batch)
- Add tests for lifecycle disposal errors: lifecycle.ts:69-89 (resource throws during dispose, summary log)
- Add test for notification suppression logging: notifications.ts:68 (throttled suppression with channel)
- Add test for unmapped severity: output.ts:159 (Information/Hint severity else clause)
- Add tests for double-settle guards: runner.ts:75 (runTool), 206 (runToolJson)
- Add tests for observer removal: state.ts:125 (splice), 163 (ID cleanup)
- Add test for disabled state tooltip: status-bar.ts:252
- Add tests for workspace cache: workspace.ts:117, 122 (negative cache), 177-185 (per-folder fallback)

**Files**:
- Edit: `src/shared/config.test.ts`
- Edit: `src/shared/diagnostics.test.ts`
- Edit: `src/shared/events.test.ts`
- Edit: `src/shared/file-watcher.test.ts`
- Edit: `src/shared/lifecycle.test.ts`
- Edit: `src/shared/notifications.test.ts`
- Edit: `src/shared/output.test.ts`
- Edit: `src/shared/runner.test.ts`
- Edit: `src/shared/state.test.ts`
- Edit: `src/shared/status-bar.test.ts`
- Edit: `src/shared/workspace.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test` — all new tests pass

---

## TASK 3 — Provider and Rules Viewer Edge Cases

**Status**: [ ]

**Gap**: provider.ts has 4 uncovered lines (243, 447, 629, 638). rules-viewer.ts has uncovered regions (146-150, 239, 247).

**Plan**:
- Add test for workspace-not-found logging: provider.ts:243 (resolveWorkspace returns undefined)
- Add test for skipped entry error logging: provider.ts:447 (invalid entry triggers logError)
- Add test for fallback diagnostic creation: provider.ts:629 (createDiagnosticFromEntry returns undefined)
- Add test for clickable code with URL: provider.ts:638 (entry with ruleId + url)
- Add test for case-insensitive category/stage parsing: rules-viewer.ts:146-150 (lowercase `categories:`)
- Add test for category collection in render: rules-viewer.ts:239 (multi-category rules)
- Add test for filter option HTML generation: rules-viewer.ts:247

**Files**:
- Edit: `src/lint/provider.test.ts`
- Edit: `src/lint/rules-viewer.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test` — provider and rules-viewer lines confirmed covered

---

## TASK 4 — Panel and Tree View Edge Cases

**Status**: [ ]

**Gap**: panel.ts lines 203-204; tree-data-provider.ts lines 247, 249, 328-334; tree-items.ts lines 140, 247.

**Plan**:
- Add test for panel timer disposal: panel.ts:203-204 (dispose during diagnostics processing)
- Add test for object-type code extraction: tree-data-provider.ts:247 (code as `{ value }` object)
- Add test for unknown code fallback: tree-data-provider.ts:249 (code undefined)
- Add tests for filter text matching: tree-data-provider.ts:328-334 (filter by path, message, code)
- Add test for basename fallback: tree-items.ts:140 (URI with unusual path)
- Add test for severity icon out-of-range: tree-items.ts:247 (severity 99 fallback)

**Files**:
- Edit: `src/shared/panel/panel.test.ts`
- Edit: `src/shared/panel/tree-data-provider.test.ts`
- Edit: `src/shared/panel/tree-items.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test` — panel/tree lines confirmed covered

---

## TASK 5 — Extension Entry Point Edge Cases

**Status**: [ ]

**Gap**: extension.ts lines 409, 413, 458-463 — config change relint callback and progress bar saved-doc callback.

**Plan**:
- Add test for config change triggering relint: extension.ts:409 (extract onConfigurationChange callback, invoke it, verify forEachOpenDocument called)
- Add test for progress callback with saved docs: extension.ts:458-463 (set textDocuments with saved doc, extract withFileProgress callback, invoke with URI, verify lintDocument called)
- Add test for progress callback when doc not found: extension.ts:458-463 (invoke callback with URI not in textDocuments, verify lintDocument NOT called)

**Files**:
- Edit: `src/extension.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test` — extension.ts lines 409, 413, 458-463 confirmed covered

---

## TASK 6 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No commands registered — test-only changes, no new command registration needed
- Verify test files match vitest config-tooling-vscode project include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register
- No config file changes needed

**Verification**: All test files discovered by vitest (expect 38 test files in output)

---

## TASK 7 — Integration Verification

**Status**: [ ]

**Plan**:
- No commands registered — test-only changes, no new command registration needed
- Config settings read check: Run `git diff --name-only HEAD -- 'packages/shared/config/tooling/vscode/src/*.ts' ':!*.test.ts'` — expect 0 production files modified, confirming no config changes
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: Run `grep -c 'export' packages/shared/config/tooling/vscode/src/extension.ts` — expect same count as baseline (no new exports introduced)

**Verification**:
- `git diff --name-only` returns no production `.ts` files
- Export count unchanged from baseline
- `pnpm --filter @resist/vscode run qa:test` exits 0

---

## TASK 8 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @resist/vscode run qa:test:coverage`
- Verify coverage increased from baseline (93.73%/83.24%/88.12%/94.21%)
- Target: Statements >= 98%, Branches >= 95%, Functions >= 95%, Lines >= 98%

**Verification**: All pnpm commands exit 0, coverage metrics show significant increase

---

## TASK 9 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all test files exist and pass
- Verify all coverage metrics increased significantly from baseline
- Verify no production files modified (test-only changes)
- Verify no regressions — existing 748 tests still pass
- Commit with descriptive message

**Verification**:
- Test count >= 790 (baseline 748 + ~50 new)
- All coverage thresholds exceeded
- `pnpm --filter @resist/vscode run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Lint feature edge cases | -- |
| 2 | Shared infrastructure edge cases | -- |
| 3 | Provider and rules viewer edge cases | -- |
| 4 | Panel and tree view edge cases | -- |
| 5 | Extension entry point edge cases | 1-4 |
| 6 | Register rules + config | 1-5 |
| 7 | Integration verification | 6 |
| 8 | Full QA + Coverage | 7 |
| 9 | Final verification + commit | 8 |
