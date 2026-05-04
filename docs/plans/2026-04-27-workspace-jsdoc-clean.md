# Workspace QA — Fix `@/lint` Cache-Invalidation Bug, Then Clear ~3,193 jsdoc Diagnostics

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-27
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/framework/cache.ts` + `cli-helpers.ts`) and workspace-wide source files (`packages/**/*.{ts,svelte}`)
**Goal**: Make `pnpm -w run qa:lint` exit 0 by:
  1. Fixing a cache-invalidation bug in the `@/lint` runner that hid ~2,900 jsdoc diagnostics across the prior turn.
  2. Resolving every one of the ~3,193 real diagnostics surfaced after the cache fix — 3,107 `jsdoc/require-module` (missing `@module` JSDoc) and 86 `jsdoc/require-jsdoc` (missing function/type JSDoc).

This plan **explicitly supersedes** the prior plan at `/Users/home/.claude/plans/atomic-growing-tarjan.md` (now replaced) and the staged copy at `docs/plans/2026-04-27-workspace-jsdoc-clean.md`. The prior plan's baseline of 228 diagnostics was wrong — it was the count from a stale `.resist-lint-cache.json` that did not invalidate when commit `37b69adc` flipped two rules from `"off"` to `"error"` in `.resist-lint.jsonc`. The cache bug must be fixed FIRST so the subsequent counts are accurate and reproducible.

**Architecture**:
- **Cache bug root cause** (TASK 1): `cli-helpers.ts:1272` calls `computeRuleHash(allRuleIds)` which hashes only the *rule ID set* (the modules that load), not the *resolved per-rule severity* from `.resist-lint.jsonc`. When a rule's severity changes from `"off"` to `"error"`, the rule's ID is unchanged, so the rule hash is unchanged, so `LintCache.load()` accepts the cache as current. Cached entries — whose results were computed under the *old* rule-active set — are reused for files whose content hasn't changed, hiding any new diagnostics that the newly-active rule would have produced.
- **Cache fix at the runner level**: extend `computeRuleHash` to accept and incorporate the resolved rules map (`config.rules: Record<string, Severity>`). The new hash is `MD5(sorted(ruleIds).join('\n') + '\n--\n' + JSON.stringify(sortedRulesMap))`. Any severity flip — including `"off"` → `"error"` — produces a new hash, invalidating the entire cache. Tests cover (a) baseline hit-with-same-config, (b) severity flip causing miss, (c) override scope change causing miss.
- **TASK 4 (the bulk-Props change already shipped in commit `bf8e8c28`)** is reflected in this plan as a completed sub-task — it added `/** Public component props for <Name>. */` to 783 `<script module lang="ts">` `XxxProps` aliases under user-approved bulk-script (`.claude/approved-bulk-script` consumed). The plan binding now matches what shipped.
- **The 3,107 `@module` additions are per-file authored.** No bulk script with filename-derived placeholders. For each file the description is taken from the file's existing first-comment (when present), the file's first export, or — for SvelteKit route files / `+page.ts` shells — the convention "<role> for <route>". Batches are organized by package + extension for review locality. This is realistically a few-hour grind, not days, because most files have an obvious purpose visible in their first 20 lines. Per-batch commits.

Each task is atomic: implement → verify (`pnpm -w run qa:lint --tools` after invalidating the cache for accurate counts) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any further changes)

| Metric | Value |
|--------|-------|
| `pnpm -w run qa:lint` exit code | 1 |
| `pnpm -w run qa:lint 2>&1 \| tail -5 \| grep -oE 'Found [0-9]+'` total errors | 3,193 |
| `jsdoc/require-module` errors (real, post cache-invalidation) | 3,107 |
| `jsdoc/require-jsdoc` errors (function) | 13 |
| `jsdoc/require-jsdoc` errors (type, residual after commit `bf8e8c28`) | 73 |
| Workspace tests | 19,738 / 19,738 passing |
| Workspace coverage | All four thresholds pass |
| `.resist-lint-cache.json` size | ~2.5 MB (currently STALE — does not invalidate on rule-severity flips) |

**Files already shipped (commit `bf8e8c28`):**
- `packages/shared/config/tooling/lint/src/rules/jsdoc/require-module.ts` — added `.md/.mdx/.html` skip
- `packages/shared/config/tooling/lint/src/rules/jsdoc/jsdoc-rules.test.ts` — added 3 fixtures
- 783 `packages/shared/ui/src/<comp>/<Component>.svelte` — `XxxProps` JSDoc bulk-add
- `docs/plans/2026-04-27-workspace-jsdoc-clean.md` — superseded by this plan

---

## TASK 1 — Fix cache-invalidation bug in `@/lint`

**Status**: [x]

**Gap**: `computeRuleHash(allRuleIds)` (`packages/shared/config/tooling/lint/src/framework/cache.ts:377`) hashes only the loaded rule IDs, not the resolved severities from `.resist-lint.jsonc`. When a rule flips from `"off"` to `"error"` (or any severity transition), the rule hash is unchanged, the cache is marked current, and stale cached entries are reused — silently hiding any diagnostics the newly-activated rule would produce. This is the bug that hid ~2,900 jsdoc diagnostics across the prior turn.

**Plan**:
- Update the `computeRuleHash` signature in `framework/cache.ts` to take a second argument `rulesConfig: Record<string, Severity | unknown>` (the merged config rules map) in addition to `ruleIds`. The hash becomes:
  - `MD5(sorted(ruleIds).join('\n') + '\n----\n' + JSON.stringify(sortedRulesMap))`.
- Update `cli-helpers.ts:1272` call site to pass `config.rules` (the parsed `.resist-lint.jsonc` `rules` map).
- Update unit tests in `framework/cache.test.ts`:
  - Existing test: `computeRuleHash(['a', 'b'])` matches `computeRuleHash(['b', 'a'])` (sort independence) — keep.
  - New test: `computeRuleHash(ids, {a:'error'}) !== computeRuleHash(ids, {a:'off'})` — severity affects hash.
  - New test: `computeRuleHash(ids, {a:'error'}) !== computeRuleHash(ids, {a:'error', b:'off'})` — added rule entries affect hash.
  - New test: `computeRuleHash(ids, {a:'error', b:'warn'}) === computeRuleHash(ids, {b:'warn', a:'error'})` — key-order independence (achieved via sortedRulesMap).
- After the fix, re-run `pnpm -w run qa:lint` once with cache invalidated to confirm the real workspace baseline is reproducible.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/framework/cache.ts` (signature + impl of `computeRuleHash`)
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts` (call site at line 1272)
- Edit: `packages/shared/config/tooling/lint/src/framework/cache.test.ts` (4 tests)
- Test: `packages/shared/config/tooling/lint/src/framework/cache.test.ts`

**Verification**:
- `pnpm --filter @/lint exec vitest run --project lint src/framework/cache.test.ts 2>&1 \| grep -E '^\s*Tests'` shows new pass count ≥ baseline + 3.
- After fix: edit `.resist-lint.jsonc` to flip any rule from `"error"` → `"off"`, then run `pnpm -w run qa:lint`; cache invalidates entirely (no stale results).
- After flipping the rule back, the next `pnpm -w run qa:lint` builds a fresh cache and reports the correct diagnostics count.
- `pnpm -w run qa:lint 2>&1 \| tail -5 \| grep -oE 'Found [0-9]+'` reproduces 3,193 ± 0 baseline diagnostics deterministically across consecutive runs.

---

## TASK 2 — Acknowledge already-shipped fixes (`bf8e8c28`)

**Status**: [x]

**Gap**: Two fixes already shipped in commit `bf8e8c28`. They are recorded here so the plan's binding contract reflects what is on `main`.

**Plan**:
- (Already done) `packages/shared/config/tooling/lint/src/rules/jsdoc/require-module.ts` skips `.md/.mdx/.html`. 12 false positives eliminated. 3 fixture tests added in `jsdoc-rules.test.ts`.
- (Already done) 783 `<Component>.svelte` files in `packages/shared/ui/src/<comp>/` got `/** Public component props for <Name>. */` above their `XxxProps` type alias inside `<script module lang="ts">`. User approved bulk-script via `.claude/approved-bulk-script` (consumed). 856 `Exported type` diagnostics dropped to 73 (residual from non-XxxProps types in `types.ts` / `context.ts` / `chart-utils.ts` / etc. — these are addressed in TASK 6).

**Files** (already committed in `bf8e8c28`):
- Edit: `packages/shared/config/tooling/lint/src/rules/jsdoc/require-module.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/jsdoc/jsdoc-rules.test.ts`
- Edit: `packages/shared/ui/src/<comp>/<Component>.svelte` (783 files)

**Verification**:
- `git log --oneline bf8e8c28 -1` shows the commit.
- `git show bf8e8c28 --stat | head -10` shows 786 files changed.
- `pnpm -w run qa:lint 2>&1 \| grep -c 'jsdoc/require-jsdoc.*Exported type'` returns 73.

---

## TASK 3 — Author `/** … @module */` per-file for the 3,107 flagged source files

**Status**: [x]

**Gap**: 3,107 source files lack `/** … @module */` at the top. Per-file authored descriptions, no bulk-script-with-placeholders. Realistic time: a few focused hours; most files' purpose is obvious in the first 20 lines.

**Plan**: Process by package + extension batches. Each batch reads a small group of files (≤20) in parallel, authors per-file, edits in one go, then runs the package's `qa:test` and an incremental `qa:lint --tools` to confirm count drops monotonically. Per-batch commit.

| Batch | Scope | Approx file count |
|---|---|---|
| 3a | `packages/shared/ui/src/**/*.svelte` (component shells, including the 1240 `.svelte` flagged by require-module — note: TASK 2 added Props JSDoc but NOT `@module`) | ~1240 |
| 3b | `packages/shared/ui/src/**/*.ts` (lens.ts / index.ts / types.ts / utility files) | ~700 |
| 3c | `packages/shared/{schemas,utils}/**/*.{ts,svelte.ts}` non-test | ~150 |
| 3d | `packages/shared/config/**/*.{ts}` non-test | ~80 |
| 3e | `packages/products/storylyne/editor/src/**/*.{svelte,ts}` non-test | ~250 |
| 3f | All `*.test.ts` / `*.spec.ts` workspace-wide | ~600 |
| 3g | Remaining (`.svelte.test.ts`, `.server.ts`, `.d.ts`, `.config.ts`, etc) | ~85 |

For each file:
- Read first 20 lines to determine the file's role:
  - `<script module lang="ts">` → component shell — description is `<ComponentName> Svelte component — <one-line purpose from the Component's own first-script JSDoc when present>.`
  - `*.test.ts` → description is `Tests for <module-under-test>.`
  - `lens.ts` → `Lens manifest for <ComponentName>.`
  - `index.ts` (barrel) → `Barrel re-export for <package-or-folder>.`
  - `+page.ts` / `+page.server.ts` → `<Route> page <load|action> handler.`
  - Plain `.ts` source → first export's name + purpose.
