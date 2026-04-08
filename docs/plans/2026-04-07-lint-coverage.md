# @/lint Phase 1 — Improve Test Coverage Toward Near-100%

## Context

`qa:test:coverage` for `@/lint` already passes all 4 thresholds (S:90.11% B:77.03% F:90.18% L:90.13%). The user wants coverage pushed toward near 100%. The package has 558 files with gaps totaling S:1915 F:161 B:2901 uncovered items across 40 test files and 5104 tests. This plan targets the highest-impact files to maximize coverage improvement with reasonable effort.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Push all coverage metrics significantly higher (target S:95%+ B:85%+ F:95%+ L:95%+) via test-only changes targeting the highest-gap files.
**Architecture**: Vitest + v8 coverage; custom lint rules (TypeScriptRule, PackageJsonRule, WorkspaceRule patterns); AST visitors via oxc-parser; vi.mock for node:child_process, node:fs; tool orchestrator with execFileSync.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric     | Value                                 |
| ---------- | ------------------------------------- |
| Tests      | 5104 total (5104 pass, 40 test files) |
| Statements | 90.11% (17459/19374) — PASS           |
| Branches   | 77.03% (9734/12635) — PASS            |
| Functions  | 90.18% (1479/1640) — PASS             |
| Lines      | 90.13% (17234/19121) — PASS           |
| Thresholds | S:80% B:75% F:80% L:80%               |

### Top gap files (sorted by total uncovered)

| File                           | S uncov | F uncov | B uncov | Total | Notes                                                                                        |
| ------------------------------ | ------- | ------- | ------- | ----- | -------------------------------------------------------------------------------------------- |
| cli-helpers.ts                 | 79      | 12      | 93      | 184   | collapseShortJsonArrays pure fn, getGitChangedFiles, writeJsonSchema, \_runLintCore branches |
| svelte5-config/\_config-ast.ts | 33      | 1       | 39      | 73    | Pure AST helpers, no mocking needed                                                          |
| tools/svelte-check.ts          | 39      | 4       | 26      | 69    | Needs execFileSync mock                                                                      |
| framework/tool-orchestrator.ts | 19      | 4       | 18      | 41    | Workspace tool branches                                                                      |
| api.ts                         | 15      | 8       | 16      | 39    | Filtering branches                                                                           |
| cli.ts                         | 24      | 6       | 6       | 36    | 0% coverage, process.exit/stdin                                                              |
| framework/worker-entry.ts      | 24      | 5       | 6       | 35    | 0% coverage, Worker-only                                                                     |
| config/schema.ts               | 6       | 4       | 14      | 24    | Schema edge cases                                                                            |

---

## TASK 1 — cli-helpers.ts pure function + mockable tests (~40 new tests)

**Status**: [ ]

**Gap**: 184 total uncovered items. Several functions are fully untested: `collapseShortJsonArrays()` (pure), `getGitChangedFiles()` (needs execSync mock), `writeJsonSchema()` (needs fs mock).

**Plan**:

Create `src/cli-helpers-mocked.test.ts` (separate file to avoid contaminating existing pure-function test file with vi.mock):

**collapseShortJsonArrays() — 8 tests** (pure function, easy):

- Empty input returns empty string
- Single-element arrays collapse to one line
- Multi-element short arrays collapse to one line
- Long arrays stay expanded
- Nested objects inside arrays prevent collapsing
- Handles trailing commas after closing bracket
- Custom maxWidth parameter
- Preserves indentation level

**getGitChangedFiles() — 6 tests** (vi.mock node:child_process):

- `mode='staged'` calls `git diff --cached --name-only`
- `mode='head'` calls `git diff --name-only HEAD~1`
- Filters empty lines from output
- Returns empty array when execSync throws
- Filters by rootDir prefix
- Deduplicates results

**writeJsonSchema() — 5 tests** (vi.mock node:fs):

- Writes schema file with correct structure
- Skips write when already written (idempotent guard)
- Includes rule descriptions in schema
- Handles rules with optionsSchema
- Catches writeFileSync errors gracefully

**\_runLintCore branches via existing cli-run-linter pattern — ~15 tests**:
Add to existing `cli-run-linter-5.test.ts` or create `cli-run-linter-6.test.ts`:

- Stdin mode (stdinFilename + stdinContent)
- Category filtering (--category=)
- Stage filtering (--stage=)
- Severity override (--severity-override=off)
- Empty paths returns exit code 0
- Config validation failure returns exit code 1
- --no-cache deletes cache file
- Debug mode with --debug flag

**Files**:

- Create: `src/cli-helpers-mocked.test.ts`
- Create or Edit: `src/cli-run-linter-6.test.ts`

**Verification**: `pnpm --filter @/lint run qa:test` — all tests pass

---

## TASK 2 — \_config-ast.ts unit tests (~25 new tests)

**Status**: [ ]

**Gap**: 73 total uncovered (S:33 F:1 B:39). All functions are pure AST helpers — zero mocking needed.

**Plan**:

Create `src/rules/svelte5-config/_config-ast.test.ts`:

**getPropertyName() — 3 tests**: Identifier key, StringLiteral key, computed key returns undefined
**getStringValue() — 3 tests**: StringLiteral node, non-string node, template literal
**getBooleanValue() — 2 tests**: BooleanLiteral true/false, non-boolean returns undefined
**getNumericValue() — 2 tests**: NumericLiteral, non-numeric returns undefined
**getArrayElements() — 3 tests**: ArrayExpression with elements, empty array, non-array node
**getObjectProperties() — 2 tests**: ObjectExpression, non-object node
**getNestedValue() — 4 tests**: Single-level path, deep nested path, missing intermediate, empty path
**getPropertyEntries() — 2 tests**: Object with mixed property types, filtering by name
**getAdapterImport() — 3 tests**: adapter-auto import, adapter-cloudflare import, no adapter import
**collectPropertyPaths() — 3 tests**: Flat object, nested objects, mixed property types
**findFunctionCall() — 2 tests**: Found call expression, not found
**getImportSource() — 2 tests**: Import declaration source, non-import node
**getDefaultExportExpression() — 2 tests**: Export default expression, no default export

**Files**:

- Create: `src/rules/svelte5-config/_config-ast.test.ts`

**Verification**: `pnpm --filter @/lint run qa:test` — all tests pass

---

## TASK 3 — tool-orchestrator.ts + svelte-check.ts branches (~20 new tests)

**Status**: [ ]

**Gap**: tool-orchestrator 41 uncov, svelte-check 69 uncov. Both need execFileSync mocking.

**Plan**:

Extend `src/framework/tool-orchestrator.test.ts`:

- runWorkspaceTool with available tool — success path
- runWorkspaceTool with unavailable tool — skips
- runWorkspaceTool when tool throws — error handling
- runAllWorkspaceTools with mixed available/unavailable
- matchesPattern edge cases (glob vs prefix matching)
- runTool when isAvailable returns false

Extend `src/tools/tools.test.ts` (svelte-check section):

- transformSvelteCheckOutput with empty input
- transformSvelteCheckOutput with WARNING level
- transformSvelteCheckOutput with malformed line
- discoverSveltePackageDirs readdir error handling
- runSvelteCheckAllPackages execFileSync error with stdout
- runSvelteCheckAllPackages execFileSync error without stdout

**Files**:

- Edit: `src/framework/tool-orchestrator.test.ts`
- Edit: `src/tools/tools.test.ts`

**Verification**: `pnpm --filter @/lint run qa:test` — all tests pass

---

## TASK 4 — api.ts filtering branches + schema.ts edges (~15 new tests)

**Status**: [ ]

**Gap**: api.ts 39 uncov (filtering branches), schema.ts 24 uncov (edge cases).

**Plan**:

Extend `src/api.test.ts`:

- lint() with ruleIds filter — only matching rules run
- lint() with categories filter — only matching categories
- lint() with stage filter — only matching stages
- lint() with invalid locale — returns error
- lint() with no paths and no config.include — empty result
- lintSource() with error result from rule
- lint() with disabled rule in config — rule skipped

Extend `src/config/schema.test.ts`:

- generateJsonSchema includes rule optionsSchemas
- generateJsonSchema with rules that have no options
- validateConfig catches conflicting overrides
- fileMatchesPattern with complex globs
- loadConfig with empty JSONC file
- resolveRuleSeverity with override matching multiple patterns

**Files**:

- Edit: `src/api.test.ts`
- Edit: `src/config/schema.test.ts`

**Verification**: `pnpm --filter @/lint run qa:test` — all tests pass

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:

- No new rules or commands to register — test-only changes
- Verify all new test files are discovered by vitest config include pattern
- Verify no production code changes — no new exports to register
- Ensure new test file naming follows existing pattern (`*.test.ts`)

**Files**:

- Verify vitest project config includes `src/**/*.test.ts`

**Verification**: All new test files appear in vitest output, no orphaned tests

---

## TASK 6 — Integration Verification

**Status**: [ ]

**Plan**:

- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: N/A — no new config settings
- Class instantiation check: N/A — no new classes instantiated (test-only changes)
- Unused exports / dead code check: No new exports added, verify export count unchanged from baseline

**Verification**:

- `git diff --name-only` returns only `.test.ts` files (test-only changes)
- No orphaned exports or dead code introduced
- All existing 5104 tests still pass alongside new tests
- No production source files modified

---

## TASK 7 — Full QA + Coverage

**Status**: [ ]

**Plan**:

- Run: `pnpm -w run qa:format` (auto-fix formatting)
- Run: `pnpm -w run qa:format:check` (verify clean)
- Run: `pnpm --filter @/lint run qa:test:coverage`
- Verify all 4 thresholds still pass
- Verify test count increased from baseline 5104
- Target: S >= 92%, B >= 80%, F >= 92%, L >= 92%

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 8 — Final Verification + Commit

**Status**: [ ]

**Plan**:

- Verify all new test files exist and pass
- Verify coverage improved from baseline
- Verify no production source files modified (test-only)
- Verify existing 5104 tests still pass (no regressions)
- Commit with descriptive message

**Verification**:

- Test count >= 5200 (baseline 5104 + ~100 new)
- All coverage metrics pass thresholds and improved from baseline
- `pnpm --filter @/lint run qa:test:coverage` exits 0
- No regressions in existing tests

---

## Execution Order

| Task | Description                               | Depends On |
| ---- | ----------------------------------------- | ---------- |
| 1    | cli-helpers.ts pure + mockable tests      | --         |
| 2    | \_config-ast.ts unit tests                | --         |
| 3    | tool-orchestrator + svelte-check branches | --         |
| 4    | api.ts filtering + schema.ts edges        | --         |
| 5    | Register rules + config                   | 1-4        |
| 6    | Integration verification                  | 5          |
| 7    | Full QA + Coverage                        | 6          |
| 8    | Final verification + commit               | 7          |
