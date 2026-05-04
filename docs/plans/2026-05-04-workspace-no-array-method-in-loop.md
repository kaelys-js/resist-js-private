# Workspace QA — Fix 172 `complexity/no-array-method-in-loop` Errors

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-05-04
**Package**: workspace-wide — 60 files across `packages/shared/config/tooling/lint/src/` and `packages/products/storylyne/editor/src/`
**Goal**: Make `pnpm -w run qa:lint` exit 0 by resolving all 172 `complexity/no-array-method-in-loop` errors. Each fix hoists an array method (`.includes()`, `.find()`, `.some()`, `.filter()`) out of a loop body by pre-computing a Set, Map, or regex before the loop.
**Architecture**: The rule flags O(n²) patterns where an array/string search method is called inside a loop body. Fixes fall into 4 categories: (A) `.includes()` on constant strings → pre-compute regex or keep as-is if on a string not an array, (B) `.find()` on arrays → pre-compute Map, (C) `.some()`/`.filter()` on arrays → pre-compute Set, (D) nested loop `.includes()` on file content → restructure to single-pass. All fixes are mechanical per-site edits. No new dependencies or APIs introduced.

Each task is atomic: implement → verify (QA + tests) → update plan → next.

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
| Total errors | 172 |
| Rule | `complexity/no-array-method-in-loop` |
| Files with diagnostics | 60 |
| `@/lint` test count (must not regress) | 5,664 |
| `@storylyne/editor` test count (must not regress) | 1,498 |

---

## TASK 1 — Group A: `cli-helpers.ts` (16 errors, highest density)

**Status**: [ ]

**Gap**: 16 array method calls inside loops in the lint runner's CLI helpers — `.find()` on flags arrays, `.includes()` checks, `.filter()` in loop bodies, `.some()` in fix-application loops.

**Plan**:
- Read `cli-helpers.ts` at each flagged line (650, 1508, 1852 and surrounding).
- For each site: hoist the array method before the loop — pre-compute a Map/Set/regex as appropriate.
- Pattern A (`.includes()` on string literal): If calling `.includes('literal')` on a string variable (not an array), this is O(n) per call not O(n²) — the rule may be a false positive on string methods. Verify the call target is a string; if so, the fix is to extract the check to a helper or accept it. If calling on an array, pre-compute a Set.
- Pattern B (`.find()` on array): Build a Map keyed by the search criterion before the loop.
- Pattern C (`.some()`/`.filter()` on array): Build a Set before the loop.
- Run `pnpm --filter '@/lint' run qa:test` after all edits.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts`
- Test: `packages/shared/config/tooling/lint/src/cli-helpers.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/cli-helpers.ts 2>&1 | grep -c 'no-array-method-in-loop'` returns 0.
- `pnpm --filter '@/lint' run qa:test` passes with ≥ 5,664 tests.

---

## TASK 2 — Group B: vscode rules (24 errors across 4 files)

**Status**: [ ]

**Gap**: `no-unwired-commands.ts` (11), `no-unread-settings.ts` (10), `no-hardcoded-brand.ts` (9), `require-error-boundary.ts` (3), `no-unlocalized-strings.ts` (1) — nested loops with `.includes()` on file content and `.find()` on command/setting arrays.

**Plan**:
- For each file: read the loop structure, identify whether `.includes()` is on a string (file content) or array.
- String `.includes()` in nested loop: restructure to build all search patterns first, scan content once.
- Array `.find()`/`.some()`: pre-compute Map/Set before the outer loop.
- Process files in descending error count order.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/rules/vscode/no-unwired-commands.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/vscode/no-unread-settings.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/vscode/no-hardcoded-brand.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/vscode/require-error-boundary.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/vscode/no-unlocalized-strings.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/vscode/vscode-rules.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/rules/vscode/ 2>&1 | grep -c 'no-array-method-in-loop'` returns 0.
- `pnpm --filter '@/lint' run qa:test` passes with ≥ 5,664 tests.

---

## TASK 3 — Group C: workspace + plans + hygiene rules (27 errors across 9 files)

**Status**: [ ]

**Gap**: `cli-tools-help-version.ts` (9), `require-plan-structure.ts` (7), `no-orphaned-exports.ts` (6), `require-test-files.ts` (4), `require-concrete-verification.ts` (2), `enforce-peer-dependency-consistency.ts` (2), `enforce-benchmark-file-naming.ts` (2), `enforce-docs-naming.ts` (1), `no-dead-locale-keys.ts` (2).

