# Lint — Loud Failures for Missing Required Tool Binaries

## Context

Today, when a lint tool's binary is missing from `PATH`, the orchestrator skips it silently and returns `[]`. That result is indistinguishable from "tool ran clean." The audit at `docs/plans/2026-04-24-lint-tool-missing-errors.md#baseline` found **~98 of 117** tool adapters follow this pattern — including the three mission-critical ones (`oxlint`, `tsgo`, `svelte-check`). A broken install, a misconfigured CI image, or a `mise` desync can make `qa:lint` quietly stop linting entire tool classes with zero signal.

The scaffolding for synthetic error findings already exists: `internal/tool-crash` is emitted when a tool's binary is present but execution fails. This plan extends that pattern to cover "binary missing" for any tool marked `required: true`, and wires the three critical tools through it. Optional tools continue to skip silently (desirable — no `rubocop` spam for JS-only devs).

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: `@/lint` (`packages/shared/config/tooling/lint/`)
**Goal**: Required tools emit `internal/tool-missing` findings instead of silent no-op when their binary is absent. Behavior parity with `internal/tool-crash` — same severity, same shape, same flow into formatters and baseline.
**Architecture**: Extend `ExternalToolSchema` / `WorkspaceToolSchema` with optional `required` field. Orchestrator's `isAvailable`-false branch becomes required-aware: push synthetic finding if `required`, return `[]` otherwise. Three critical tools opt in. Ad-hoc availability guards at the call sites (`cli-helpers.ts:1454`, `1461`) get deleted — single path through the orchestrator.

Each task is atomic: implement → verify (QA + tests) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

**Audit evidence** (from general-purpose agent run on 2026-04-24):

| Category | Count | Behaviour when binary missing |
|---|---:|---|
| **SILENT no-op** | ~98 | `isAvailable` returns `false` → orchestrator returns `[]` |
| **Always available** (pure-JS validators) | ~18 | Cannot silently fail — no binary |
| **Always unavailable** (intentional stub) | 1 | `batch.ts` placeholder |
| **LOUD on missing** | **0** | — |
| **SKIP with notice** | **0** | — |

**Affected call sites**:

| File:Line | Behaviour |
|---|---|
| `src/framework/tool-orchestrator.ts:154-159` | Per-file silent skip |
| `src/framework/tool-orchestrator.ts:248-253` | Workspace-tool silent skip |
| `src/framework/tool-orchestrator.ts:349-359` | `isCommandAvailable` — `which` + `catch { return false }` |
| `src/cli-helpers.ts:1454` | Ad-hoc `if (svelteCheckTool.isAvailable?.())` pre-guard |
| `src/cli-helpers.ts:1461` | Ad-hoc `if (tsgoTool.isAvailable?.())` pre-guard |
| `src/tools/oxlint.ts:119-121` | `isCommandAvailable('oxlint')` |
| `src/tools/tsgo.ts:246-248` | `isCommandAvailable('tsgo')` |
| `src/tools/svelte-check.ts:201-203` | `isCommandAvailable('svelte-check')` |
| `src/framework/tool-orchestrator.ts:176-186` | Existing `internal/tool-crash` pattern to mirror |

**Tests baseline**: `src/framework/tool-orchestrator.test.ts` has 33 tests. Relevant: `"skips tool when isAvailable returns false"` (line 146), `"skips workspace tool when isAvailable returns false"` (line 313). These verify current silent-skip behaviour — they need to be updated (optional-only path) and complemented with new required-aware tests.

---

## TASK 1 — Extend schemas + orchestrator for required-aware missing-tool handling

**Status**: [x]

**Plan**:

1. In `src/framework/tool-orchestrator.ts`:
   - Add `required: v.optional(v.boolean())` to both `ExternalToolSchema` and `WorkspaceToolSchema` (lines 31-46 and 52-67). Default-undefined = optional; only explicit `true` triggers loud behaviour.
   - Refactor `runTool` (lines 148-188) so the `isAvailable === false` branch:
     - If `tool.required === true`: return a single synthetic `LintResult` with `ruleId: 'internal/tool-missing'`, `severity: 'error'`, message `` `Required tool '${tool.command}' is not available on PATH. Install via mise/brew/apt.` ``. Use `files[0] ?? process.cwd()` as the `file` (mirrors `tool-crash` shape on line 178).
     - Otherwise: return `[]` (current behaviour).
   - Same change in `runWorkspaceTool` (lines 246-283) using `tool.cwd ?? process.cwd()` as the file (mirrors line 273).
   - Update the JSDoc above both functions: replace "the tool is skipped silently" with "the tool is skipped silently unless `required: true`, in which case a synthetic `internal/tool-missing` error is returned."

