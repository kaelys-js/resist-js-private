# Workspace QA — Clear 228 qa:lint Diagnostics from Newly-Activated jsdoc Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-27
**Package**: workspace-wide (`packages/**`) + `@/lint` (`packages/shared/config/tooling/lint/src/rules/jsdoc/`)
**Goal**: Make `pnpm -w run qa:lint` exit 0 by resolving every one of the 228 diagnostics introduced when commit `37b69adc` enabled two previously-off jsdoc rules in `.resist-lint.jsonc` (`jsdoc/require-module`, `jsdoc/require-jsdoc`). Per the user mandate, every diagnostic is fixed at the code or rule level — no rule reverts, no severity downgrades.

**Architecture**:
- `jsdoc/require-module` (215 errors) and `jsdoc/require-jsdoc` (13 errors) both fire on TypeScript source through the oxc-runner script-block extraction path. They flag (a) genuinely-undocumented .ts / .svelte / .test.ts files and (b) false-positive matches from `.md` code-fence content extracted by `extractCodeFences()` and run as virtual `.ts`. The `.md` matches are not real source files — they are documentation examples — so the rule should not fire on them.
- **Rule fix at the linter level (require-module ONLY)**: refine `jsdoc/require-module` to short-circuit early when `context.file` ends in `.md`, `.mdx`, or `.html`. Eliminates 12 false positives (10 .md + 2 .html). `jsdoc/require-jsdoc` is intentionally LEFT firing on `.md`/`.mdx` because exported types declared in README code fences are real, documented examples that should themselves carry JSDoc — those 2 README diagnostics get a code-level fix in TASK 4.
- **Code fix for the remaining 216 real diagnostics**: add a top-of-file `/** … @module */` JSDoc to every flagged source file (70 .test.ts, 74 .svelte, 45 .ts, 14 misc), and add a one-line JSDoc above each of the 11 remaining exported functions / types. The 7 `XxxProps` types in shared `.svelte` components share the canonical pattern `/** Public component props for {ComponentName}. */` so that batch is mechanical.
- The 203 `@module`-add edits are too many for individual `Edit` invocations and qualify for a bulk-script approval marker. The marker will be requested explicitly via `AskUserQuestion`-style text before TASK 2 begins; the user (not Claude) creates `.claude/approved-bulk-script` to grant it. The script reads each flagged file path from `qa:lint` output, prepends the canonical `@module` JSDoc only when the file does not already begin with `/**`, and writes back via `node:fs` (no shell loops).

Each task is atomic: implement → verify (`pnpm -w run qa:lint --tools`) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `pnpm -w run qa:lint` exit code | 1 |
| `pnpm -w run qa:lint 2>&1 \| grep -cE '^  ✗ '` total errors | 228 |
| `jsdoc/require-module` errors | 215 |
| `jsdoc/require-jsdoc` errors | 13 |
| Affected files (require-module) | 212 unique |
| Affected files (require-jsdoc) | 12 unique |
| Workspace tests | 19,738 / 19,738 passing |
| Workspace coverage thresholds | All four pass |

**Distribution by extension (require-module):**
- 74 .svelte (components — `<script>` block extraction)
- 70 .test.ts (test files)
- 45 .ts (regular source)
- 10 .md (README code fences — false positives)
- 2 .svelte.test.ts
- 2 .server.ts
- 2 .server.test.ts
- 2 .html (false positives)
- 2 .d.ts
- 1 .svelte.ts

---

## TASK 1 — Refine `jsdoc/require-module` to skip `.md`/`.mdx`/`.html`

**Status**: [ ]

**Gap**: `jsdoc/require-module` fires on virtual `.ts` content extracted from `.md` code fences (10) and `.html` script blocks (2), producing 12 false positives. The `@module` convention applies to TypeScript source modules — not to README documentation or HTML shell pages. Per user direction, the rule should NOT apply to `.md`/`.mdx`/`.html`. (`jsdoc/require-jsdoc` is intentionally kept active for these extensions: exported types in README code fences DO need JSDoc; this is fixed in TASK 4.)