**Plan**:
- Same fix patterns as TASK 1-2: hoist array methods before loops.
- For `require-plan-structure.ts`: multiple `.find()` on `plan.tasks` → build a Map of task patterns upfront.
- For `cli-tools-help-version.ts`: likely `.includes()` checks in a loop over CLI tools.
- Process in descending error count order.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/cli-tools-help-version.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/require-plan-structure.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/hygiene/no-orphaned-exports.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/require-test-files.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/require-concrete-verification.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/enforce-peer-dependency-consistency.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/enforce-benchmark-file-naming.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/workspace/enforce-docs-naming.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/hygiene/no-dead-locale-keys.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/plans/plans-rules.test.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/workspace/workspace-rules-1.test.ts`

**Verification**:
- Per-file `pnpm -w run qa:lint <file>` shows 0 `no-array-method-in-loop` hits.
- `pnpm --filter '@/lint' run qa:test` passes with ≥ 5,664 tests.

---

## TASK 4 — Group D: valibot rules (21 errors across 11 files)

**Status**: [ ]

**Gap**: `require-error-map.ts` (8), `error-map-complete.ts` (4), `schema-type-pair.ts` (3), `readonly-parse-result.ts` (2), `discriminated-unions.ts` (2), plus 6 single-error files (`prefer-template-literal`, `prefer-shared-schema`, `prefer-branded-types`, `no-recursive-without-lazy`, `no-generic-string-schema`, `require-description`).

**Plan**:
- Same mechanical fixes: hoist `.find()`/`.includes()`/`.some()` before loops.
- Process `require-error-map.ts` and `error-map-complete.ts` first (highest counts).

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/require-error-map.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/error-map-complete.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/schema-type-pair.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/readonly-parse-result.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/discriminated-unions.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/prefer-template-literal.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/prefer-shared-schema.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/prefer-branded-types.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/no-recursive-without-lazy.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/no-generic-string-schema.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/valibot/require-description.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/valibot/valibot-rules.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/lint/src/rules/valibot/ 2>&1 | grep -c 'no-array-method-in-loop'` returns 0.
- `pnpm --filter '@/lint' run qa:test` passes with ≥ 5,664 tests.

---

## TASK 5 — Group E: remaining lint framework + misc rule files (14 errors across 10 files)

**Status**: [ ]

**Gap**: `formatters.ts` (3), `result/validate-function-input.ts` (2), `comments/no-lint-disable.ts` (2), `testing/require-integration-location.ts` (2), `plan-parser.ts` (1), `require-project-test.ts` (1), `no-ts-node.ts` (3), `directives/no-suppression-in-new-code.ts` (1), `directives/max-suppressions-per-file.ts` (1), plus framework files: `tool-orchestrator.ts` (1), `rule-loader.ts` (1), `rule-context.ts` (1), `config/schema.ts` (1), `comments/require-section-order.ts` (1), `svelte5/_svelte-helpers.ts` (1), `svelte5-config/no-inline-preprocess.ts` (1), `typescript/no-union-params.ts` (1), `testing/require-test-suffix.ts` (1).

