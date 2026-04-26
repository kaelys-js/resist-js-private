# Workspace `qa:lint` Cleanup — Entire Workspace (only `@/cli` excluded)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: workspace-wide (`@/cli` excluded permanently via `.resist-lint.jsonc`)
**Goal**: Make `pnpm -w run qa:lint` exit 0 by clearing all 273 diagnostics across the workspace, including the previously-skipped `@/lint` package internals.
**Architecture**: Per-site Edits via the Edit tool. Bulk transforms allowed only via user-issued `.claude/approved-bulk-script` marker. No lint-rule disables, no `.oxlintrc.json` overrides, no `.resist-lint.jsonc` package-path additions (all blocked by `pre-edit-lint-config-deny.sh`). The `@/lint` package self-lints under the same strict rule set as all other packages — every JSDoc gap, async-without-await, negated condition, duplicate import, etc. must be fixed in source, not suppressed.

Each task is atomic: implement → verify per-package (`pnpm -w run qa:lint <pkg-path>`) → run package tests (`pnpm --filter <pkg> run qa:test`) → next task.

## Context

`@/cli` is excluded permanently in `.resist-lint.jsonc`. The previous cleanup (commit `6e0dba96`) cleared 273 errors across all packages **except** `@/lint`. The user now wants the entire workspace lint-clean, including `@/lint`. `@/lint` self-lints under its own strict rule set with JSDoc / async / negated-condition / duplicate-import / array-destructuring rules, so it accumulates 254 internal errors. A separate 19 errors are scattered: 4 from a stale `button.svelte.d.ts` shim (now superseded by `types.ts`), 1 from a duplicate `@/schemas/common` import in the new `badge/types.ts`, 4 from missing `@param`/`@returns` JSDoc on the `readSvelteWithTypes` / `readComponentSource` test helpers I added in commit `6e0dba96`, and 10 from older plan files in `docs/plans/` that pre-date the current `plans/*` lint rules. The plan executes under the active-plan binding contract: `Stop` hook will refuse to end the turn until `pnpm -w run qa:lint 2>&1 | grep -cE '^  [✗⚠] '` returns 0.

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `pnpm -w run qa:lint` exit code | 1 |
| Total `^  ✗` lines (diagnostics) | 273 |
| `@/lint` package internals | 254 |
| `docs/plans/*.md` plan-rule violations | 10 |
| `shared/ui/src/button/index.ts` (cross-package svelte-check) | 4 |
| `shared/ui/src/badge/types.ts` (no-duplicate-imports) | 1 |
| `shared/ui/src/lens/{extract-props,lint-lens}.test.ts` (require-param/returns) | 4 |
| `@/cli` paths in error output | 0 (correctly excluded) |
| `@storylyne/editor` test pass count (must not regress) | 1498 |
| `@/ui` test pass count (must not regress) | 7806 |

**Top-density files (`@/lint` internals)**:
- `rules/workspace/workspace-rules.test.ts` — 28
- `tools/tsgo-mocked.test.ts` — 24
- `tools/svelte-check-mocked.test.ts` — 15
- `cli-helpers.ts` — 12
- `tools/svelte-check.ts` — 8
- `rules/workspace/vscode-brand-sync.test.ts` — 8
- `tools/tsgo.ts` — 7
- 98 other `.ts` files in `@/lint` with 1–5 errors each

**`@/lint` error patterns** (from `pnpm -w run qa:lint packages/shared/config/tooling/lint`):

