# @/lint Phase 44 — Remove tsx dependency, use native Node 25 TypeScript

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Replace all `npx tsx` / `tsx` usage with native Node 25 TypeScript stripping + the project's existing `register-aliases.mjs` resolver. Eliminates ~270ms startup overhead per invocation.
**Architecture**: Node 25 strips TypeScript types natively. Path alias resolution (`@/`) is handled by `register-aliases.mjs` (already used via `.npmrc` NODE_OPTIONS for pnpm). Worker threads need explicit `--import` since they don't inherit NODE_OPTIONS.

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
| Type-check | Passes |
| `npx tsx` CLI startup | ~497ms |
| `node --import register-aliases.mjs` startup | ~168ms |

---

## TASK 1 — Plan File

**Status**: [x]

**Plan**: Create this plan file.

---

## TASK 2 — Update package.json qa:lint script

**Status**: [ ]

**Gap**: `qa:lint` uses `npx tsx` which adds ~270ms npx resolution overhead.

**Plan**:
- Change `npx tsx packages/shared/config/tooling/lint/src/cli.ts --tools` to `node --import ./packages/shared/config/tooling/node/src/register-aliases.mjs packages/shared/config/tooling/lint/src/cli.ts --tools`

**Files**:
- Modify: `package.json` (line 22)

**Verification**: `pnpm -w run qa:lint` runs successfully

---

## TASK 3 — Update worker-pool.ts execArgv

**Status**: [ ]

**Gap**: Worker threads use `execArgv: ['--import', 'tsx']` — relies on tsx for TS compilation and alias resolution, when Node 25 handles TS natively and the project has its own alias resolver.

**Plan**:
- Compute absolute path to `register-aliases.mjs` from `import.meta.url`
- Change `execArgv: ['--import', 'tsx']` to `execArgv: ['--import', REGISTER_ALIASES_URL]`

**Files**:
- Modify: `packages/shared/config/tooling/lint/src/framework/worker-pool.ts` (line 128)

**Verification**: `pnpm -w run qa:lint` with `--jobs=2` works

---

## TASK 4 — Update cli.test.ts subprocess tests

**Status**: [ ]

**Gap**: Subprocess smoke tests use `TSX_PATH` (the tsx binary) to spawn the CLI.

**Plan**:
- Replace `TSX_PATH` with `NODE_PATH` (path to node binary)
- Update `runCli()` to pass `['--import', REGISTER_ALIASES_PATH, CLI_PATH, ...args]` instead of `[CLI_PATH, ...args]`

**Files**:
- Modify: `packages/shared/config/tooling/lint/src/cli.test.ts`

**Verification**: All CLI tests pass

---

## TASK 5 — Update pre-qa-commands.sh hook guard

**Status**: [ ]

**Gap**: Hook blocks `npx tsx.*cli\.ts` which no longer applies after the change.

**Plan**:
- Remove the `npx tsx` guard since the command no longer uses it
- The hook's purpose was to prevent direct `npx tsx` CLI invocations; this is now moot

**Files**:
- Modify: `.claude/hooks/pre-qa-commands.sh`

**Verification**: Hook doesn't block the new `qa:lint` command

---

## TASK 6 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm qa:type-check`
- Run: `pnpm qa:test`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint`
- Verify test count matches baseline (4815)

**Verification**: All commands exit 0

---

## TASK 7 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify no `npx tsx` references remain in active code
- Verify `qa:lint` runs with native node
- Verify worker pool spawns with register-aliases.mjs
- Commit with descriptive message

**Verification**:
- `grep -r 'npx tsx' package.json` returns 0 matches
- `pnpm -w run qa:lint` exits 0
- All tests pass

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Plan file | — |
| 2 | Update package.json | — |
| 3 | Update worker-pool.ts | — |
| 4 | Update cli.test.ts | — |
| 5 | Update hook guard | — |
| 6 | Full QA + Coverage | 2-5 |
| 7 | Final verification + commit | 6 |
