# @/lint Phase 14 — Port common.checks.sh Batch 2 (Config & Directory Hygiene)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-27
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 13 rules from `common.checks.sh` to TypeScript workspace rules: no-hardcoded-urls, no-fixup-commits, no-env-files, no-nvmrc, no-package-lock, no-wrangler-toml, no-tests-directory, no-bench-directory, no-coverage-directory, no-eslint-config, no-prettier-config, no-jest-config, no-nested-node-modules.
**Architecture**: All 13 are WorkspaceRules with `scope: 'workspace'`. Most use `ctx.allFiles()` + filename/path checks or `ctx.dirExists()`. All `fixable: false`.

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
| Tests | 2697 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 45 |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — `workspace/no-hardcoded-urls`

**Status**: [x] — Verified: Rule at `rules/workspace/no-hardcoded-urls.ts`. `fixable: false`, `scope: 'workspace'`, severity `warning`. Categories `['workspace', 'safety']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, filter to source files (`.ts`, `.js`, `.json`, `.yaml`, `.yml`, `.md`, `.svelte`)
- Read content, regex match `https?://([a-zA-Z][a-zA-Z0-9.-]*):\d{2,5}` (URLs with explicit port numbers indicating dev/staging endpoints)
- Exclude allowed hosts: `localhost`, `127.0.0.1`, `0.0.0.0`, `example.com`, `example.org`
- Severity: `warn`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags file with `http://myapp:3000/api`, passes file with `http://localhost:3000`, passes file with no URLs, metadata check

**Files**:
- Create: `rules/workspace/no-hardcoded-urls.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — `workspace/no-fixup-commits`

**Status**: [x] — Verified: Rule at `rules/workspace/no-fixup-commits.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'safety']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Use `execSync('git log --oneline')` from `node:child_process` with `cwd: ctx.rootDir`
- Parse each line: split on first space, check if message starts with `fixup!` or `squash!`
- For each found: error with the commit line in the message
- Wrap in try/catch — if git command fails, return empty results
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: mock `execSync` via `vi.mock('node:child_process')`, flags fixup commit, flags squash commit, passes clean log, metadata check

**Files**:
- Create: `rules/workspace/no-fixup-commits.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — `workspace/no-env-files`

**Status**: [x] — Verified: Rule at `rules/workspace/no-env-files.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'safety']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check basename via helper function `isFlaggedEnvFile()`
- Flag: `.env` (bare), `.env.local`, `.env.production`, `.env.development`, `.env.staging`, `.env.test`, and any `.env.*` variant
- Allow: `.env.example`, `.env.template` (safe committed templates) — stored in `ALLOWED_ENV_BASENAMES` Set
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags .env.local, flags .env.production, flags .env (bare), passes .env.example, passes .env.template, metadata check

**Files**:
- Create: `rules/workspace/no-env-files.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — `workspace/no-nvmrc`

**Status**: [x] — Verified: Rule at `rules/workspace/no-nvmrc.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'safety']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check if basename is in `FLAGGED_BASENAMES` Set: `.nvmrc`, `.node-version`
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags .nvmrc, flags .node-version, passes normal .ts file, metadata check

**Files**:
- Create: `rules/workspace/no-nvmrc.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — `workspace/no-package-lock`

**Status**: [x] — Verified: Rule at `rules/workspace/no-package-lock.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'safety']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check if basename is `package-lock.json`
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags package-lock.json, passes pnpm-lock.yaml, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-package-lock.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — `workspace/no-wrangler-toml`

**Status**: [x] — Verified: Rule at `rules/workspace/no-wrangler-toml.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'safety']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check if basename is in `WRANGLER_FILES` array: `wrangler.toml`, `wrangler.jsonc`
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags wrangler.toml, flags wrangler.jsonc, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-wrangler-toml.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — `workspace/no-tests-directory`

**Status**: [x] — Verified: Rule at `rules/workspace/no-tests-directory.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'testing']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check if path contains `TEST_DIR_PATTERNS`: `/__tests__/`, `/tests/`
- Test files should be colocated (e.g., `foo.test.ts` next to `foo.ts`), not in separate directories
- Severity: `error`, Categories: `['workspace', 'testing']`, Stages: `['lint', 'check']`
- Tests: flags file in __tests__/ dir, flags file in tests/ dir, passes colocated .test.ts file, passes normal source file, metadata check

**Files**:
- Create: `rules/workspace/no-tests-directory.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 8 — `workspace/no-bench-directory`

**Status**: [x] — Verified: Rule at `rules/workspace/no-bench-directory.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'testing']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check if path contains `BENCH_DIR_PATTERNS`: `/__benchmarks__/`, `/benchmarks/`, `/bench/`
- Benchmark files should be colocated (e.g., `foo.bench.ts` next to `foo.ts`), not in separate directories
- Severity: `error`, Categories: `['workspace', 'testing']`, Stages: `['lint', 'check']`
- Tests: flags file in __benchmarks__/ dir, flags file in benchmarks/ dir, flags file in bench/ dir, passes colocated .bench.ts file, metadata check