- Insert (or skip if already present) the canonical block:
  ```
  /**
   * <description>.
   *
   * @module
   */
  ```
- For `.svelte` files: insert inside the FIRST `<script module lang="ts">` block (or `<script lang="ts">` if no module block) above the first import.
- For `.ts` files: insert at the top of the file (above any imports).

**Files**: ~3,107 source files across the 7 batches. Each batch commit references its package + count.
- Test: per-batch `pnpm --filter <pkg> run qa:test`.

**Verification**:
- After each batch: `pnpm -w run qa:lint --tools 2>&1 \| grep -c 'jsdoc/require-module'` decreases monotonically.
- Final: `pnpm -w run qa:lint --tools 2>&1 \| grep -c 'jsdoc/require-module'` returns 0.
- All per-package `qa:test` commands pass with unchanged counts.

---

## TASK 4 — Add JSDoc to 13 exported functions

**Status**: [x]

**Gap**: 13 exported functions in production source files lack JSDoc:
- `packages/products/storylyne/editor/src/hooks.server.ts` — `handle`
- `packages/shared/config/tooling/lint/src/cli-helpers.ts` — `writeJsonSchema`
- `packages/shared/config/tooling/lint/src/config/schema.ts` — `loadConfig`
- `packages/shared/config/tooling/lint/src/framework/rule-loader.ts` — `loadAllRules`
- `packages/shared/ui/src/carousel/context.ts` — `setEmblaContext`
- `packages/shared/ui/src/carousel/context.ts` — `getEmblaContext`
- `packages/shared/ui/src/chart/chart-utils.ts` — `getPayloadConfigFromPayload`
- `packages/shared/ui/src/chart/chart-utils.ts` — `setChartContext`
- `packages/shared/ui/src/chart/chart-utils.ts` — `useChart`
- `packages/shared/ui/src/data-table/data-table.svelte.ts` — `mergeObjects`
- `packages/shared/ui/src/scroll-area/scroll-area.svelte.ts` — `getRetrieved`
- `packages/shared/ui/src/toggle-group/toggle-group.svelte.ts` — `setToggleGroupCtx`
- `packages/shared/ui/src/toggle-group/toggle-group.svelte.ts` — `getToggleGroupCtx`