| Count | Rule | Fix mechanism |
|-------|------|----|
| 34 | `oxlint/require-param` | Add `@param` JSDoc lines |
| 21 | `oxlint/prefer-await-to-then` | Convert `.then(...)/.catch(...)/.finally(...)` chains to `await` + `try/catch/finally` |
| 21 | `oxlint/require-await` | Drop `async` keyword OR add a meaningful `await` |
| 19 | `oxlint/no-negated-condition` | Flip `if (!a) X else Y` → `if (a) Y else X` |
| 19 | `oxlint/require-returns` | Add `@returns` JSDoc |
| 17 | `oxlint/prefer-destructuring` | `const x = arr[0]` → `const [x] = arr` |
| 11 | `oxlint/prefer-template` | `'a' + b + 'c'` → `` `a${b}c` `` |
| 9 | `oxlint/import-first` | Move `import` above non-import code |
| 8 | `tsgo/TS2741` | Add `packageNames` field to options object literal |
| 8 | `oxlint/no-import-type-side-effects` | `import {…}` of pure types → `import type {…}` |
| 6 | `oxlint/no-lonely-if` | `if (a) { if (b) … }` → `if (a && b) …` or `else if` |
| 6 | `oxlint/no-await-in-loop` | Refactor to `Promise.all(…)` map |
| 5 | `oxlint/array-type` | `Array<X>` → `X[]` |
| 5 | `oxlint/no-duplicate-imports` (`node:fs`) | Merge multiple `import {…} from 'node:fs'` |
| 5 | `oxlint/no-duplicate-imports` (`@/lint/framework/types.ts`) | Merge |
| 4 | `oxlint/no-useless-concat` | `'a' + 'b'` literals → `'ab'` |
| 3 | `oxlint/prefer-number-isnan` | `isNaN(x)` → `Number.isNaN(x)` |
| 3 | `oxlint/no-template-curly-in-string` | Plain `"foo${bar}"` → backtick template literal |
| 3 | `oxlint/no-duplicate-imports` (`node:path`) | Merge |
| 3 | `oxlint/no-this-alias` (`Function … does not capture …`) | Promote to module-scope function |
| 3 | `oxlint/no-array-constructor` | `new Array(n)` → `Array.from({length:n})` |
| 3 | `oxlint/no-nested-ternary` | Extract intermediate `const` |
| 3 | `oxlint/no-import-type-side-effects` | `import type {…}` |
| 6 | `oxlint/no-unused-vars` (variables) | Prefix `_` or delete |
| 2 | `oxlint/filename-case` | Rename file to kebab-case (then update imports) |
| 2 | `oxlint/no-empty-function` | Add a body or convert to a `function noop()` re-export |
| 1 | `oxlint/prefer-find` | `arr.filter(p)[0]` → `arr.find(p)` |
| 1 | `oxlint/prefer-array-some` | `arr.filter(p).length > 0` → `arr.some(p)` |
| 1 | `oxlint/promise-param-names` | Rename Promise constructor param → `resolve` |
| 1 | `oxlint/no-jsdoc-tag-name` | Replace invalid JSDoc tag |
| 1 | `oxlint/dot-notation` | `obj['x']` → `obj.x` |
| 1 | `oxlint/max-dependencies` | Split file (382 imports vs max 100) |
| 1 | `oxlint/no-empty-file` | Delete empty file |
| 1 | `oxlint/no-await-thenable` | Drop `await` on non-Promise |
| 1 | `oxlint/no-conditional-await` | Refactor `await` inside `||`/`??`/ternary |

The 19 non-`@/lint` errors are addressed in TASK 5 / 6 / 7.

---

## TASK 1 — `@/lint` Group A: 5 high-density files (87 errors)

**Status**: [ ]

**Gap**: Five files account for 87 of 254 `@/lint` errors. Fixing these in isolation is the cheapest first cut and de-risks the bulk-Edit pattern library before fanning out.