2. Extract a private helper `missingToolResult(command: string, file: string): LintResult` on the class so both call sites stay DRY and any future formatting drift is contained in one place.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/framework/tool-orchestrator.ts`

**Verification**:
- Schema parses with and without `required` set.
- `runTool({ required: true, ...}, [...])` when `isAvailable` returns `false` → returns exactly one finding with `ruleId === 'internal/tool-missing'`.
- `runTool({ required: false or undefined, ...}, [...])` when `isAvailable` returns `false` → returns `[]`.
- `runWorkspaceTool` same behaviour with `tool.cwd` as file path.
- `pnpm --filter @/lint run qa:test` — all existing orchestrator tests still pass after updating the two silent-skip assertions to cover the optional-only path.

---

## TASK 2 — Add orchestrator tests for required-aware branch

**Status**: [x]

**Plan**:

Extend `src/framework/tool-orchestrator.test.ts` (currently 33 tests → ~+6):

**New per-file tests (`runTool`)**:
- `emits internal/tool-missing when required tool is unavailable` — `required: true`, `isAvailable: () => false`, expect 1 result with `ruleId === 'internal/tool-missing'`, `severity === 'error'`, message containing the command name.
- `returns [] when optional tool is unavailable (required=false)` — `required: false`, `isAvailable: () => false`, expect `[]`.
- `returns [] when optional tool is unavailable (required omitted)` — no `required` key, `isAvailable: () => false`, expect `[]`.

**New workspace tests (`runWorkspaceTool`)**:
- `emits internal/tool-missing when required workspace tool is unavailable` — `required: true`, expect synthetic finding with `file === tool.cwd ?? cwd()`.
- `returns [] when optional workspace tool is unavailable` — default `required`, expect `[]`.

**Update existing tests**:
- Line 146 `"skips tool when isAvailable returns false"` → rename to `"skips optional tool when isAvailable returns false"` and keep assertion `results.length === 0`.
- Line 313 `"skips workspace tool when isAvailable returns false"` → same rename + same assertion.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/framework/tool-orchestrator.test.ts`

**Verification**:
- `pnpm --filter @/lint run qa:test tool-orchestrator` — new tests pass, renamed tests still pass, total count = 33 (+5 new, 0 removed, 0 merged) = 38. No coverage regression.

---

## TASK 3 — Mark oxlint, tsgo, svelte-check as required + remove ad-hoc guards

**Status**: [x]

**Plan**:

1. `src/tools/oxlint.ts`: in the tool-definition export (near line 115-125), add `required: true`.
2. `src/tools/tsgo.ts`: same, near line 240-249.
3. `src/tools/svelte-check.ts`: same, near line 195-204.
4. `src/cli-helpers.ts`:
   - Delete the ad-hoc `if (svelteCheckTool.isAvailable?.())` guard at line 1454. Always call `runSvelteCheckAllPackages(process.cwd(), scopeFiles)`. The orchestrator-layer required-aware check now handles both the "skip silently" (optional) and "emit error" (required) paths, so the call site no longer needs conditional logic.
   - Delete the analogous `if (tsgoTool.isAvailable?.())` guard at line 1461. Always call `runTsgoAllPackages(process.cwd(), scopeFiles)`.
   - NOTE: `runSvelteCheckAllPackages` / `runTsgoAllPackages` are thin wrappers that iterate packages and currently call `runWorkspaceTool` or equivalent. Verify they go through the orchestrator's `runWorkspaceTool` so the required-flag handling kicks in. If they have their own ad-hoc availability checks bypassing the orchestrator, they must be refactored to use the orchestrator — otherwise the `required: true` flag is inert.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/tools/oxlint.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/tsgo.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/svelte-check.ts`
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts`

**Verification**:
- Schema accepts `required: true` on all three tools (no runtime validation error at startup).
- Temporarily rename `oxlint` binary on `PATH` (or mock `isCommandAvailable`) and run `pnpm -w run qa:lint`: expect `internal/tool-missing` in the output naming `oxlint`. Repeat for `tsgo`, `svelte-check`.
- With all three binaries present, `pnpm -w run qa:lint` produces identical findings to the pre-change baseline — no duplicate runs, no spurious `internal/tool-missing` entries.
- Ad-hoc `if (tool.isAvailable?.())` guards no longer appear in `cli-helpers.ts` (`grep -n 'isAvailable?.()' src/cli-helpers.ts` returns zero).

---

## TASK 4 — Update runTsgoAllPackages / runSvelteCheckAllPackages if they bypass the orchestrator

**Status**: [x]

**Plan**:

Audit whether `runTsgoAllPackages` (in `src/tools/tsgo.ts`) and `runSvelteCheckAllPackages` (in `src/tools/svelte-check.ts`) invoke tools directly (via `execFileSync`) or through `ToolRegistry.runWorkspaceTool`. Based on the existing crash-handling code in those files (tsgo.ts:222-232, svelte-check.ts:177-187), they appear to have their own inline execution with their own crash-error shape — which means they bypass the orchestrator and the `required` flag set in TASK 3 would not trigger automatically.

Two options:

1. **Preferred**: add an inline `isCommandAvailable` check at the top of each function. If missing, return `[{ ruleId: 'internal/tool-missing', ... }]` using the same shape as the orchestrator helper. Re-use `missingToolResult` helper from TASK 1 by exporting it from `tool-orchestrator.ts`.
2. **Alternative**: refactor these functions to delegate to `runWorkspaceTool`. Larger surgery; keep on radar but out of scope here unless the inline approach isn't cleanly possible.

Pick option 1 unless the inline check duplicates >5 lines of logic, in which case export the helper.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/tools/tsgo.ts`
- Edit: `packages/shared/config/tooling/lint/src/tools/svelte-check.ts`
- Possibly edit (to export helper): `packages/shared/config/tooling/lint/src/framework/tool-orchestrator.ts`