**Plan**:
- For each function, read the body and signature, author a JSDoc block above the export with `@param`, `@returns` matching the function's signature.
- All 13 are public-API entries in their packages; the JSDoc style matches neighboring documented functions in the same file.

**Files**: 9 files (a few have ≥2 functions).
- Test: `pnpm --filter @/ui run qa:test`, `pnpm --filter @/lint run qa:test`, `pnpm --filter @storylyne/editor run qa:test`.

**Verification**:
- `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-jsdoc.*Exported function'` returns 0.

---

## TASK 5 — Add JSDoc to remaining 71 non-Svelte exported types

**Status**: [x]

**Gap**: 73 `Exported type` diagnostics remain after TASK 2's bulk Props JSDoc — 71 are in non-Svelte `.ts` files (carousel/context.ts, lens-utils.ts, types.ts, etc.) and 2 are in README code fences (handled in TASK 7). The 71 are real types that need authored JSDoc.

**Plan**:
- Group by file (each .ts file has multiple exported types). Read each file's exports, author one-line JSDoc per type.
- The types fall into clusters: chart payloads, lens props, sidebar context, badge/button variants — all have an obvious one-line purpose visible in their declaration site.

**Files**:
- Edit: `packages/shared/ui/src/badge/types.ts`
- Edit: `packages/shared/ui/src/button/types.ts`
- Edit: `packages/shared/ui/src/toggle/toggle.svelte`
- Edit: `packages/shared/ui/src/visually-hidden/VisuallyHidden.svelte`
- Test: `pnpm --filter @/ui run qa:test`