**Plan**:
- Process each file end-to-end (read → per-site Edit → re-lint that file → next).
- Apply the rule-→-fix-mechanism table above per site.
- Order by descending density: `workspace-rules.test.ts` (28), `tsgo-mocked.test.ts` (24), `svelte-check-mocked.test.ts` (15), `cli-helpers.ts` (12), `svelte-check.ts` (8).
- For mock test files: the `Function X does not capture any variables` errors mean the helper should be hoisted to module scope. Promote outside `describe(…)`.
- Run package tests after each file: `pnpm --filter @/lint run qa:test`.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/workspace-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/tsgo-mocked.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/svelte-check-mocked.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/svelte-check.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/rules/workspace/workspace-rules.test.ts 2>&1 | grep -cE '^  ✗ '` returns 0
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/tools/tsgo-mocked.test.ts 2>&1 | grep -cE '^  ✗ '` returns 0
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/tools/svelte-check-mocked.test.ts 2>&1 | grep -cE '^  ✗ '` returns 0
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/cli-helpers.ts 2>&1 | grep -cE '^  ✗ '` returns 0
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/tools/svelte-check.ts 2>&1 | grep -cE '^  ✗ '` returns 0
- `pnpm --filter @/lint run qa:test 2>&1 | grep "Tests"` shows pass count >= baseline

---

## TASK 2 — `@/lint` Group B: medium-density files (40 errors)

**Status**: [ ]

**Gap**: Eight files with 7–8 errors each: tools (`tsgo.ts` 7), workspace rules (`vscode-brand-sync.test.ts` 8), plan rules (`plan-parser.ts` 5), api (`api.ts` 5), and four others. Same pattern library as TASK 1.

**Plan**:
- Read each file's diagnostics, apply per-site Edits.
- For `import()` type-annotation errors: replace inline `import('./x').Y` with top-of-file `import type { Y } from './x.js'`.
- For `tsgo/TS2741: Property 'packageNames' is missing`: locate the literal at `api.ts:167` and `api.ts:233`, add `packageNames: []` (or computed value if available).
- Re-lint after each file.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/tools/tsgo.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/vscode-brand-sync.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/plan-parser.ts`
- Edit: `packages/shared/config/tooling/lint/src/api.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/oxc-runner.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-run-linter-2.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/hygiene/hygiene-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/tool-orchestrator.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/tools/tsgo.ts packages/shared/config/tooling/lint/src/rules/workspace/vscode-brand-sync.test.ts packages/shared/config/tooling/lint/src/rules/plans/plan-parser.ts packages/shared/config/tooling/lint/src/api.ts packages/shared/config/tooling/lint/src/framework/oxc-runner.ts packages/shared/config/tooling/lint/src/cli-run-linter-2.test.ts packages/shared/config/tooling/lint/src/rules/hygiene/hygiene-rules.test.ts packages/shared/config/tooling/lint/src/framework/tool-orchestrator.ts 2>&1 | grep -cE '^  ✗ '` returns 0
- `pnpm --filter @/lint run qa:test 2>&1 | grep "Tests"` pass count >= baseline

---

## TASK 3 — `@/lint` Group C: low-density files (~127 errors across ~92 files)

**Status**: [ ]

**Gap**: ~92 files in `@/lint` with 1–4 errors each. Roughly half are workspace rules (`rules/workspace/*.ts`), the rest scattered across `tools/`, `rules/{plans,vscode,hygiene,jsdoc,primitives,svelte5,testing}/`, `framework/`, `config/`. Mechanical application of the pattern library.

**Plan**:
- Enumerate via `pnpm -w run qa:lint packages/shared/config/tooling/lint 2>&1 | awk '/^  ✗/{getline f; print f}' | grep -oE ',-\[[^:]+' | sed 's/,-\[//' | sort -u`.
- Process directory-by-directory for cache locality:
  - `tools/` (zsh, php, nix, ktlint, erlc, tools.test.ts, …) — 14 files, ~28 errors
  - `rules/workspace/*` (~10 individual rule files) — ~22 errors
  - `rules/plans/*` — ~5 errors
  - `rules/vscode/*` — ~4 errors
  - `rules/hygiene/*` — ~3 errors (no-bare-catch, no-orphaned-exports)
  - `rules/jsdoc/*` — `require-param.ts` site
  - `rules/package/require-tsgo.ts`
  - `rules/primitives/*` — 8 files, JSDoc gaps
  - `rules/svelte5/*` and `rules/svelte5-config/*` — `_svelte-helpers.ts`, `vite-optimizeDeps.ts`, `_config-ast.test.ts`
  - `rules/testing/*` — `require-{e2e,integration,test-suffix}-location.ts`, `testing-rules.test.ts`
  - `framework/*` — `file-fingerprint.ts`, `missing-tool.test.ts`, `rule-context*.ts`, `rule-loader.ts`
  - `config/schema.ts`
