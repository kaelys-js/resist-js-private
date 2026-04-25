# VSCode Extension Phase 76 — Enable JSDoc + Comments Lint Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-02
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Enable 12 JSDoc/comments lint rules for the vscode extension via overrides and fix all resulting 217 errors.
**Architecture**: Linter bug fix (override pre-filter), then mechanical JSDoc/comment formatting fixes across ~30 files.

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
| Tests | 331 total (331 pass) + 97 schema tests |
| Lint errors (vscode) | 0 |
| New rule errors | 217 (after enabling 12 rules) |

---

## TASK 0 — Linter bug fix: override pre-filter

**Status**: [x]

**Gap**: Globally-off rules are pre-filtered at `cli-helpers.ts:988` before per-file override resolution, so overrides that set `"off"→"error"` never take effect.

**Plan**:
- Add `isRuleEnabledAnywhere()` to `config/schema.ts`
- Fix pre-filters in `cli-helpers.ts` at lines 987-992 and 1354-1356
- Add vscode override block to `.resist-lint.jsonc`
- Write 7 tests for `isRuleEnabledAnywhere()`

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/config/schema.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts`
- Edit: `packages/shared/config/tooling/lint/src/index.ts`
- Edit: `.resist-lint.jsonc`
- Test: `packages/shared/config/tooling/lint/src/config/schema.test.ts`

**Verification**: `pnpm qa:test -- packages/shared/config/tooling/lint/src/config/schema.test.ts` shows 97 tests pass including 7 new isRuleEnabledAnywhere tests

---

## TASK 1 — Fix comments/no-lint-disable (2 errors)

**Status**: [x]

**Gap**: Lint-disable comments in `diagnostic-filter.ts` (eslint-disable) and `config.test.ts` (@ts-expect-error).

**Plan**:
- Remove eslint-disable comment, add `no-array-for-each` to `allowedTargets` in ruleOptions
- Replace `@ts-expect-error` import with type cast pattern

**Files**:
- Edit: `src/lint/diagnostic-filter.ts`
- Edit: `src/shared/config.test.ts`
- Edit: `.resist-lint.jsonc`

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep no-lint-disable` returns 0 matches

---

## TASK 2 — Fix comments/require-section-marker-style (22 errors)

**Status**: [~]

**Gap**: Non-canonical section markers (dashes, block comments) instead of `// ===` style.

**Plan**:
- Convert all `// ---` and `/* --- */` dividers to `// =============================================================================` style
- Keep section titles between markers

**Files**:
- Edit: `scripts/generate-manifest.ts` (7 markers)
- Edit: 10 test files (15 markers)
- Test: `src/lint/provider.test.ts`

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep require-section-marker-style` returns 0 matches

---

## TASK 3 — Fix comments/require-section-order (2 errors)

**Status**: [~]

**Gap**: Sections out of order in `import-sorting.ts` and `profiling.ts`.

**Plan**:
- Reorder sections to: Types → Constants → Helpers → Exported/API
- Verify section markers match canonical `// ===` style after reordering

**Files**:
- Edit: `src/lint/import-sorting.ts`
- Edit: `src/lint/profiling.ts`
- Test: `src/lint/provider.test.ts`

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep require-section-order` returns 0 matches

---

## TASK 4 — Fix comments/require-blank-line-groups (112 errors)

**Status**: [~]

**Gap**: Missing blank lines between statements of different groups (declaration↔control↔expression).

**Plan**:
- Add blank lines at all 112 flagged locations across ~20 files
- Run lint after each file batch to verify blank-line-group count decreases

**Files**:
- Edit: ~20 source and test files

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep require-blank-line-groups` returns 0 matches

---

## TASK 5 — Fix jsdoc/require-module (7 errors)

**Status**: [~]

**Gap**: 7 test files missing `@module` JSDoc tag.

**Plan**:
- Add `@module` to top-level JSDoc in each test file
- Ensure `@module` tag matches the file's module path

