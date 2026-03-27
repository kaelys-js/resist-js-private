# @/lint Phase 11 — Port Safety, Shell, and Lint Rules from Shell Scripts

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-27
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 9 rules from `check.safety.sh`, `check.shell.sh`, and `check.lint.sh` to TypeScript workspace rules: no-utf8-bom, no-trailing-whitespace, no-tabs-in-code, require-utf8-encoding, no-dangerous-shell-commands, no-missing-shebang, no-debug-statements, no-todo-comments, no-long-lines.
**Architecture**: All 9 are WorkspaceRules with `scope: 'workspace'`. All use `ctx.allFiles()` + `ctx.readFile()`. Rules 5-6 filter `.sh` files only. Rules 7-8 filter `.ts` files excluding `.test.ts`. All `fixable: false`.

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
| Tests | 2566 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 21 |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — New Rule: `workspace/no-utf8-bom`

### Task 1.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-utf8-bom.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. 3 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags files with UTF-8 BOM` — mock file with `\uFEFF` prefix, expect 1 result with severity `error`
  - `passes for files without BOM` — mock clean file, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-utf8-bom.ts`:
  - Iterate `ctx.allFiles()`, read each file via `ctx.readFile()`
  - Check if content starts with `\uFEFF` (BOM character)
  - If BOM found: error `File contains UTF-8 BOM: ${relativePath}`
  - Tip: `Remove the UTF-8 BOM byte sequence (EF BB BF) from the file`
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-utf8-bom.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — New Rule: `workspace/no-trailing-whitespace`

### Task 2.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-trailing-whitespace.ts`. `fixable: false`, `scope: 'workspace'`, severity `warning`. 3 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags lines with trailing whitespace` — mock file with trailing spaces, expect 1+ results with severity `warning`
  - `passes for clean files` — mock file without trailing whitespace, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-trailing-whitespace.ts`:
  - Iterate `ctx.allFiles()`, read each file via `ctx.readFile()`
  - Split into lines, check each line for trailing `\s+$` pattern
  - Report each match with line number
  - Severity: `warning`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-trailing-whitespace.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — New Rule: `workspace/no-tabs-in-code`

