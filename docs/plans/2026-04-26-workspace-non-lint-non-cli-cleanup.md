# Workspace `qa:lint` Cleanup — Excluding `@/lint` and `@/cli`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: workspace-wide (excluding `packages/shared/config/tooling/lint` per user directive AND `packages/shared/utils/cli` per `.resist-lint.jsonc` permanent exclude)
**Goal**: Make `pnpm -w run qa:lint <all-packages-except-lint-and-cli>` exit 0 by clearing 273 diagnostics — almost entirely svelte-check/error in storylyne-editor `.svelte` files.
**Architecture**: One dominant workstream (268 svelte-check errors across ~35 `.svelte` files in `packages/products/storylyne/editor/src/routes/(testing)/**` and `src/lib/components/**`) plus 5 trivial oxlint diagnostics. Per-site Edit-tool work — no bulk scripts (blocked by hook). Plan executes under active-plan binding contract: Stop hook will refuse to end the turn until `pnpm -w run qa:lint <paths>` shows zero `^  ✗ ` lines.

Each task is atomic: implement → verify per-file (`pnpm exec svelte-check` on the editor) → run editor tests → next file.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `qa:lint` exit (excluding `@/lint` + `@/cli`) | 1 |
| Total errors | 273 |
| `svelte-check/error` (storylyne-editor `.svelte`) | 268 |
| `oxlint/require-await` | 2 |
| `oxlint/no-unused-vars` | 2 |
| `oxlint/consistent-indexed-object-style` | 1 |
| Files with diagnostics | ~37 |
| Storylyne-editor test count (must not regress) | 1498 |

**Top-density files (svelte-check/error)**:
- `src/routes/(testing)/components/[name]/+page.svelte` — 61
- `src/routes/(testing)/+layout.svelte` — 53
- `src/routes/(testing)/icons/+page.svelte` — 21
- `src/routes/(testing)/changelog/+page.svelte` — 12
- `src/routes/(testing)/components/category/+page.svelte` — 10
- `src/routes/(testing)/tokens/+page.svelte` — 9
- `src/routes/(testing)/components/tags/+page.svelte` — 8
- `src/lib/components/DevToolbar.svelte` — 8
- 27 other `.svelte` files with 1–7 errors

---

## TASK 1 — Sample top-density files to characterize patterns

**Status**: [x]

**Gap**: Cannot fix per-site without knowing the specific failure shapes. Prior storylyne-editor cleanup this session resolved similar errors via 5 patterns (Svelte-5 snippet typing, `Result<T>` unwrap, `LoadEvent` shape, bits-ui prop API drift, `InferOutput`→`InferInput` for component props). Need to confirm the same 5 patterns dominate the 268 remaining errors before grinding.

**Plan**:
- Read 4 highest-density files at the diagnostic line numbers: `(testing)/components/[name]/+page.svelte`, `(testing)/+layout.svelte`, `(testing)/icons/+page.svelte`, `(testing)/changelog/+page.svelte`.
- For each file, capture the error message text (e.g. `Target signature provides too few arguments`, `Property 'X' does not exist on type 'Y'`) and group by pattern.
- Build a pattern → fix-mechanism table.
- Update `Plan` of TASK 2 with the actual patterns and per-pattern site counts.