**Plan**:
- In `packages/shared/config/tooling/lint/src/rules/jsdoc/require-module.ts`, before the existing `hasModule` check, add `if (/\.(md|mdx|html)$/i.test(context.file)) { return []; }` to short-circuit.
- Do NOT modify `packages/shared/config/tooling/lint/src/rules/jsdoc/require-jsdoc.ts` — README code-fence exports without JSDoc are real diagnostics (handled in TASK 4).
- Add a fixture case to the rule unit tests asserting `[]` is returned for `.md` and `.html` paths.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/rules/jsdoc/require-module.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/jsdoc/jsdoc-rules.test.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/jsdoc/jsdoc-rules.test.ts`

**Verification**:
- `pnpm --filter @/lint exec vitest run --project lint src/rules/jsdoc/ 2>&1 \| grep -E '^\s*Tests'` shows new pass count ≥ baseline + 2 (positive + negative fixtures for .md/.html).
- `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-module'` drops from 215 to 203 (12 .md+.html false positives eliminated).
- `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-jsdoc'` is unchanged at 13 (the two README `Exported type` diagnostics remain real until TASK 4).

---

## TASK 2 — Author `/** … @module */` per-file for 203 flagged source files

**Status**: [ ]

**Gap**: 203 real source files (74 .svelte + 70 .test.ts + 45 .ts + 14 misc) lack the canonical top-of-file `@module` JSDoc. A mechanical bulk-script cannot produce accurate descriptions of what each file does — per the user's "don't weaken assertions" mandate, each `@module` must describe its file's actual purpose. **No bulk script. No `.claude/approved-bulk-script` marker.** Per-file edits authored after reading the file.

**Plan**:
- Process the 203 files in batches grouped by package/role for review locality and per-batch commits:
  - **Batch 2a** — `packages/shared/ui/src/<component>/<Component>.svelte` shells (~74 files). Read each component's `lens.ts` sibling (when present) for a one-line purpose summary; the canonical JSDoc form is `/**\n * <ComponentName> Svelte component — <one-line purpose>.\n *\n * @module\n */\n` placed inside the `<script lang="ts">` block above the first import.
  - **Batch 2b** — `packages/shared/ui/src/**/*.test.ts` + `packages/products/storylyne/editor/e2e/*.test.ts` + other test files (~72 files). Description form: `Tests for <subject> — <coverage scope>.`
  - **Batch 2c** — `packages/shared/config/tooling/lint/src/**` (~10 files). Description form derived from each file's exported public API (e.g. `<Action> <subject> for <consumer>`).
  - **Batch 2d** — `packages/shared/{schemas,utils}/**` (~25 files). Description form derived from the schema/utility's role (e.g. `<X> schema/util — <one-line purpose>`).
  - **Batch 2e** — `packages/products/storylyne/editor/src/**` non-test (~20 files). Description form derived from the route/lib/feature.
  - **Batch 2f** — Remaining (~2 misc).
- For each file: read it (≤30 lines), author the one-sentence purpose, prepend the JSDoc block. Commit per-batch.
- For `.svelte` files: place JSDoc inside the first `<script lang="ts">` block, indented to match. The rule scans the extracted script content; the JSDoc must be inside the script block, not the markup.
- Skip any file whose first 500 chars already match `/@module\b/` (already documented).