### Task 3.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-tabs-in-code.ts`. `fixable: false`, `scope: 'workspace'`, severity `warning`. 3 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags files with tab characters` — mock file with `\t`, expect 1+ results with severity `warning`
  - `passes for files without tabs` — mock file with spaces only, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-tabs-in-code.ts`:
  - Iterate `ctx.allFiles()`, read each file via `ctx.readFile()`
  - Split into lines, check each line for `\t` character
  - Report each match with line number
  - Severity: `warning`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-tabs-in-code.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — New Rule: `workspace/require-utf8-encoding`

### Task 4.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/require-utf8-encoding.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. 3 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags files with non-UTF-8 bytes` — mock file with invalid byte sequence (e.g., lone surrogate), expect 1 result with severity `error`
  - `passes for valid UTF-8 files` — mock clean UTF-8 file, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/require-utf8-encoding.ts`:
  - Iterate `ctx.allFiles()`, read each file via `ctx.readFile()`
  - Check for replacement character `\uFFFD` (indicates invalid UTF-8 bytes that Node couldn't decode)
  - If found: error `File contains non-UTF-8 encoding: ${relativePath}`
  - Tip: `Convert the file to UTF-8 encoding`
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/require-utf8-encoding.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — New Rule: `workspace/no-dangerous-shell-commands`

### Task 5.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-dangerous-shell-commands.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. 5 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags rm -rf / in shell files` — mock `.sh` file with `rm -rf /`, expect 1 result with severity `error`
  - `flags fork bombs in shell files` — mock `.sh` file with `:(){ :|:& };:`, expect 1 result
  - `ignores safe shell commands` — mock `.sh` file with safe content, expect 0 results
  - `ignores non-.sh files` — mock `.ts` file with `rm -rf /`, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-dangerous-shell-commands.ts`:
  - Iterate `ctx.allFiles()`, filter to `.sh` files only
  - Read each file via `ctx.readFile()`
  - Check for patterns: `rm -rf /`, `rm -rf /*`, `:(){ :|:& };:`, `mkfs.`, `dd if=`, `> /dev/sda`
  - Report each match with line number
  - Severity: `error`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-dangerous-shell-commands.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — New Rule: `workspace/no-missing-shebang`

### Task 6.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-missing-shebang.ts`. `fixable: false`, `scope: 'workspace'`, severity `warning`. 4 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags .sh files missing shebang` — mock `.sh` file without `#!`, expect 1 result with severity `warning`
  - `passes for .sh files with shebang` — mock `.sh` file with `#!/bin/bash`, expect 0 results
  - `ignores non-.sh files` — mock `.ts` file without shebang, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-missing-shebang.ts`:
  - Iterate `ctx.allFiles()`, filter to `.sh` files only
  - Read each file via `ctx.readFile()`
  - Check if first line starts with `#!`
  - If missing: warning `Shell script missing shebang: ${relativePath}`
  - Tip: `Add #!/usr/bin/env bash as the first line`
  - Severity: `warning`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-missing-shebang.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — New Rule: `workspace/no-debug-statements`

### Task 7.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-debug-statements.ts`. `fixable: false`, `scope: 'workspace'`, severity `warning`. 5 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags console.log in .ts files` — mock `.ts` file with `console.log(...)`, expect 1 result with severity `warning`
  - `flags debugger statement in .ts files` — mock `.ts` file with `debugger;`, expect 1 result
  - `ignores test files` — mock `.test.ts` file with `console.log`, expect 0 results
  - `ignores non-.ts files` — mock `.sh` file with `console.log`, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-debug-statements.ts`:
  - Iterate `ctx.allFiles()`, filter to `.ts` files excluding `.test.ts` and `.spec.ts`
  - Read each file via `ctx.readFile()`
  - Check for patterns: `console.log`, `console.debug`, `console.dir`, `debugger`, `alert(`
  - Report each match with line number
  - Severity: `warning`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-debug-statements.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 8 — New Rule: `workspace/no-todo-comments`

### Task 8.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-todo-comments.ts`. `fixable: false`, `scope: 'workspace'`, severity `warning`. 4 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags TODO comments in .ts files` — mock `.ts` file with `// TODO: fix this`, expect 1 result with severity `warning`
  - `flags FIXME comments in .ts files` — mock `.ts` file with `// FIXME: broken`, expect 1 result
  - `ignores test files` — mock `.test.ts` file with `// TODO`, expect 0 results
  - `passes for files without TODO/FIXME` — mock clean `.ts` file, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-todo-comments.ts`:
  - Iterate `ctx.allFiles()`, filter to `.ts` files excluding `.test.ts` and `.spec.ts`
  - Read each file via `ctx.readFile()`
  - Check for patterns: `TODO`, `FIXME`, `HACK`, `XXX` (case-sensitive, in comments)
  - Report each match with line number
  - Severity: `warning`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-todo-comments.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 9 — New Rule: `workspace/no-long-lines`

### Task 9.1: Tests + Implementation

**Status**: [x] — Verified: Rule at `rules/workspace/no-long-lines.ts`. `fixable: false`, `scope: 'workspace'`, severity `warning`. 3 tests. 2602 total tests pass.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:
  - `flags lines exceeding 160 characters` — mock file with 161-char line, expect 1 result with severity `warning`
  - `passes for lines within limit` — mock file with 160-char line, expect 0 results
  - `has correct rule metadata` — check id, scope, fixable
- Create `rules/workspace/no-long-lines.ts`:
  - Iterate `ctx.allFiles()`, read each file via `ctx.readFile()`
  - Split into lines, check each line's length against 160 character limit
  - Report each match with line number and actual length
  - Severity: `warning`, `fixable: false`
  - Categories: `['workspace', 'safety']`, Stages: `['lint', 'ci']`

**Files**:
- Create: `rules/workspace/no-long-lines.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 10 — Register New Rules in Config

### Task 10.1: Add rules to .resist-lint.jsonc

**Status**: [x] — Verified: All 9 rules registered in `.resist-lint.jsonc`. 30 total workspace rules (21 + 9).

**Plan**:
- Add to `.resist-lint.jsonc` under `"rules"`:
  ```jsonc
  "workspace/no-dangerous-shell-commands": "error",
  "workspace/no-debug-statements": "warn",
  "workspace/no-long-lines": "warn",
  "workspace/no-missing-shebang": "warn",
  "workspace/no-tabs-in-code": "warn",
  "workspace/no-todo-comments": "warn",
  "workspace/no-trailing-whitespace": "warn",
  "workspace/no-utf8-bom": "error",
  "workspace/require-utf8-encoding": "error",
  ```
- Run QA to verify no regressions

**Files**: `.resist-lint.jsonc`

**Verification**: `pnpm --filter @/lint qa:type-check && pnpm -w run qa:test`

---

## TASK 11 — Full QA Pass

### Task 11.1: Run complete QA suite

**Status**: [x] — Verified: type-check passes, format passes, 2602 tests pass (all 20 tasks successful).

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:test`
- Fix any failures

**Verification**: All QA commands exit 0 for @/lint scope

### Task 11.2: Verify test coverage thresholds

**Status**: [x] — Verified: Statements 90.5% (≥80%), Branches 76.36% (≥75%), Functions 85.17% (≥80%), Lines 90.47% (≥80%). 2602 tests (baseline 2566, +36 new).

**Plan**:
- Run: `pnpm --filter @/lint qa:test:coverage`
- Check thresholds: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%
- Check test count is at or above baseline (2566)

**Verification**: Coverage command exits 0, all thresholds met

---

## TASK 12 — Final Verification

### Task 12.1: Verify all changes against approved changelog

**Status**: [x] — Verified: All 9 rules exist with `fixable: false`, correct severities (3 error, 6 warning), all have tests (36 total new tests), all registered in `.resist-lint.jsonc`. 2602 tests pass, all coverage thresholds met.

**Plan**:
- Verify each new rule exists, has `fixable: false`, correct severity
- Verify each new rule has tests
- Verify each new rule is registered in `.resist-lint.jsonc`
- Run final QA
- Fix any issues found during verification

**Verification**: All tests pass, all changelog items verified

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1.1 | no-utf8-bom (tests + impl) | — |
| 2.1 | no-trailing-whitespace (tests + impl) | — |
| 3.1 | no-tabs-in-code (tests + impl) | — |
| 4.1 | require-utf8-encoding (tests + impl) | — |
| 5.1 | no-dangerous-shell-commands (tests + impl) | — |
| 6.1 | no-missing-shebang (tests + impl) | — |
| 7.1 | no-debug-statements (tests + impl) | — |
| 8.1 | no-todo-comments (tests + impl) | — |
| 9.1 | no-long-lines (tests + impl) | — |
| 10.1 | Register rules in config | 1-9 |
| 11.1 | Full QA pass | 10.1 |
| 11.2 | Coverage verification | 11.1 |
| 12.1 | Final verification | 11.2 |