**Files**:
- Create: `rules/workspace/no-bench-directory.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 9 — `workspace/no-coverage-directory`

**Status**: [x] — Verified: Rule at `rules/workspace/no-coverage-directory.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'safety']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Since `allFiles()` skips `coverage/`, use `ctx.dirExists()` instead
- Check `ctx.dirExists(join(ctx.rootDir, 'coverage'))` for root coverage dir
- Get workspace packages via `ctx.getWorkspacePackages()`, check `ctx.dirExists(join(pkg.dir, 'coverage'))` for each
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: override `dirExists` in mockContext to return true for coverage paths, flags root coverage dir, flags package coverage dir, passes when no coverage dir, metadata check

**Files**:
- Create: `rules/workspace/no-coverage-directory.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 10 — `workspace/no-eslint-config`

**Status**: [x] — Verified: Rule at `rules/workspace/no-eslint-config.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'tooling']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check if basename is in `ESLINT_CONFIG_NAMES` ReadonlySet (14 entries):
  - `.eslintrc`, `.eslintrc.js`, `.eslintrc.cjs`, `.eslintrc.mjs`, `.eslintrc.json`, `.eslintrc.yml`, `.eslintrc.yaml`
  - `eslint.config.js`, `eslint.config.mjs`, `eslint.config.cjs`, `eslint.config.ts`, `eslint.config.mts`, `eslint.config.cts`
  - `.eslintignore`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags .eslintrc, flags eslint.config.js, flags eslint.config.ts, flags .eslintignore, flags .eslintrc.json, passes normal .ts file, metadata check

**Files**:
- Create: `rules/workspace/no-eslint-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 11 — `workspace/no-prettier-config`

**Status**: [x] — Verified: Rule at `rules/workspace/no-prettier-config.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'tooling']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check if basename is in `PRETTIER_CONFIG_NAMES` ReadonlySet (13 entries):
  - `.prettierrc`, `.prettierrc.js`, `.prettierrc.cjs`, `.prettierrc.mjs`, `.prettierrc.json`, `.prettierrc.yml`, `.prettierrc.yaml`, `.prettierrc.toml`
  - `prettier.config.js`, `prettier.config.cjs`, `prettier.config.mjs`, `prettier.config.ts`
  - `.prettierignore`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags .prettierrc, flags prettier.config.js, flags .prettierignore, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-prettier-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 12 — `workspace/no-jest-config`

**Status**: [x] — Verified: Rule at `rules/workspace/no-jest-config.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'tooling']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Iterate `ctx.allFiles()`, check if basename is in `JEST_CONFIG_NAMES` ReadonlySet (7 entries):
  - `jest.config.js`, `jest.config.cjs`, `jest.config.mjs`, `jest.config.ts`, `jest.config.json`
  - `jest.setup.js`, `jest.setup.ts`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags jest.config.js, flags jest.config.ts, flags jest.setup.ts, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-jest-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 13 — `workspace/no-nested-node-modules`

**Status**: [x] — Verified: Rule at `rules/workspace/no-nested-node-modules.ts`. `fixable: false`, `scope: 'workspace'`, severity `error`. Categories `['workspace', 'safety']`, stages `['lint', 'check']`. Tests passing. 2758 total tests pass.

**Plan**:
- Since `allFiles()` skips `node_modules/`, use `ctx.getWorkspacePackages()` + `ctx.dirExists()`
- For each workspace package: check `ctx.dirExists(join(pkg.dir, 'node_modules'))`
- If exists: error with relative path to the nested node_modules
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: override `dirExists` to return true for node_modules paths, flags nested node_modules in package dir, passes when no nested node_modules, metadata check

**Files**:
- Create: `rules/workspace/no-nested-node-modules.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 14 — Register Rules + Config

**Status**: [x] — Verified: All 13 rules registered in `.resist-lint.jsonc`. 12 at `"error"`, 1 (`no-hardcoded-urls`) at `"warn"`. Total workspace rules: 58.

**Plan**: Register all 13 rules in `.resist-lint.jsonc` with appropriate severity:
- `workspace/no-hardcoded-urls`: `"warn"`
- `workspace/no-fixup-commits`: `"error"`
- `workspace/no-env-files`: `"error"`
- `workspace/no-nvmrc`: `"error"`
- `workspace/no-package-lock`: `"error"`
- `workspace/no-wrangler-toml`: `"error"`
- `workspace/no-tests-directory`: `"error"`
- `workspace/no-bench-directory`: `"error"`
- `workspace/no-coverage-directory`: `"error"`
- `workspace/no-eslint-config`: `"error"`
- `workspace/no-prettier-config`: `"error"`
- `workspace/no-jest-config`: `"error"`
- `workspace/no-nested-node-modules`: `"error"`

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Config valid, all rules load

---

## TASK 15 — Full QA + Coverage

**Status**: [x] — Verified: 2759 tests pass. Type-check clean. Format clean. Coverage: statements 90.84%, branches 76.86%, functions 85.89%, lines 90.82% — all above thresholds.

**Plan**:
- Run `pnpm --filter @/lint qa:type-check`
- Run `pnpm -w run qa:test`
- Run `pnpm -w run qa:format:check`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify all coverage thresholds pass

**Verification**: All QA green, coverage above thresholds

---

## TASK 16 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 13 rules implemented against changelog
- Commit all changes

**Verification**: All tasks [x], commit clean