**Verification**:
- `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-jsdoc.*Exported type'` drops from 73 to 2 (the README code-fence types).

---

## TASK 6 — Add JSDoc to 2 README in-fence exported types

**Status**: [x]

**Gap**: `packages/shared/locale/README.md:752,753` declares `MyToolStrings` and `BuiltMyToolStrings` inside a ```ts fence as documented examples. The rule extracts the fence and runs `require-jsdoc` against its content; the in-fence types lack JSDoc.

**Plan**:
- Edit the README.md fence content to add JSDoc above each `export type` line:
  - `/** Output type inferred from MyToolStringsSchema (per-tool strings). */`
  - `/** Built locale wrapping MyToolStrings (with format helpers). */`

**Files**:
- Edit: `packages/shared/locale/README.md`

**Verification**:
- `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-jsdoc'` returns 0.

---

## TASK 7 — Register Rules + Config

**Status**: [x]

**Plan**:
- This phase doesn't add new rules; it modifies one existing rule (TASK 1's cache fix touches `framework/cache.ts`, not a rule) and adds JSDoc to source files (TASKs 3–6). Nothing to register in `.resist-lint.jsonc`.
- Verify the auto-loader still picks up every modified file: `node --import ./packages/shared/config/tooling/node/src/register-aliases.mjs packages/shared/config/tooling/lint/src/cli.ts --list-rules 2>&1 \| wc -l` matches baseline.