**Files**:
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/+layout.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/icons/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/changelog/+page.svelte`

**Verification**:
- A documented mapping exists from each unique error message stem (top 6 by count) to a fix mechanism (snippet retype / `?? fallback` / `as never` cast / `<svelte:element>` swap / etc.).
- `grep -c '"target signature"' /tmp/lint-output.txt` and similar pattern-counts produce the table that drives TASK 2's per-pattern bulk Edits.

---

## TASK 2 — Group A: per-site fixes for `(testing)/components/[name]/+page.svelte` (61 errors)

**Status**: [x]

**Gap**: This single file has 61 svelte-check errors — 23% of the total. Almost certainly a small set of repeating patterns (Snippet param shapes, prop-type mismatches, etc.) replicated across many lens-demo-page sections. Fixing this one file will cut the error count by nearly a quarter.

**Plan**:
- Read the full file in sections of 100 lines.
- For each diagnostic line: apply the matching fix from TASK 1's pattern table (e.g. `{#snippet child({ props: x })}` → `{#snippet child(rawProps)}` + cast inside).
- After every ~10 fixes, run `pnpm -w run qa:lint packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte 2>&1 | grep -c '^  ✗ '` and verify the count decreased.
- Run `pnpm --filter @storylyne/editor run qa:test` after the file is clean to confirm no test regression. The post-edit-test-regression-block hook will catch regressions automatically.

**Files**:
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Verification**:
- `pnpm -w run qa:lint packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte 2>&1 | grep -c '^  ✗ '` returns 0.
- `pnpm --filter @storylyne/editor run qa:test 2>&1 | grep "Tests"` shows ≥ 1498 passed.

---

## TASK 3 — Group B: per-site fixes for `(testing)/+layout.svelte` (53 errors)

**Status**: [x]

**Gap**: Second-largest error file. This is the (testing) layout — likely shares the snippet/prop-typing patterns with TASK 2's [name] page. After TASK 2's pattern library is established, TASK 3 should mostly be applying the same fixes.

**Plan**:
- Apply the same fix-mechanism table from TASK 1.
- Per-site Edit through all 53 sites in the file, grouping consecutive same-pattern sites where possible.
- Verify count drops to 0 for this file.
- Run editor tests.

**Files**:
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/+layout.svelte`

**Verification**:
- `pnpm -w run qa:lint packages/products/storylyne/editor/src/routes/(testing)/+layout.svelte 2>&1 | grep -c '^  ✗ '` returns 0.
- `pnpm --filter @storylyne/editor run qa:test` exit 0; test count ≥ 1498.

---

## TASK 4 — Group C: medium-density files (icons, changelog, components/category, tokens, components/tags, DevToolbar, components/all, accessibility) — 75 errors total

**Status**: [x]

**Gap**: 8 files with 7–21 errors each. Same patterns as TASKS 2–3.

**Plan**:
- Process each file end-to-end before moving to the next (don't interleave): read, edit per-site, verify file-level qa:lint shows 0 errors for that file, then move on.
- Order by descending error count: icons (21), changelog (12), components/category (10), tokens (9), components/tags (8), DevToolbar (8), components/all (7), accessibility (7).

**Files**:
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/icons/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/changelog/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/components/category/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/tokens/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/components/tags/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/lib/components/DevToolbar.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/components/all/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/accessibility/+page.svelte`

**Verification**:
- After each file: `pnpm -w run qa:lint <file>` returns 0 `^  ✗ ` lines.
- After all 8 files: `pnpm -w run qa:lint <Group-C-paths>` returns 0.
- `pnpm --filter @storylyne/editor run qa:test` test count ≥ 1498.

---

## TASK 5 — Group D: low-density files (~27 files, 1–7 errors each)

**Status**: [x]

**Gap**: ~72 errors spread thinly across 27 `.svelte` files. Mechanical application of the pattern library.

**Plan**:
- Enumerate the remaining 27 files via `pnpm -w run qa:lint <storylyne-editor-paths> 2>&1 | grep -E '^     ,-\[' | sort -u`.
- Process each file end-to-end.
- Aggressive parallelism not required — keep grouping by directory for cache efficiency.

**Files**:
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/about/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/browser-support/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/components/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/components/category/[category]/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/getting-started/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/styling/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/support/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/isolate/[name]/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/lib/components/DevToolbarAppState.svelte`
- Edit: `packages/products/storylyne/editor/src/lib/components/DevToolbarDebug.svelte`
- Edit: `packages/products/storylyne/editor/src/lib/components/DevToolbarFeatureFlags.svelte`
- Edit: `packages/products/storylyne/editor/src/lib/components/DevToolbarPerf.svelte`
- Edit: `packages/products/storylyne/editor/src/lib/components/NavScenes.svelte`
- Edit: `packages/products/storylyne/editor/src/lib/server/preview/cdp-input.ts`
- Edit: `packages/products/storylyne/editor/src/routes/(app)/+layout.svelte`
- Edit: `packages/shared/locale/src/direction.ts`
- Test: `packages/shared/locale/src/direction.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/products/storylyne/editor 2>&1 | grep -c 'svelte-check/error'` returns 0.
- `pnpm --filter @storylyne/editor run qa:test` test count ≥ 1498.

---

## TASK 6 — Group E: 5 trivial oxlint fixes

**Status**: [x]

**Gap**: 2 `oxlint/require-await`, 2 `oxlint/no-unused-vars`, 1 `oxlint/consistent-indexed-object-style`. All mechanical.

**Plan**:
- For each: Read the site, apply the obvious fix (drop `async`, delete unused, `Record<K, V>` syntax).
- Run `pnpm -w run qa:lint` workspace-wide after to confirm.

**Files**:
- Edit: `packages/shared/locale/src/t.ts`
- Edit: `packages/shared/config/tooling/svelte/src/index-init.test.ts`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/components/[name]/+page.svelte`

**Verification**:
- `pnpm -w run qa:lint <all-paths-except-lint-and-cli> 2>&1 | grep -cE 'oxlint/(require-await|no-unused-vars|consistent-indexed-object-style)'` returns 0.

---

## TASK 7 — Register Rules + Config

**Status**: [x]

**Plan**:
- This is type-error / per-site cleanup; no rule extensions or config edits expected.
- Confirm via `git diff --name-only HEAD -- '.oxlintrc.json' '.resist-lint.jsonc'` is empty.
- Confirm via `git diff --name-only HEAD -- packages/shared/config/tooling/lint` is empty (excluded).
- Confirm via `git diff --name-only HEAD -- packages/shared/utils/cli` is empty (excluded).

**Files**:
- No config edits expected.

**Verification**:
- `git diff --name-only HEAD -- '*.json' '*.jsonc'` outputs only `.claude/last-test-baseline.json` (auto-updated by post-edit hook) or is empty.
- `git diff --name-only HEAD` shows changes only inside `packages/products/storylyne/editor/src/`.

---

## TASK 8 — Integration Verification

**Status**: [x]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/products/storylyne/editor/src` is unchanged from baseline (no commands added/removed by type-error fixes).
- Config settings read check: `grep -rc 'config\.get(' packages/products/storylyne/editor/src` is unchanged from baseline.
- Class instantiation check: no new classes introduced; verify via `git diff --stat HEAD -- packages/products/storylyne/editor/src/`.
- Dead code / unused export check: 2 `no-unused-vars` deletions in TASK 6; verify via `pnpm -w run qa:lint <paths> 2>&1 | grep -c 'no-unused-vars'` returns 0.

**Verification**:
- `grep -rc 'registerCommand' packages/products/storylyne/editor/src 2>/dev/null | awk -F: '{s+=$2} END{print s}'` matches baseline count from prior commit `6e0dba96`.
- `grep -rc 'config\\.get(' packages/products/storylyne/editor/src 2>/dev/null | awk -F: '{s+=$2} END{print s}'` matches baseline count from prior commit `6e0dba96`.
- `git diff --stat HEAD~1 -- packages/products/storylyne/editor/src/` shows no new `class` keywords introduced.
- `pnpm -w run qa:lint packages/products/storylyne/editor 2>&1 | grep -c 'no-unused-vars'` returns `0`.

---

## TASK 9 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format`.
- Run: `pnpm -w run qa:lint $(find packages -maxdepth 5 -name 'package.json' -not -path '*/node_modules/*' -exec dirname {} \; | grep -v 'shared/config/tooling/lint$' | grep -v 'shared/utils/cli$' | xargs)` — must exit 0.
- Run: `pnpm --filter @storylyne/editor run qa:test` — must show ≥ 1498 passing.
- Spot-check: `pnpm --filter @/ui run qa:test` — must show ≥ 7806 passing (no regression in shared/ui).

**Verification**:
- `pnpm -w run qa:lint <paths>` exit code is 0.
- `pnpm -w run qa:lint <paths> 2>&1 | grep -cE '^  ✗ '` outputs 0.
- `pnpm --filter @storylyne/editor run qa:test` final summary line shows `Tests  1498 passed` (or higher).
- `@/ui` test count ≥ 7806.

---

## TASK 10 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all touched files match the spec from TASKS 2–6.
- Verify `pnpm -w run qa:lint <paths>` exit 0 from a fresh shell.
- Verify clean tree after commit.
- Commit with message: `fix(storylyne-editor): clear all svelte-check type errors in (testing) routes + dev-toolbar`.

**Verification**:
- `pnpm -w run qa:lint <paths>` exit 0.
- `git log -1 --format=%s` matches the commit message.
- `git status --short` empty after commit (only .claude/last-test-baseline.json may have changed which is fine).
- `pnpm --filter @storylyne/editor run qa:test` re-run still shows ≥ 1498 passing.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Sample files to characterize patterns | -- |
| 2 | Group A: `[name]/+page.svelte` (61 errors) | 1 |
| 3 | Group B: `(testing)/+layout.svelte` (53 errors) | 1 |
| 4 | Group C: 8 medium-density files (75 errors) | 1, 2 |
| 5 | Group D: ~27 low-density files (~72 errors) | 1, 2 |
| 6 | Group E: 5 trivial oxlint | -- |
| 7 | Register Rules + Config audit | 2-6 |
| 8 | Integration Verification | 7 |
| 9 | Full QA + Coverage | 8 |
| 10 | Final verification + commit | 9 |
