# Workspace — Scoped `qa:lint` + Hook-Enforced Single-Run Discipline

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: workspace-wide — covers `packages/shared/config/tooling/lint/src/` and `.claude/hooks/`
**Goal**: Make `qa:lint <path>` answer "does this path lint clean?" in one call, and add a Bash PreToolUse hook that physically prevents pipe-grep / pipe-head / pipe-wc patterns on lint output. After this lands, there is no incentive to re-run `qa:lint` repeatedly because the scoped output already IS the answer.
**Architecture**: Two layers. (1) CLI-side: `cli-helpers.ts` already filters file-content rules by `cliArgs.paths`, but workspace-level rules (`plans/*`, `internal/tool-missing`, `internal/tool-crash`) fire unconditionally. Add a `--scope` semantics so workspace-level rules are skipped when explicit paths are passed AND those paths don't intersect the rule's domain (e.g. `plans/*` only runs when paths intersect `docs/plans/`). (2) Hook-side: extend `.claude/hooks/pre-qa-commands.sh` to deny any Bash command matching `qa:lint.*\|.*(grep|head|tail|awk|sed|wc)` with a message pointing at the scoped CLI form.

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
| `qa:lint` (no args) exit code | 1 (2055 tsgo errors workspace-wide) |
| `qa:lint packages/shared/config/core` exit code | 1 (still walks workspace-level rules) |
| Lint-framework tests | 5256 pass |
| Bash hook count | 16 |
| Existing `pre-qa-commands.sh` rules | 2 (npx vitest, cd subdir) |
| Workspace-level rule count fired regardless of path arg | 5 (`plans/no-incomplete-tasks`, `plans/files-exist`, `plans/require-test-files`, `plans/require-concrete-verification`, `plans/no-empty-plan-sections`) + `internal/tool-missing` + `internal/tool-crash` |

---

## TASK 1 — Path-scope workspace-level rules in lint runner

**Status**: [x]

**Gap**: When the user passes `qa:lint packages/shared/config/core`, file-content rules already scope correctly via the existing `cliArgs.paths` filter at `cli-helpers.ts:943`. But the five `plans/*` rules and the `internal/tool-missing`/`internal/tool-crash` rules run unconditionally — so a scoped invocation still surfaces unrelated workspace-wide diagnostics, which forces post-filtering with grep. Fix: skip workspace-level rules whose domain doesn't intersect any of the passed paths.

**Plan**:
- In `cli-helpers.ts`, locate the rule dispatcher and add a `ruleDomain` predicate per workspace-level rule:
  - `plans/*` rules → domain is `docs/plans/`
  - `internal/tool-missing` and `internal/tool-crash` → domain is `<any path that triggers a real tool spawn>` (i.e. when the resolved file list is non-empty, since tools only run if there are files to scan)