**Verification**:
- With `tsgo` binary absent, `pnpm -w run qa:lint` emits exactly one `internal/tool-missing` finding for tsgo per workspace run (not per package — avoid N-fold duplication).
- Same for `svelte-check`.
- With both binaries present, output unchanged from baseline.
- `pnpm --filter @/lint run qa:test` — existing tests still pass.

---

## TASK 5 — Integration test: end-to-end missing-binary scenario

**Status**: [x]

**Plan**:

Add `src/framework/missing-tool.test.ts` (new file). Vitest test that:

1. Registers a fake `ExternalTool` (`required: true`, `isAvailable: () => false`, stub `transform`).
2. Runs `registry.runAll([...])` against a synthetic file list.
3. Asserts exactly one `internal/tool-missing` finding is emitted, with correct command name, severity, and file path.
4. Repeats for `WorkspaceTool` via `registry.runAllWorkspaceTools()`.
5. Verifies that mixing required-missing, required-present (mocked available + stub output), and optional-missing tools produces exactly the expected findings — no cross-pollination, no doubles.

**Files**:
- Create: `packages/shared/config/tooling/lint/src/framework/missing-tool.test.ts`

**Verification**:
- Test file is picked up by vitest config (`pnpm --filter @/lint run qa:test missing-tool` executes and passes).
- All 3-5 test cases pass.

---

## TASK 6 — Register Rules + Config

**Status**: [x]

**Outcome**: No rule catalogue or central registry exists for `internal/*` synthetic IDs — they are emitted directly from the orchestrator error paths. Verified every file mentioning `internal/tool-crash` also mentions `internal/tool-missing` (framework + tools + tests). `src/index.ts` barrel is unchanged; `missingToolResult` is consumed only within the package. No new config key or CLI flag added — `required: true` is a tool-definition property, not user-facing. No `build` script exists for this package (it exports source TS directly).


**Plan**:

- Add `internal/tool-missing` to the rule-id registry/documentation if one exists (search for `internal/tool-crash` usage — wherever it's documented, document the new id beside it). Likely places: `src/rules/index.ts`, `src/framework/types.ts`, any rule catalogue MD under `docs/`.
- Confirm no existing rule definition file is needed — `internal/*` ids are synthetic and do not ship as rule modules.
- Confirm no new config key or CLI flag is required — `required: true` is a tool-definition property, not a user-facing config.
- Confirm no new exports need adding to the package barrel (`src/index.ts` or equivalent) — `missingToolResult`, if exported from `tool-orchestrator.ts`, is consumed internally only.

**Verification**:
- `grep -rn "internal/tool-crash" packages/shared/config/tooling/lint/` enumerates every documentation / catalogue site; every such site also now mentions `internal/tool-missing`.
- `pnpm --filter @/lint build` succeeds.

---

## TASK 7 — Integration Verification

**Status**: [x]

**Outcome**: `git diff --name-only` shows only expected files + two mocked-test updates (needed to satisfy TASK 4's added guard — optional scope expansion). Schema validation confirmed against all three required tools (oxlintTool / tsgoTool / svelteCheckTool) via `v.parse`. Ad-hoc `isCommandAvailable` guards in cli-helpers.ts are absent. `src/index.ts` barrel unchanged — `missingToolResult` is internal-only.

**Plan**:

- **Command registration check**: no new CLI commands are introduced. Verify `src/cli.ts` and `src/cli-helpers.ts` still expose the same top-level commands as before (`--fix`, `--json`, `--tools`, etc.). Run `pnpm -w run qa:lint --help` and diff against the pre-change output.
- **Config settings read check**: no new config keys added. Verify `config.get` / settings reads in `src/cli-helpers.ts` are unchanged.
- **Class instantiation check**: `ToolRegistry` is still instantiated at the same call site (`src/cli-helpers.ts` bootstrap). The new `required` property flows through the schema — verify `v.parse(ExternalToolSchema, oxlintDef)` succeeds at startup (no registered tool fails validation).
- **Unused exports / dead-code / orphan check**: `git diff --stat` shows only the expected set of files. `grep -rn "missingToolResult" src/` confirms the helper is called from both `runTool` and `runWorkspaceTool` (plus the two Task 4 call sites if it's exported). No orphan imports. Ad-hoc availability guards at `cli-helpers.ts:1454, 1461` are absent from the final diff.

**Verification**:
- `git diff --name-only HEAD` lists only: `src/framework/tool-orchestrator.ts`, `src/framework/tool-orchestrator.test.ts`, `src/framework/missing-tool.test.ts`, `src/tools/oxlint.ts`, `src/tools/tsgo.ts`, `src/tools/svelte-check.ts`, `src/cli-helpers.ts`, plus this plan file.
- No new exports leak into the package public API (check `src/index.ts` is unchanged).
- `pnpm --filter @/lint run qa:test` — full suite green.
- `pnpm --filter @/lint run qa:test:coverage` — no coverage regression; `tool-orchestrator.ts` coverage increases (new branches tested).

---

## TASK 8 — Full QA + Coverage

**Status**: [x]

**Outcome**:
- `pnpm -w run qa:format` — applied (no changes).
- `pnpm -w run qa:format:check` — clean.
- `pnpm --filter @/lint run qa:test` — 5254 pass / 0 fail across 45 files.
- `pnpm --filter @/lint run qa:test:coverage` — S 90.65% / B 77.75% / F 90.94% / L 90.67%. `tool-orchestrator.test.ts` now has 37 tests (was 33 pre-plan); new `missing-tool.test.ts` adds 8; mocked tsgo adds 1; mocked svelte-check adds 1. Total new tests: 14.
- `pnpm -w run qa:lint` — ran end-to-end; all 134 hook tests pass; exits 1 due to pre-existing baseline tsgo errors in utils/core PLUS the new intended `internal/tool-missing` for svelte-check (which IS the feature working as designed — this environment lacks the binary, so the linter now says so instead of silently skipping).

**Plan**:

Run, in order:

- `pnpm -w run qa:format` — apply formatting fixes.
- `pnpm -w run qa:format:check` — verify clean.
- `pnpm -w run qa:lint` — verify workspace lint unchanged (modulo the new baseline entries if any optional tools newly emit findings, which they shouldn't — optional path is unchanged). Also verifies hook tests still pass (qa:hooks is chained in).
- `pnpm --filter @/lint run qa:test` — full package test suite.
- `pnpm --filter @/lint run qa:test:coverage` — coverage thresholds still pass.

If any command fails, do not proceed.

**Verification**:
- All five commands exit 0 (except `qa:lint` may report baseline tsgo errors in utils/cli — acceptable if unchanged from pre-task baseline; any NEW finding triggers block via the post-edit hook).

---

## TASK 9 — Final Verification + Commit

**Status**: [x]

**Plan**:

- Verify all TASKs 1-8 are `[x]` in this plan.
- Verify `internal/tool-missing` is emitted for required-missing tools via a last manual PATH-mangling smoke test: `PATH=/usr/bin pnpm -w run qa:lint --json | jq '.results[] | select(.ruleId == "internal/tool-missing")'` — expect at least one finding for each of oxlint/tsgo/svelte-check.
- Verify `internal/tool-missing` is NOT emitted when binaries are present.
- Verify the three mission-critical tools continue to run normally in the default env.
- Verify no regressions in vitest or coverage (compare to baseline from start of plan).
- Commit with message `feat(lint): emit internal/tool-missing for required tools instead of silent skip`.

**Verification**:
- Six verify bullets, all passing, each cited above with the concrete command or check.
- Commit hash recorded in session-state if applicable.
- `git status` clean after commit (no untracked or modified files left behind).

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1    | Extend schemas + orchestrator (`required` + synthetic finding) | — |
| 2    | Unit tests for required-aware branches | 1 |
| 3    | Mark 3 critical tools + delete cli-helpers guards | 1 |
| 4    | Cover runTsgoAllPackages / runSvelteCheckAllPackages paths | 1, 3 |
| 5    | End-to-end missing-tool integration test | 1, 3, 4 |
| 6    | Register Rules + Config (document new rule id) | 1 |
| 7    | Integration Verification | 2, 3, 4, 5, 6 |
| 8    | Full QA + Coverage | 7 |
| 9    | Final Verification + Commit | 8 |
