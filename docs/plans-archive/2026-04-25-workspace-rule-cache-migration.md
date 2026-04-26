# Lint — Workspace Rule Cache Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-25
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Add `inputs(ctx)` declarations to every cacheable workspace rule so warm `qa:lint` runs reuse cached diagnostics on cache hit. The framework hook + cache wiring already exists (commit `e7dcc62e`); this plan completes the per-rule migration.
**Architecture**: Each rule whose output is a pure function of a declarable file set declares `async inputs(ctx)` returning the absolute file paths whose `(path, mtime, size)` fingerprint determines the cached result. Rules with non-file inputs (env, time, network, git state) stay opt-out.

Each task is atomic: implement → verify (`qa:lint` exits 0, tests pass) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Workspace rules with `inputs` declared | 12 (plans/* × 7, vscode/* × 5) |
| Workspace rules total | 400 |
| Remaining to migrate | 388 |
| Tests | 5315 pass |
| `qa:lint` warm wall-clock (workspace-wide) | 2.85s |
| `LintCache.toolEntries` workspace: keys after warm run | 12 |

---

## TASK 1 — Migrate `plans/no-incomplete-tasks` with daily-rollover sentinel

**Status**: [ ]

**Gap**: This rule's output depends on the current date (compares `now - planDate >= maxAgeDays`). Caching naively returns yesterday's "young plan = no diagnostics" verdict for plans that crossed the age threshold overnight.

**Plan**:
- Add `inputs(ctx)` returning `[...planFiles, '__daily_rollover__/' + new Date().toISOString().slice(0, 10)]`.
- The sentinel path doesn't exist on disk; `fingerprintFiles` records `MISSING` for it. The date string changes each midnight UTC, busting the cache exactly when `ageDays` arithmetic could flip.
- Add a unit test verifying the sentinel string changes when `Date` is advanced by 24h.

**Files**:
- Edit: `rules/plans/no-incomplete-tasks.ts`
- Edit: `rules/plans/plans-rules.test.ts`

**Verification**:
- 13th `workspace:plans/no-incomplete-tasks|/` entry appears in `.resist-lint-cache.json` after warm run.
- New unit test passes.
- `qa:lint` exits 0.

---

## TASK 2 — Migrate `rules/testing/*` (3 rules)

**Status**: [ ]

**Gap**: `require-e2e-location`, `require-integration-location`, `require-test-suffix` walk `await ctx.allFiles()` and check naming conventions. `require-colocated-tests` reads source + test files via `existsSync` / `readFileSync`. All four are pure file-content functions.

**Plan**:
- For the three `allFiles()` rules: `inputs(ctx)` returns `await ctx.allFiles()` directly (no filtering needed since the rule itself filters).
- For `require-colocated-tests`: walk source dirs and return both source files + their colocated test paths. Need to expose this via `inputs()` carefully so cache invalidates on either side.
- Add per-rule integration test confirming a second invocation returns identical results without re-running `check()`.

**Files**:
- Edit: `rules/testing/require-e2e-location.ts`
- Edit: `rules/testing/require-integration-location.ts`
- Edit: `rules/testing/require-test-suffix.ts`
- Edit: `rules/testing/require-colocated-tests.ts`
- Edit: `rules/testing/testing-rules.test.ts`

**Verification**:
- 4 new `workspace:testing/*` entries in cache after warm run.
- All testing rule tests pass.

---

## TASK 3 — Migrate `rules/hygiene/*` (3 rules)

**Status**: [ ]

**Gap**: Hygiene rules check formatting / structural conventions across the workspace.

**Plan**:
- Inspect each: `ls rules/hygiene/*.ts -name -not -name *.test.ts`
- For each rule, identify which file extensions it reads. Add `inputs(ctx)` returning that subset.
- If a rule consults more than file content (env vars, git ls-files), skip caching and document why with a comment in the rule body.

**Files**:
- Edit: `rules/hygiene/<each>.ts` (3 files)
- Edit: `rules/hygiene/<test file>` if exists

**Verification**:
- New `workspace:hygiene/*` entries in cache.
- Hygiene rule tests still pass.

---

## TASK 4 — Migrate `rules/package/*` (1 rule)

**Status**: [ ]

**Gap**: One package-level workspace rule. Quick win.

**Plan**:
- Identify the rule: `ls rules/package/*.ts`
- Read its check() body, declare matching `inputs()`.
- Update or add a test if needed.

**Files**:
- Edit: `rules/package/<rule>.ts`

**Verification**:
- 1 new `workspace:package/*` entry in cache.

---

## TASK 5 — Bulk-migrate `rules/workspace/*` group A: file-extension scanners (estimated ~150 of 380)

**Status**: [ ]

**Gap**: The largest group. Most rules scan a fixed extension set (`.md`, `.json`, `.yaml`, `.css`, etc.) via `ctx.allFiles()` or `ctx.filesByExtension()`. Pure file-content functions, easy to migrate.

**Plan**:
- Audit shape of each rule via grep: `grep -lE 'filesByExtension|allFiles' rules/workspace/*.ts | grep -v test`.
- Group rules by their input shape. Common patterns to expect:
  - "all .md files" (markdown-link / markdown-naming rules)
  - "all .yaml files" (gitlab-ci-* / dockerfile-* / k8s-* rules)
  - "all .json files" (tsconfig / package / eslintrc rules)
  - "all .ts/.svelte files" (export-naming / file-header rules)
  - "all .ico/.png/.svg files" (image-* rules)
- For each group, create a shared input helper if 3+ rules share the same shape (mirror of `discoverPlanFiles` and `vscodeRuleInputs`).
- Migrate in batches of 20-30 rules per commit so test failures localize.

**Files**:
- Many rules under `rules/workspace/*.ts`
- Possibly new shared helper(s) like `rules/workspace/_shared-inputs/yaml.ts`, `json.ts`, etc.

**Verification**:
- Each batch: `pnpm -r --filter @/lint run qa:test` passes.
- After full pass: `qa:lint` warm shows ≥150 `workspace:*` entries.

---

## TASK 6 — Bulk-migrate `rules/workspace/*` group B: package-aware rules (estimated ~80)

**Status**: [ ]

**Gap**: Rules that walk `getWorkspacePackages()` and inspect each package's files (e.g. `enforce-workspace-version-alignment`, `sync-pnpm-workspace`, `sync-tsconfig-paths`). Inputs are the union of all package metadata files.

**Plan**:
- Create `rules/workspace/_shared-inputs/packages.ts` exporting `packageMetaInputs(ctx)` which returns all package.json + tsconfig.json paths.
- Migrate each package-aware rule to use it.
- A few rules may need a slightly extended set (e.g. add `pnpm-workspace.yaml` for sync-pnpm-workspace).

**Files**:
- Create: `rules/workspace/_shared-inputs/packages.ts`
- Edit: ~80 rule files under `rules/workspace/`

**Verification**:
- Each rule's tests pass.
- Cache entries appear for migrated rules.

---

## TASK 7 — Bulk-migrate `rules/workspace/*` group C: cross-cutting rules (estimated ~100)

**Status**: [ ]

**Gap**: Rules that read multiple disjoint file sets (e.g. `no-broken-markdown-links` reads markdown files AND verifies referenced filesystem paths exist). Their inputs span both source and target.

**Plan**:
- For each rule, identify ALL files whose state affects output (both ends of a cross-reference).
- If the input set is too broad to be useful (essentially "everything"), skip migration and add a `// inputs not declared: depends on whole-tree state` comment.
- For rules that span well-defined sets (e.g. markdown + their target dirs), declare both.

**Files**:
- Edit: ~100 rule files under `rules/workspace/`

**Verification**:
- Tests pass.
- For each rule, document why it was/wasn't cached.

---

## TASK 8 — Identify and document non-cacheable rules (estimated ~50)

**Status**: [ ]

**Gap**: Rules that consult external state (env vars, git state, network, current time without daily-sentinel handling) cannot be safely cached.

**Plan**:
- Grep for rules using `process.env`, `child_process` (git), `fetch`, `Date.now()` without sentinel.
- For each, leave `inputs` undefined and add a header comment:
  ```ts
  // Caching is opt-out: this rule's output depends on <env|git state|...>,
  // not just file content.
  ```

**Files**:
- Edit: ~50 rule files (comments only)

**Verification**:
- These rules continue to run on every invocation — no behavior change.

---

## TASK 9 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No new rules registered. No config schema changes.
- Verify `framework/types.ts` exposes `inputs?` field on `WorkspaceRuleSchema` (already done in `e7dcc62e`).
- Run a sanity grep to count migrated rules: `grep -lr 'async inputs(' packages/shared/config/tooling/lint/src/rules | wc -l`. Expect ≥350 after all tasks.

**Verification**:
- Grep count matches target.
- Type-check passes.

---

## TASK 10 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: no new commands. `grep -c registerCommand packages/shared/config/tooling/lint/src/cli-helpers.ts` unchanged.
- Config settings read check: no new config keys. `grep -c "config\.get" packages/shared/config/tooling/lint/src` unchanged.
- Class instantiation check: no new classes.
- Dead code / unused export check: every shared-input helper in `_shared-inputs/` has at least one importer.
- Cache state check: after a warm run, `.resist-lint-cache.json` has `workspace:` entries roughly equal to (cacheable rules) − (non-cacheable rules with skip comment).

**Verification**:
- All four counts above match expectations.
- `git diff --name-only HEAD` shows only rule files + new `_shared-inputs/` helpers + this plan doc.

---

## TASK 11 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint` — must exit 0
- Run: `pnpm -r --filter @/lint run qa:test` — every test passes

**Verification**:
- `pnpm -w run qa:lint; echo $?` outputs `0`
- Test count ≥ 5315 + tests added per task
- No regressions in existing rule output

---

## TASK 12 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify `qa:lint` warm wall-clock improvement. Expectation: warm should drop modestly (workspace rules were running concurrently with tools, so wall-clock impact is bounded).
- Verify cache file size ≤ 5MB after warm run.
- Verify no rule's behavior changed: diff workspace lint output against baseline.
- Commit each task as a separate commit so bisecting a regression is fast.

**Verification**:
- `pnpm -w run qa:lint; echo $?` outputs `0`
- `git log --oneline | head -20` shows separate commits per task
- Cache file is well-formed (`jq . .resist-lint-cache.json` succeeds)

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Migrate plans/no-incomplete-tasks | -- |
| 2 | Migrate testing/* (3 rules) | -- |
| 3 | Migrate hygiene/* (3 rules) | -- |
| 4 | Migrate package/* (1 rule) | -- |
| 5 | Migrate workspace/* group A (file-ext scanners) | -- |
| 6 | Migrate workspace/* group B (package-aware) | 5 |
| 7 | Migrate workspace/* group C (cross-cutting) | 5, 6 |
| 8 | Document non-cacheable rules | 1-7 |
| 9 | Register Rules + Config | 8 |
| 10 | Integration Verification | 9 |
| 11 | Full QA + Coverage | 10 |
| 12 | Final verification + commit | 11 |