**Files**: read-only audit.

**Verification**:
- `git diff --name-only HEAD -- .resist-lint.jsonc` returns empty.
- `node ... --list-rules 2>&1 \| wc -l` matches baseline ± 0.

---

## TASK 8 — Integration Verification

**Status**: [x]

**Plan**:
- **Command registration check**: `grep -cE 'registerCommand\|command\.register' packages/shared/config/tooling/lint/src/` is unchanged from baseline.
- **Config settings read check**: TASK 1's modified `computeRuleHash` reads from `config.rules`. `grep -nE 'config\\.rules' packages/shared/config/tooling/lint/src/cli-helpers.ts` returns ≥1.
- **Class instantiation check**: every modified rule still exports a default value matching the rule schema. Verified by running `--list-rules`.
- **Dead code / unused export check**: no new exported symbols. The `/tmp/add-component-props-jsdoc.mjs` script lives outside `packages/` and is not committed. `grep -rn '@module' packages/shared/ui/src \| wc -l` rises by ~700 (one per touched .svelte file's component-shell).

**Files**: read-only audit.

**Verification**:
- All four checks above produce expected counts.
- `pnpm -w run qa:lint --tools 2>&1 \| grep -cE '^  ✗ '` returns 0.

---

## TASK 9 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint`
- Run: `pnpm -w run qa:test:coverage`
- Confirm all four exit 0.
- Confirm test count is unchanged from baseline (19,738) — TASKs 3–6 add comments only, no new tests except the 3 cache-test fixtures from TASK 1.
- Confirm workspace coverage thresholds still pass.

**Verification**:
- `pnpm -w run qa:format:check` exits 0.
- `pnpm -w run qa:lint` exits 0.
- `pnpm -w run qa:test:coverage` exits 0 — `pnpm -w run qa:test:coverage 2>&1 \| grep -c 'does not meet global threshold'` returns 0.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E 'Tests' \| grep -oE '[0-9]+ passed' \| head -1` shows pass count ≥ 19,741.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E 'Functions' \| grep -oE '[0-9]+\.[0-9]+%' \| head -1` shows percentage ≥ 91.00.

---

## TASK 10 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify TASK 1 cache fix: rule severity flips invalidate cache.
- Verify TASK 3 module-jsdoc add: 0 `jsdoc/require-module` errors workspace-wide.
- Verify TASK 4 function-jsdoc add: 0 `jsdoc/require-jsdoc` errors for `Exported function`.
- Verify TASK 5+6 type-jsdoc add: 0 `jsdoc/require-jsdoc` errors for `Exported type`.
- Verify TASK 9 full QA: all four `pnpm -w run qa:*` commands exit 0.
- Final aggregate commit message: `fix(lint): cache-invalidate on rule-severity change + clear 3193 jsdoc diagnostics`.

**Verification**:
- Verify `pnpm -w run qa:lint 2>&1 \| grep -cE '^  ✗ '` returns 0.
- Verify `pnpm -w run qa:test:coverage` exits 0 with no `does not meet global threshold` lines.
- Verify `git status --short` empty after the final commit.
- Verify `git log -1 --format=%s` matches the commit subject pattern.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix cache-invalidation bug (rule severity in cache hash) | -- |
| 2 | (Already shipped: `bf8e8c28`) Skip .md/.mdx/.html + bulk-add Props JSDoc | -- |
| 3 | Author `@module` JSDoc per-file for 3,107 files (7 batches) | 1 |
| 4 | Author JSDoc for 13 exported functions | 1 |
| 5 | Author JSDoc for 71 non-Svelte exported types | 1 |
| 6 | Author JSDoc for 2 README in-fence types | 1 |
| 7 | Register Rules + Config audit | 3–6 |
| 8 | Integration Verification | 7 |
| 9 | Full QA + Coverage | 8 |
| 10 | Final Verification + Commit | 9 |