- When `cliArgs.paths.length > 0`, only run a workspace-level rule if at least one passed path is a prefix of (or contains) the rule's domain. Implement as a small helper `pathsIntersectDomain(paths: string[], domain: string): boolean` colocated in `cli-helpers.ts`.
- Default behavior (no paths passed) is unchanged — every rule still runs.
- Add unit tests in `cli-helpers.test.ts` covering: (a) `qa:lint packages/shared/config/core` skips `plans/*` rules; (b) `qa:lint docs/plans/` runs `plans/*` rules; (c) `qa:lint` with no args runs everything (regression guard); (d) `qa:lint packages/x docs/plans/` runs both.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts`
- Test: `packages/shared/config/tooling/lint/src/cli-helpers.test.ts`

**Verification**:
- `pnpm --filter @/lint run qa:test 2>&1 | tail -3` shows test count >= 5256 + 4 new
- After implementation, running the scoped CLI manually (one time) against `packages/shared/config/core` returns ONLY diagnostics from that path — no `plans/*` lines, no `internal/tool-missing` lines for tools the package doesn't use.

---

## TASK 2 — `--package <name>` flag for workspace-package shorthand

**Status**: [x]

**Gap**: Path-based scoping works but is verbose (`packages/shared/config/core`). A `--package @/config/core` flag that resolves via `pnpm-workspace.yaml` is shorter and matches how Claude is told about packages in conversation. Without this, agents guess paths and trip on typos.

**Plan**:
- Extend `parseCliArgs` in `cli-helpers.ts` to accept `--package <name>` (repeatable). Resolve each name to its absolute path by reading `package.json#name` for every entry in `pnpm-workspace.yaml`'s `packages` glob expansion. Cache the resolution per-process.
- Merge resolved paths into `cliArgs.paths` BEFORE rule dispatch, so TASK 1's filter applies uniformly.
- Error if a `--package` name doesn't resolve, with the list of valid names in the error message.
- Add unit tests: valid name resolves, invalid name errors with suggestion list, multiple `--package` flags merge, mixing positional path + `--package` works.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts`
- Test: `packages/shared/config/tooling/lint/src/cli-helpers.test.ts`

**Verification**:
- `pnpm --filter @/lint run qa:test` shows test count >= prior + 4 new
- `parseCliArgs(['--package', '@/config/core'])` resolves `paths` to the absolute path of `packages/shared/config/core`

---

## TASK 3 — Pre-QA hook: deny pipe-filter on `qa:lint` output

**Status**: [x]

**Gap**: There is no hook that intercepts `qa:lint | grep`, `qa:lint | head`, `qa:lint 2>&1 | grep`, etc. The existing `pre-qa-commands.sh` only blocks `npx vitest` and `cd <subdir> && qa:*`. Without a block, the agent (me) reaches for grep when the right answer is `qa:lint <path>`. The block forces the scoped form.

**Plan**:
- Edit `.claude/hooks/pre-qa-commands.sh` to add a third rule: detect `qa:lint` (or `pnpm.*lint` matching the workspace lint script) followed anywhere in the same command by a pipe to `grep|head|tail|awk|sed|wc`. Match through `2>&1` redirects too.
- The deny message must point at the scoped CLI: `"Do not pipe qa:lint through grep/head/tail/awk/sed/wc. Use the scoped form instead: pnpm -w run qa:lint <path-or-package>. Workspace-level rules are auto-skipped when a path is passed."`
- Allow exceptions only when the pipe target is `cat` or `tee` to a file (rare, explicit log capture).
- Test by extending `.claude/hooks/hooks.test.sh` with cases: (a) `pnpm -w run qa:lint | grep foo` denied, (b) `pnpm -w run qa:lint packages/x` allowed, (c) `pnpm -w run qa:lint 2>&1 | head` denied, (d) `pnpm -w run qa:lint | tee out.log` allowed, (e) unrelated `pnpm -w run qa:format | grep` allowed (rule is `qa:lint`-specific).

**Files**:
- Edit: `.claude/hooks/pre-qa-commands.sh`
- Edit: `.claude/hooks/hooks.test.sh`

**Verification**:
- `bash .claude/hooks/hooks.test.sh` exits 0 with the new cases passing
- The deny JSON message contains the literal string `pnpm -w run qa:lint <path-or-package>`

---

## TASK 4 — Register Rules + Config

**Status**: [x]

**Plan**:
- TASK 1 modifies internal dispatch logic in `cli-helpers.ts`; the helper `pathsIntersectDomain` stays non-exported. Verify with `grep -n "pathsIntersectDomain" packages/shared/config/tooling/lint/src/index.ts` returns nothing.
- TASK 2 adds `--package` to the schema (`CliArgsSchema`); update the `--help` text printed by `cli-helpers.ts` to document the new flag. Verify the help string includes `--package`.
- TASK 3 modifies an existing hook script and its test harness — no entry-point or barrel change. Confirm hook is still listed in `.claude/settings.json` (or wherever hooks register) and is unchanged in registration.
- No new lint rules. No new config keys.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/cli-helpers.ts` (help text only — already edited in TASK 2)
- Edit: none for hook registration (TASK 3 edited an already-registered file)

**Verification**:
- `grep -n "pathsIntersectDomain" packages/shared/config/tooling/lint/src/index.ts` outputs nothing
- `pnpm -w run qa:lint --help 2>&1 | grep -c "\-\-package"` outputs `1`
- `grep -c "pre-qa-commands.sh" .claude/settings.json` outputs `>=1`

---

## TASK 5 — Integration Verification

**Status**: [x]

**Plan**:
- Command registration check: this plan registers no CLI commands beyond the new flag. Verify `grep -rE "registerCommand" packages/shared/config/tooling/lint/src | wc -l` equals baseline captured at TASK 1 start.
- Config settings read check: no new `config.get(...)` calls. Verify `grep -rE "config\.get\(" packages/shared/config/tooling/lint/src | wc -l` equals baseline.
- Class instantiation / feature-wired check: TASK 1's `pathsIntersectDomain` must be referenced from inside `cli-helpers.ts`. Verify with `grep -nc "pathsIntersectDomain" packages/shared/config/tooling/lint/src/cli-helpers.ts >= 2` (definition + at least one call site).
- Dead code / unused export check: `git diff --name-only HEAD -- 'packages/shared/config/tooling/lint/src/**/*.ts' ':!**/*.test.ts'` should print only `cli-helpers.ts`. Confirm the new `--package` resolution path is reachable: `grep -n "cliArgs.package" packages/shared/config/tooling/lint/src/cli-helpers.ts` shows at least one read after `parseCliArgs`.
- Grep audit: `grep -rE "registerCommand|config\.get\(" packages/shared/config/tooling/lint/src | wc -l` equals baseline (unchanged).

**Verification**:
- All four counts above match baselines
- `grep -nc "pathsIntersectDomain" packages/shared/config/tooling/lint/src/cli-helpers.ts` outputs `>=2`
- `git diff --name-only HEAD` lists only `cli-helpers.ts`, `cli-helpers.test.ts`, `pre-qa-commands.sh`, `hooks.test.sh`, and this plan doc

---

## TASK 6 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint packages/shared/config/tooling/lint` (scoped — must exit 0)
- Run: `pnpm -w run qa:lint --package @/lint` (smoke test of TASK 2 — must exit 0)
- Run: `pnpm --filter @/lint run qa:test`
- Run: `bash .claude/hooks/hooks.test.sh`
- Verify global coverage thresholds still pass: S>=90, B>=78, F>=91, L>=90.

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/lint; echo $?` outputs `0`
- `pnpm -w run qa:lint --package @/lint; echo $?` outputs `0`
- `pnpm --filter @/lint run qa:test 2>&1 | tail -5` shows test count >= 5256 + 8 new
- `bash .claude/hooks/hooks.test.sh; echo $?` outputs `0`
- Coverage summary unchanged or improved from prior commit

---

## TASK 7 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify `pathsIntersectDomain` and `--package` resolution exist in `cli-helpers.ts` and are referenced.
- Verify `pre-qa-commands.sh` denies the four pipe targets and allows the two exemptions, per `hooks.test.sh`.
- Verify TASK 6 commands all pass.
- Verify `git diff --name-only HEAD` lists only the expected file set from TASK 5.
- Commit with a message stating: "scoped lint + hook block on pipe-filter — agents now answer scoped lint questions in one call instead of grep loops."

**Verification**:
- `pnpm -w run qa:lint packages/shared/config/tooling/lint; echo $?` outputs `0`
- `git status` shows clean tree after commit
- Commit message includes the literal phrase `scoped lint` and `pipe-filter`
- A manual demo: `pnpm -w run qa:lint packages/shared/config/core` returns either zero output (clean) or only diagnostics whose file paths begin with `packages/shared/config/core/` — no `plans/*`, no `internal/tool-missing` lines for unrelated tools

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Path-scope workspace-level rules | -- |
| 2 | `--package <name>` flag | 1 |
| 3 | Pre-QA hook: deny pipe-filter on qa:lint | -- |
| 4 | Register Rules + Config | 1, 2, 3 |
| 5 | Integration verification | 4 |
| 6 | Full QA + Coverage | 5 |
| 7 | Final verification + commit | 6 |