**Plan**:
- Mechanical fixes, same patterns.
- Process in any order — all single-digit error counts.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/framework/formatters.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/result/validate-function-input.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/comments/no-lint-disable.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/testing/require-integration-location.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/plans/plan-parser.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/package/require-project-test.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/package/no-ts-node.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/package/require-readme.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/no-suppression-in-new-code.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/directives/max-suppressions-per-file.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/tool-orchestrator.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/rule-loader.ts`
- Edit: `packages/shared/config/tooling/lint/src/framework/rule-context.ts`
- Edit: `packages/shared/config/tooling/lint/src/config/schema.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/comments/require-section-order.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/svelte5/_svelte-helpers.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/svelte5-config/no-inline-preprocess.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/typescript/no-union-params.ts`
- Edit: `packages/shared/config/tooling/lint/src/rules/testing/require-test-suffix.ts`
- Test: `packages/shared/config/tooling/lint/src/framework/formatters.test.ts`
- Test: `packages/shared/config/tooling/lint/src/rules/complexity/complexity-rules.test.ts`

**Verification**:
- Per-file `pnpm -w run qa:lint <file>` shows 0 `no-array-method-in-loop` hits.
- `pnpm --filter '@/lint' run qa:test` passes with ≥ 5,664 tests.

---

## TASK 6 — Group F: storylyne-editor files (17 errors across 10 files)

**Status**: [ ]

**Gap**: `(testing)/+layout.svelte` (7), `changelog/+page.server.ts` (4), `hooks.server.ts` (3), `hooks.client.ts` (3), `(testing)/tokens/+page.svelte` (2), plus 5 single-error files (`changelog/+page.svelte`, `browser-support/+page.svelte`, `ios-simctl.ts`, `vite-plugin-preview-ws.ts`, `compile-standalone/+server.ts`, `screenshot/+server.ts`, `compile-standalone/server.test.ts`, `e2e/icons.test.ts`).

**Plan**:
- For `.svelte` files: the array methods are in `<script>` blocks — same fix patterns apply.
- For `hooks.client.ts` `.includes()` on string: pre-compute a regex combining all exclusion patterns.
- For `hooks.server.ts`: similar string `.includes()` in loop.
- Process in descending error count order.

**Files**:
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/+layout.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/changelog/+page.server.ts`
- Edit: `packages/products/storylyne/editor/src/hooks.server.ts`
- Edit: `packages/products/storylyne/editor/src/hooks.client.ts`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/tokens/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/changelog/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/routes/(testing)/browser-support/+page.svelte`
- Edit: `packages/products/storylyne/editor/src/lib/server/simulator/ios-simctl.ts`
- Edit: `packages/products/storylyne/editor/src/lib/server/preview/vite-plugin-preview-ws.ts`
- Edit: `packages/products/storylyne/editor/src/routes/api/lens/compile-standalone/+server.ts`
- Edit: `packages/products/storylyne/editor/src/routes/api/lens/screenshot/+server.ts`
- Edit: `packages/products/storylyne/editor/src/routes/api/lens/compile-standalone/server.test.ts`
- Edit: `packages/products/storylyne/editor/e2e/icons.test.ts`

**Verification**:
- `pnpm -w run qa:lint packages/products/storylyne/editor 2>&1 | grep -c 'no-array-method-in-loop'` returns 0.
- `pnpm --filter @storylyne/editor run qa:test` passes with ≥ 1,498 tests.

---

## TASK 7 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No new rules or config changes — this is purely refactoring loop bodies.
- Verify `.resist-lint.jsonc` unchanged: `git diff HEAD -- .resist-lint.jsonc` is empty.
- Verify no rule files added or removed: `git diff --name-only --diff-filter=AD HEAD -- packages/shared/config/tooling/lint/src/rules/` is empty.

**Files**:
- No config edits expected.

**Verification**:
- `git diff --name-only HEAD -- .resist-lint.jsonc '*.json'` empty.
- No new rule files created.

---

## TASK 8 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/config/tooling/lint/src` unchanged from baseline.
- Config settings read check: `grep -rc 'config\.get(' packages/shared/config/tooling/lint/src` unchanged from baseline.
- Class instantiation check: no new classes — verify `git diff --stat HEAD -- packages/` shows only modifications, no new files.
- Dead code / unused export check: no exports added or removed — verify `git diff HEAD -- packages/ | grep -cE '^\+export '` equals `git diff HEAD -- packages/ | grep -cE '^\-export '`.

**Verification**:
- All four checks produce expected counts matching baseline.
- `pnpm -w run qa:lint` shows 0 `no-array-method-in-loop` errors.

---

## TASK 9 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint` — must exit 0.
- Run: `pnpm --filter '@/lint' run qa:test` — must show ≥ 5,664 passing.
- Run: `pnpm --filter @storylyne/editor run qa:test` — must show ≥ 1,498 passing.

**Verification**:
- `pnpm -w run qa:lint` exit code 0.
- `pnpm -w run qa:lint 2>&1 | grep -cE '^  ✗ '` outputs 0.
- `pnpm --filter '@/lint' run qa:test` shows ≥ 5,664 passed.
- `pnpm --filter @storylyne/editor run qa:test` shows ≥ 1,498 passed.

---

## TASK 10 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify `pnpm -w run qa:lint` exits 0 from a fresh shell.
- Verify all touched files match spec from TASKs 1-6.
- Verify clean tree after commit.
- Commit with message: `fix(lint): hoist array methods out of loops to eliminate O(n²) patterns`.

**Verification**:
- `pnpm -w run qa:lint` exit 0.
- `git log -1 --format=%s` matches commit message.
- `git status --short` empty after commit.
- `pnpm --filter '@/lint' run qa:test` shows ≥ 5,664 passed.
- `pnpm --filter @storylyne/editor run qa:test` shows ≥ 1,498 passed.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Group A: cli-helpers.ts (16 errors) | -- |
| 2 | Group B: vscode rules (24 errors) | -- |
| 3 | Group C: workspace + plans + hygiene rules (27 errors) | -- |
| 4 | Group D: valibot rules (21 errors) | -- |
| 5 | Group E: remaining lint framework + misc (14 errors) | -- |
| 6 | Group F: storylyne-editor files (17 errors) | -- |
| 7 | Register Rules + Config | 1-6 |
| 8 | Integration Verification | 7 |
| 9 | Full QA + Coverage | 8 |
| 10 | Final Verification + Commit | 9 |