- Filename-case: 2 files with `oxlint/filename-case` need to be renamed to kebab-case AND every importing site updated. Use `git mv` then re-lint.
- For the empty-file diagnostic: identify and `git rm` the file, then prove no broken imports via `pnpm -w run qa:lint`.
- For the `max-dependencies` site (382 imports vs 100 max): identify which file (`framework/rule-loader.ts` is the likely candidate) and split into two sibling modules grouped by category.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/tools/zsh.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/php.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/nix.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/ktlint.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/erlc.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/tools.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/validate-stateless-utils.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/validate-root-package-config.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/validate-product-scripts.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/validate-formatting-config-consistency.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/shell-function-docblocks.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/require-package-metadata.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/require-oxlint-extends-root.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/require-biome-extends-root.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/no-tsconfig-duplicate-extends.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/no-linter-config-override.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/no-exports-overlap.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/no-case-collisions.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/gitlab-ci-standard-naming.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/vscode/vscode-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/vscode/no-unwired-commands.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/hygiene/no-bare-catch.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/hygiene/no-orphaned-exports.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/jsdoc/require-param.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/package/require-tsgo.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/plans-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/require-concrete-verification.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/status-dependency-order.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/no-bigint-number-mix.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/no-compare-different-types.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/no-date-mutation.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/no-float-equality.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/no-relational-null-undefined.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/no-toFixed-rounding.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/object-is-for-special.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/primitives/use-number-is-integer.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/svelte5-config/_config-ast.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/svelte5-config/vite-optimizeDeps.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/svelte5/_svelte-helpers.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/svelte5/svelte5-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/testing/require-e2e-location.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/testing/require-integration-location.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/testing/require-test-suffix.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/testing/testing-rules.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/file-fingerprint.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/missing-tool.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/rule-context.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/rule-context.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/rule-loader.ts`
- Edit: `packages/shared/config/tooling/lint/src/config/schema.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers-mocked.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-run-linter-1.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-run-linter-3.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-run-linter-stdin.test.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/lint 2>&1 | grep -cE '^  ✗ '` returns 0
- `pnpm --filter @/lint run qa:test 2>&1 | grep "Tests"` pass count >= baseline (recorded after TASK 1)
- All renamed files' new names found via `find packages/shared/config/tooling/lint -name '*[A-Z]*.ts'` returns nothing (kebab-case enforced)

---

## TASK 4 — Plan-file structural fixes (10 errors across 4 files)

**Status**: [ ]

**Gap**: Older plan files in `docs/plans/` were written before the current `plans/*` lint rules existed. They violate `plans/no-empty-plan-sections`, `plans/require-concrete-verification`, and `plans/require-test-files`.

**Plan**:
- For each `plans/no-empty-plan-sections` violation: add a `**Files**:` section listing files to create/modify (or note `(documentation-only — no source files modified)` if applicable).
- For each `plans/require-concrete-verification`: replace the generic line with one or more concrete commands containing exact paths and expected counts (e.g. `pnpm -w run qa:lint <path> 2>&1 | grep -cE '^  ✗ '` returns `0`).
- For each `plans/require-test-files`: add a `**Tests**:` section listing the test files that exercise each source change.
- Do NOT delete or archive old plans — the user did not authorize that. Only fix structure.

**Files**:
- Edit: `docs/plans/2026-04-25-vite-qa-lint-cleanup.md`
- Edit: `docs/plans/2026-04-26-lint-package-final.md`
- Edit: `docs/plans/2026-04-26-workspace-non-lint-non-cli-cleanup.md`
- Edit: `docs/plans/2026-04-26-workspace-qa-lint.md`

**Verification**:
- `pnpm -w run qa:lint docs/plans/2026-04-25-vite-qa-lint-cleanup.md docs/plans/2026-04-26-lint-package-final.md docs/plans/2026-04-26-workspace-non-lint-non-cli-cleanup.md docs/plans/2026-04-26-workspace-qa-lint.md 2>&1 | grep -cE '^  ✗ '` returns 0

---

## TASK 5 — Delete dead `button.svelte.d.ts` shim (4 svelte-check errors)

**Status**: [ ]

**Gap**: `packages/shared/ui/src/button/button.svelte.d.ts` was committed in commit `6e0dba96` as a hand-rolled type shim that duplicates the new `types.ts` export surface. It is dead code, and downstream consumers (`packages/products-template/app`) get spurious "Module '*.svelte' has no exported member 'ButtonProps'" errors because svelte-check resolves the .d.ts shim instead of `types.ts`.

**Plan**:
- Confirm dead-code status: `grep -rn 'button.svelte.d' packages/` should return 0 references.
- Delete via `git rm packages/shared/ui/src/button/button.svelte.d.ts` (user-permission destructive command — I will ask via ExitPlanMode allowedPrompts).
- Re-lint workspace.

**Files**:
- Edit: `packages/shared/ui/src/button/button.svelte.d.ts` (delete or rewrite as a re-export shim)

**Verification**:
- `ls packages/shared/ui/src/button/button.svelte.d.ts 2>&1` returns "No such file or directory"
- `pnpm -w run qa:lint packages/products-template/app 2>&1 | grep -cE 'has no exported member.*Button'` returns 0
- `pnpm -w run qa:lint packages/shared/ui packages/products-template/app 2>&1 | grep -cE '^  ✗ '` returns 0

---

## TASK 6 — `badge/types.ts` duplicate-import fix (1 error)

**Status**: [ ]

**Gap**: `packages/shared/ui/src/badge/types.ts` line 18 imports `Bool` from `@/schemas/common` after already importing `StrSchema`/`BoolSchema` from the same module on a prior line. `oxlint/no-duplicate-imports` flags this.

**Plan**:
- Read `badge/types.ts` lines 17-18 to confirm the duplicate.
- Merge the two imports into one statement: `import { StrSchema, BoolSchema, type Bool } from '@/schemas/common';`.
- Re-lint to verify the rule is satisfied.

**Files**:
- Edit: `packages/shared/ui/src/badge/types.ts`
- Test: `packages/shared/ui/src/lens/lint-lens.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/ui/src/badge/types.ts 2>&1 | grep -cE '^  ✗ '` returns 0

---

## TASK 7 — Lens test JSDoc on new helpers (4 errors)

**Status**: [ ]

**Gap**: The `readSvelteWithTypes` and `readComponentSource` helpers I added to `lint-lens.test.ts` and `extract-props.test.ts` in commit `6e0dba96` already have JSDoc but the lint runner says they're missing `@param` and `@returns`. Likely the JSDoc block isn't directly attached or the parameter name doesn't match.

**Plan**:
- Read the failing line numbers (`extract-props.test.ts:21:30`, `extract-props.test.ts:21:1`, `lint-lens.test.ts:69:30`, `lint-lens.test.ts:69:1`).
- Add explicit `@param sveltePath/filePath - Absolute path to the primary .svelte file` and `@returns` lines if missing, or fix tag name format to satisfy `oxlint/require-param`.

**Files**:
- Edit: `packages/shared/ui/src/lens/extract-props.test.ts`
- Edit: `packages/shared/ui/src/lens/lint-lens.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/ui/src/lens/extract-props.test.ts packages/shared/ui/src/lens/lint-lens.test.ts 2>&1 | grep -cE '^  ✗ '` returns 0
- `pnpm --filter @/ui run qa:test 2>&1 | grep "Tests"` shows `7806 passed` (or higher)

---

## TASK 8 — Register Rules + Config

**Status**: [ ]

**Plan**:
- This phase only fixes existing source/JSDoc/import issues; no new rules added.
- Verify no new `oxlint` rules were added: `git diff --name-only HEAD -- '.oxlintrc.json' '.resist-lint.jsonc' 'packages/shared/config/tooling/lint/src/rules/'` should NOT show any new `register*` calls or rule additions.
- Verify any renamed files (TASK 3 filename-case) are re-exported from the appropriate `index.ts` if they were previously re-exported.
- For the `max-dependencies` split (TASK 3): verify the new module is registered where the original was.

**Files**:
- Read-only audits via `git diff` and `grep`.
- No edits expected unless TASK 3's split / rename leaves an orphaned export.

**Verification**:
- `git diff --name-only HEAD -- '.oxlintrc.json' '.resist-lint.jsonc'` is empty
- `pnpm -w run qa:lint --tools 2>&1 | grep -cE '^  ✗ '` returns 0 (validates `--tools` mode still works after `tools/*.ts` edits)
- After TASK 3 splits: `grep -c 'export' <new-file>` matches the count split off, and `grep -rn '<new-symbol>' packages/shared/config/tooling/lint/src/` shows at least one importer

---

## TASK 9 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: lint package has no slash-commands; `grep -rc 'registerCommand' packages/shared/config/tooling/lint/src` is unchanged from baseline (likely 0).
- Config settings read check: `grep -rc 'config\.get\|loadConfig' packages/shared/config/tooling/lint/src` is unchanged from baseline.
- Class instantiation check: `grep -rn '^export class\|^class ' packages/shared/config/tooling/lint/src | wc -l` is unchanged from baseline.
- Dead code / unused export check: `pnpm -w run qa:lint 2>&1 | grep -cE 'is declared but never used|is imported but never used'` returns 0 (TASK 1–3 deletions are now real).
- Cross-package consumer check: `pnpm -w run qa:lint packages/products-template/app packages/products/storylyne/editor 2>&1 | grep -cE '^  ✗ '` returns 0.
- Workspace rule integration check: `pnpm -w run qa:lint --tools 2>&1 | grep -cE '^  ✗ '` returns 0.

**Files**:
- No edits expected; this task is read-only verification.

**Verification**:
- All five `grep`/`wc` commands above produce the expected counts (most equal to baseline; the unused-vars count drops from 7 → 0).
- `pnpm -w run qa:lint 2>&1 | grep -cE '^  ✗ '` returns 0 (full workspace clean).

---

## TASK 10 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format` — exits 0.
- Run: `pnpm -w run qa:format:check` — exits 0.
- Run: `pnpm -w run qa:lint` (workspace, no path arg — implicitly excludes `@/cli` via `.resist-lint.jsonc`) — exits 0.
- Run: `pnpm --filter @/lint run qa:test` — pass count >= baseline (recorded post-TASK-1).
- Run: `pnpm --filter @/ui run qa:test` — `Tests 7806 passed`.
- Run: `pnpm --filter @storylyne/editor run qa:test` — `Tests 1498 passed`.

**Verification**:
- `pnpm -w run qa:lint` exit code is 0
- `pnpm -w run qa:lint 2>&1 | grep -cE '^  [✗⚠] '` outputs 0
- `pnpm --filter @/lint run qa:test 2>&1 | grep "Tests "` pass count >= baseline
- `pnpm --filter @/ui run qa:test 2>&1 | grep "Tests "` shows `7806 passed` (or higher)
- `pnpm --filter @storylyne/editor run qa:test 2>&1 | grep "Tests "` shows `1498 passed` (or higher)

---

## TASK 11 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all touched files match the spec from TASKS 1–7.
- Verify `pnpm -w run qa:lint` exit 0 from a fresh shell (cache invalidation via `find packages -name '*.ts' -newer .git/HEAD -exec touch {} +` then re-run).
- Verify the `button.svelte.d.ts` shim is gone: `ls packages/shared/ui/src/button/button.svelte.d.ts` returns "No such file or directory".
- Verify clean working tree after commit: `git status --short` is empty (excluding generated `.claude/last-test-baseline.json`).
- Commit with message: `fix: clear all qa:lint diagnostics workspace-wide (incl. @/lint)`.

**Verification**:
- `pnpm -w run qa:lint` exit 0
- `git log -1 --format=%s` matches the commit message
- `git status --short` is empty (or shows only `.claude/last-test-baseline.json`)
- `pnpm --filter @/lint run qa:test`, `@/ui`, `@storylyne/editor` re-runs all show pass counts >= baselines from TASK 10

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | `@/lint` Group A: 5 high-density files (87 errors) | -- |
| 2 | `@/lint` Group B: 8 medium-density files (40 errors) | 1 |
| 3 | `@/lint` Group C: ~92 low-density files (~127 errors) | 1, 2 |
| 4 | Plan-file structural fixes (10 errors, 4 plan files) | -- |
| 5 | Delete dead `button.svelte.d.ts` shim (4 errors) | -- |
| 6 | `badge/types.ts` duplicate-import (1 error) | -- |
| 7 | Lens test JSDoc on new helpers (4 errors) | -- |
| 8 | Register Rules + Config audit | 1–7 |
| 9 | Integration Verification | 8 |
| 10 | Full QA + Coverage | 9 |
| 11 | Final Verification + Commit | 10 |
