# @/lint Phase 45 — Merge qa:type-check into unified lint command

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Add `tsgo` and `svelte-check` as workspace tools in the linter, then remove all per-package `qa:type-check` scripts and the Turbo task. One `pnpm -w run qa:lint` does everything.
**Architecture**: New `WorkspaceTool` type runs once at workspace root (not per-file like `ExternalTool`). `tsgo --noEmit` covers 20 packages. `svelte-check` covers 3 SvelteKit packages. Both outputs are parsed into `LintResult[]`.

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
| Tests | 4815 total |
| Type-check | Passes (except pre-existing errors in template-literal, editor) |
| Packages with qa:type-check | 23 |

---

## TASK 1 — Plan File

**Status**: [x]

**Plan**: Create this plan file.

---

## TASK 2 — Add WorkspaceTool type to tool-orchestrator.ts

**Status**: [ ]

**Gap**: `ExternalTool` runs per-file. Type-checking tools run once at a workspace/project level.

**Plan**:
- Add `WorkspaceToolSchema` type with: `name`, `command`, `args`, `cwd` (optional), `outputFormat`, `transform`, `isAvailable`
- Add `runWorkspaceTool()` method to `ToolRegistry`
- Add `runAllWorkspaceTools()` method

**Files**:
- Modify: `src/framework/tool-orchestrator.ts`

**Verification**: Type-check passes

---

## TASK 3 — Create tools/tsgo.ts

**Status**: [ ]

**Gap**: No tsgo tool exists. Need to parse `file(line,col): error TSXXXX: message` output.

**Plan**:
- Create `tsgo` workspace tool running `tsgo --noEmit` from workspace root
- Parse each line matching `file(line,col): error|warning TSXXXX: message`
- Map to `LintResult[]` with ruleId `tsgo/TSXXXX`

**Files**:
- Create: `src/tools/tsgo.ts`

**Verification**: Transform function correctly parses tsgo output

---

## TASK 4 — Create tools/svelte-check.ts

**Status**: [ ]

**Gap**: No svelte-check tool exists. Need to parse `TIMESTAMP LEVEL "file" line:col "message"` output.

**Plan**:
- Create `svelte-check` workspace tool
- Runs `svelte-check --tsconfig ./tsconfig.json` from each SvelteKit package
- Parse output lines matching `TIMESTAMP ERROR|WARNING "file" line:col "message"`
- Map to `LintResult[]` with ruleId `svelte-check/error` or `svelte-check/warning`

**Files**:
- Create: `src/tools/svelte-check.ts`

**Verification**: Transform function correctly parses svelte-check output

---

## TASK 5 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Import tsgo and svelte-check workspace tools into `src/tools/registry.ts`
- Export `ALL_WORKSPACE_TOOLS` array alongside existing `ALL_TOOLS`
- Add `tsgo` and `svelte-check` entries to `.resist-lint.jsonc` with `"error"` severity

**Files**:
- Modify: `src/tools/registry.ts`
- Modify: `.resist-lint.jsonc`

**Verification**: Imports resolve, type-check passes, rules appear in config

---

## TASK 6 — Update cli-helpers.ts to run workspace tools

**Status**: [ ]

**Plan**:
- Import `ALL_WORKSPACE_TOOLS` from registry
- After external tools block, add workspace tools block
- Run all workspace tools and aggregate results
- Add debug locale strings for workspace tool loading/running/results

**Files**:
- Modify: `src/cli-helpers.ts`
- Modify: `src/locale/locales/en.ts`
- Modify: `src/locale/schema.ts`

**Verification**: `pnpm -w run qa:lint` runs type-checking

---

## TASK 7 — Remove qa:type-check from all package.json + turbo.json

**Status**: [ ]

**Plan**:
- Remove `qa:type-check` script from all 23 package.json files
- Remove `qa:type-check` task from turbo.json
- Remove `qa:type-check` script from root package.json

**Files**:
- Modify: 23 package.json files + root package.json + turbo.json

**Verification**: No `qa:type-check` scripts remain

---

## TASK 8 — Add tests for tsgo + svelte-check tools

**Status**: [ ]

**Plan**:
- Test tsgo output parsing: single error, multiple errors, warnings, empty, malformed
- Test svelte-check output parsing: errors, warnings, START lines, empty
- Test workspace tool integration in tool-orchestrator

**Files**:
- Modify: `src/tools/tools.test.ts`

**Verification**: All tests pass

---

## TASK 9 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 10 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify tsgo and svelte-check tool files exist in `src/tools/`
- Verify both workspace tools registered in `src/tools/registry.ts`
- Verify no `qa:type-check` scripts remain in any package.json
- Verify `qa:type-check` removed from turbo.json
- Verify test count ≥ baseline + new tests
- Commit with descriptive message

**Verification**:
- `src/tools/tsgo.ts` and `src/tools/svelte-check.ts` exist
- `ALL_WORKSPACE_TOOLS` exported from `src/tools/registry.ts`
- `grep -r 'qa:type-check' packages/*/package.json` returns 0 matches
- `grep 'qa:type-check' turbo.json` returns 0 matches
- Test count ≥ 4815 + new tests

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Plan file | — |
| 2 | WorkspaceTool type | — |
| 3 | tsgo tool | 2 |
| 4 | svelte-check tool | 2 |
| 5 | Register Rules + Config | 3, 4 |
| 6 | CLI integration | 5 |
| 7 | Remove qa:type-check | 6 |
| 8 | Tests | 3, 4 |
| 9 | Full QA + Coverage | 6, 7, 8 |
| 10 | Final verification + commit | 9 |