**Files**:
- Edit: 7 test files

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep require-module` returns 0 matches

---

## TASK 6 — Fix jsdoc/require-param (44 errors)

**Status**: [~]

**Gap**: `@param` tags missing `{Type}` annotations.

**Plan**:
- Add `{Type}` matching TypeScript parameter types to all `@param` tags
- Verify type annotations match actual function signatures

**Files**:
- Edit: 11 source files

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep require-param` returns 0 matches

---

## TASK 7 — Fix jsdoc/require-returns (9 errors)

**Status**: [x]

**Gap**: `@returns` tags missing `{Type}` annotations.

**Plan**:
- Add `{Type}` matching return types to all `@returns` tags
- Verify type annotations match actual function return types

**Files**:
- Edit: `src/lint/diff-preview.ts`, `src/lint/profiling.ts`, `src/locale/schema.ts`, `src/lint/provider.ts`, `src/lint/watcher.ts`, `src/lint/per-folder.ts`, `src/lint/import-sorting.ts`
- Test: `src/lint/provider.test.ts`

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep require-returns` returns 0 matches

---

## TASK 8 — Fix jsdoc/require-example (19 errors)

**Status**: [~]

**Gap**: Exported functions missing `@example` blocks with ` ```typescript ` code fences.

**Plan**:
- Add `@example` blocks with realistic usage examples to all 19 exported functions
- Use ` ```typescript ` code fences inside each `@example` block

**Files**:
- Edit: 11 source files

**Verification**: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep require-example` returns 0 matches

---

## TASK 9 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Verify all override rules are correctly configured in `.resist-lint.jsonc`
- Verify `isRuleEnabledAnywhere` is exported from lint package index
- Verify no orphaned code

**Verification**: `grep -c "isRuleEnabledAnywhere" packages/shared/config/tooling/lint/src/index.ts` outputs >= 1; `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -c "override"` outputs 0 errors

---

## TASK 10 — Integration Verification

**Status**: [ ]

**Plan**:
- Verify all declared commands have matching registerCommand calls
- Verify all config settings are read via config.get somewhere in code
- Verify all feature classes are instantiated in the entry point
- Verify no unused exports or dead code (created but never imported)

**Verification**:
- `grep -c "registerCommand" packages/shared/config/tooling/vscode/src/lint/commands.ts` matches declared command count
- `grep -c "config.get" packages/shared/config/tooling/vscode/src/shared/config.ts` confirms all config settings read
- `pnpm --filter @resist/vscode run qa:test` passes with no orphaned exports

---

## TASK 11 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode`
- Run: `pnpm -w run qa:format`
- Run: `pnpm --filter @resist/vscode run qa:test`
- Verify 0 vscode lint errors, all tests pass

**Verification**: All pnpm commands exit 0

---

## TASK 12 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify lint error count dropped from 217 to 0
- Verify test count >= 331 (vscode) + 97 (schema)
- Verify all 12 rules now enforced
- Commit with descriptive message

**Verification**:
- `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -c "error"` outputs 0
- `pnpm --filter @resist/vscode run qa:test 2>&1 | grep "Tests"` shows >= 331 tests passing
- `pnpm -w run qa:lint --tools -- packages/shared/config/tooling/vscode 2>&1 | grep -c "jsdoc\|comments"` confirms all 12 rules enforced

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 0 | Linter bug fix | -- |
| 1 | Fix no-lint-disable | 0 |
| 2 | Fix section-marker-style | -- |
| 3 | Fix section-order | 2 |
| 4 | Fix blank-line-groups | -- |
| 5 | Fix require-module | -- |
| 6 | Fix require-param | -- |
| 7 | Fix require-returns | -- |
| 8 | Fix require-example | -- |
| 9 | Register rules + config | 0-8 |
| 10 | Integration verification | 9 |
| 11 | Full QA + Coverage | 10 |
| 12 | Final verification + commit | 11 |