**Files**:
- Edit: ~203 source files across the 6 batches above. No new files created.
- Test: `pnpm --filter @storylyne/editor run qa:test` and `pnpm --filter @/ui run qa:test` after each batch (smoke-check that the prepended JSDoc didn't break any imports / svelte parses).

**Verification**:
- `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-module'` returns 0 after all batches.
- After each batch, `pnpm -w run qa:lint 2>&1 \| grep -cE 'jsdoc/require-module'` decreases monotonically.
- `pnpm --filter @storylyne/editor run qa:test 2>&1 \| grep -E '^\s*Tests' \| grep -oE '[0-9]+ passed' \| head -1` count unchanged from baseline.
- `pnpm --filter @/ui run qa:test 2>&1 \| grep -E '^\s*Tests' \| grep -oE '[0-9]+ passed' \| head -1` count unchanged from baseline.
- After each batch, run `pnpm -w exec biome format ...` if needed and ensure no formatter reverts the prepended JSDoc.

---

## TASK 3 — Add JSDoc to 4 exported functions

**Status**: [ ]

**Gap**: Four exported functions lack JSDoc:
- `packages/products/storylyne/editor/src/hooks.server.ts:198` — `handle`
- `packages/shared/config/tooling/lint/src/cli-helpers.ts:837` — `writeJsonSchema`
- `packages/shared/config/tooling/lint/src/config/schema.ts:95` — `loadConfig`
- `packages/shared/config/tooling/lint/src/framework/rule-loader.ts:87` — `loadAllRules`

**Plan**:
- For each function, add a JSDoc block above the export with:
  - One-sentence summary derived from the function's purpose (read the body to determine).
  - `@param` for each parameter (with type and description).
  - `@returns` describing the return value.
- All four are public/internal-public APIs already documented elsewhere; the JSDoc should match the conventions used by neighboring functions in the same file.

**Files**:
- Edit: `packages/products/storylyne/editor/src/hooks.server.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts`
- Edit: `packages/shared/config/tooling/lint/src/config/schema.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/rule-loader.ts`
- Test: existing tests for each touched file (`pnpm --filter @/lint run qa:test`, `pnpm --filter @storylyne/editor run qa:test`).

**Verification**:
- `pnpm -w run qa:lint 2>&1 \| grep -cE "jsdoc/require-jsdoc.*Exported function"` returns 0.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E '^\s*Tests'` pass count unchanged.

---

## TASK 4 — Add JSDoc to 9 exported types (7 in `.svelte` + 2 in README code fences)

**Status**: [ ]

**Gap**: Nine exported types lack JSDoc. Seven are `XxxProps` types in `packages/shared/ui/src/<component>/<Component>.svelte` (`v.InferOutput<typeof XxxPropsSchema>`); two are example types declared in a code fence inside `packages/shared/locale/README.md`:

- `about-dialog/AboutDialog.svelte:10` — `AboutDialogProps`
- `absolute-center/AbsoluteCenter.svelte:10` — `AbsoluteCenterProps`
- `accordion-menu/AccordionMenu.svelte:10` — `AccordionMenuProps`
- `achievement-badge/AchievementBadge.svelte:10` — `AchievementBadgeProps`
- `action-sheet/ActionSheet.svelte:10` — `ActionSheetProps`
- `activity-bar/ActivityBar.svelte:10` — `ActivityBarProps`
- `activity-feed/ActivityFeed.svelte:10` — `ActivityFeedProps`
- `packages/shared/locale/README.md:752` — `MyToolStrings` (inside ```ts fence)
- `packages/shared/locale/README.md:753` — `BuiltMyToolStrings` (inside ```ts fence)

**Plan**:
- For each `.svelte` file, prepend `/** Public component props for `<ComponentName>`. */` immediately above the `export type` line — mirrors the convention already used by neighbouring `<ComponentName>Props` exports in the same UI package (verified via `grep -B1 'export type.*Props = v.InferOutput' packages/shared/ui/src/`).
- For `README.md`, add a JSDoc comment immediately above each of the two `export type` lines INSIDE the code fence: `/** Output type inferred from MyToolStringsSchema (per-tool strings). */` and `/** Built locale wrapping MyToolStrings (with format helpers). */`. Keep the code fence tag as ```ts. The rule extracts code-fence content and runs require-jsdoc against the extracted content; the in-fence JSDoc satisfies it.

**Files**:
- Edit: 7 `.svelte` files listed above.
- Edit: `packages/shared/locale/README.md` (lines 750–755 area; add 2 `/** … */` lines).
- Test: `pnpm --filter @/ui run qa:test` (component prop types are consumed by tests; ensure none break).

**Verification**:
- `pnpm -w run qa:lint 2>&1 \| grep -cE "jsdoc/require-jsdoc.*Exported type"` returns 0.
- `pnpm --filter @/ui run qa:test 2>&1 \| grep -E '^\s*Tests'` pass count unchanged.

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:
- This phase doesn't add new rules; it modifies two existing ones (TASK 1) plus adds JSDoc to source files (TASKs 2–4). Nothing to register in `.resist-lint.jsonc` — the activations are already there from commit `37b69adc`.
- Verify the auto-loader still picks up the modified rule files and rule shape unchanged: `pnpm --filter @/lint exec node --import ./packages/shared/config/tooling/node/src/register-aliases.mjs packages/shared/config/tooling/lint/src/cli.ts --list-rules 2>&1 \| grep -cE '^jsdoc/'` matches baseline.

**Files**:
- Read-only audit: `.resist-lint.jsonc` (must stay byte-for-byte identical).

**Verification**:
- `git diff --name-only HEAD -- .resist-lint.jsonc` returns empty.
- `pnpm --filter @/lint exec node --import ./packages/shared/config/tooling/node/src/register-aliases.mjs packages/shared/config/tooling/lint/src/cli.ts --list-rules 2>&1 \| wc -l` matches baseline ± 0.

---

## TASK 6 — Integration Verification

**Status**: [ ]

**Plan**:
- **Command registration check**: `grep -cE 'registerCommand\|command\.register' packages/shared/config/tooling/lint/src/` is unchanged from baseline (this phase adds no CLI commands).
- **Config settings read check**: TASK 1's modified rules still read `context.file` and `context.content`. `grep -nE 'context\\.file' packages/shared/config/tooling/lint/src/rules/jsdoc/require-module.ts` returns ≥1.
- **Class instantiation check**: every modified rule still exports a default value matching `TypeScriptRuleSchema`. Verified by running the rule-loader: `pnpm --filter @/lint exec node ... --list-rules 2>&1 \| grep -cE '^jsdoc/'` matches baseline.
- **Dead code / unused export check**: no new helpers added. The `/tmp/add-module-jsdoc.mjs` script lives outside `packages/` and is not committed. `grep -rn '@module' packages/products/storylyne/editor/src \| wc -l` rises by ~70 (one per touched file).

**Files**: read-only audit.

**Verification**:
- All four checks above produce expected counts.
- `pnpm -w run qa:lint --tools 2>&1 \| grep -cE '^  ✗ '` returns 0.

---

## TASK 7 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint`
- Run: `pnpm -w run qa:test:coverage`
- Confirm all four exit 0.
- Confirm test count unchanged from baseline (19,738) — TASKs 2–4 add comments only, no new tests.
- Confirm workspace coverage thresholds still pass (functions ≥91%, branches ≥78%, statements ≥90%, lines ≥90%).

**Verification**:
- `pnpm -w run qa:format:check` exits 0.
- `pnpm -w run qa:lint` exits 0.
- `pnpm -w run qa:test:coverage` exits 0 — `pnpm -w run qa:test:coverage 2>&1 \| grep -c 'does not meet global threshold'` returns 0.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E 'Tests' \| grep -oE '[0-9]+ passed' \| head -1` shows pass count ≥ 19738.
- `pnpm -w run qa:test:coverage 2>&1 \| grep -E 'Functions' \| grep -oE '[0-9]+\.[0-9]+%' \| head -1` shows percentage ≥ 91.00.

---

## TASK 8 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify TASK 1 rule refinement: 0 `jsdoc/require-module` errors on `.md`/`.html` files.
- Verify TASK 2 module-jsdoc add: 0 `jsdoc/require-module` errors workspace-wide.
- Verify TASK 3 function-jsdoc add: 0 `jsdoc/require-jsdoc` errors for `Exported function` messages.
- Verify TASK 4 type-jsdoc add: 0 `jsdoc/require-jsdoc` errors for `Exported type` messages.
- Verify TASK 7 full QA: all four `pnpm -w run qa:*` commands exit 0.
- Commit per-task across the work; final aggregate commit message: `fix(lint): clear 228 jsdoc diagnostics — rule .md/.html skip + module/function/type JSDoc`.

**Verification**:
- Verify `pnpm -w run qa:lint 2>&1 \| grep -cE '^  ✗ '` returns 0.
- Verify `pnpm -w run qa:test:coverage` exits 0 with no `does not meet global threshold` lines.
- Verify `git status --short` empty after the final commit.
- Verify `git log -1 --format=%s` matches the commit subject pattern.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Refine require-module + require-jsdoc to skip .md/.mdx/.html | -- |
| 2 | Add `@module` JSDoc to 203 source files (bulk script, marker required) | 1 |
| 3 | Add JSDoc to 4 exported functions | -- |
| 4 | Add JSDoc to 7 `XxxProps` types in `.svelte` files | -- |
| 5 | Register Rules + Config audit | 1–4 |
| 6 | Integration Verification | 5 |
| 7 | Full QA + Coverage | 6 |
| 8 | Final Verification + Commit | 7 |
