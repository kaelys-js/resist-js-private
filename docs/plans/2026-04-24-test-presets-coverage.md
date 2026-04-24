# @/test-presets Phase 2 — qa:test:coverage Passing Thresholds

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: `@/test-presets` (`packages/shared/config/test/src/`)
**Goal**: Make `qa:test:coverage` pass S:80% B:75% F:80% L:80% for `@/test-presets` by adding a vitest project entry, test scripts, and exhaustive branch-covering tests across all 12 source modules. Zero assertion weakening, zero skipped errors, zero dismissed diagnostics, every if/else/try/catch/ternary/??/|| covered, every assertion uses exact error codes and values.

**Architecture**: SvelteKit monorepo root `vitest.config.ts` declares per-package `projects[]` entries with `extends: true` inheriting the global coverage thresholds. Tests run from root via `pnpm -w exec vitest run --project <name>`. Package-level `qa:test`/`qa:test:coverage` scripts delegate to the root via `pnpm -w exec`. Source modules are pure helpers (no external I/O except `node:fs`, `node:os`, and injected globals).

Each task is atomic: implement → verify (QA + tests) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric                     | Value                                |
| -------------------------- | ------------------------------------ |
| Tests for `@/test-presets` | 0 (no test files exist)              |
| Vitest project entry       | Absent (package not in `projects[]`) |
| `qa:test` script           | Absent (empty `scripts: {}`)         |
| `qa:test:coverage` script  | Absent                               |
| Type-check                 | Passes (package not exercised)       |
| Statements                 | Not measured — **FAIL** (need 80%)   |
| Branches                   | Not measured — **FAIL** (need 75%)   |
| Functions                  | Not measured — **FAIL** (need 80%)   |
| Lines                      | Not measured — **FAIL** (need 80%)   |

### Source modules (by LOC)

| File                        | LOC      | Notes                             |
| --------------------------- | -------- | --------------------------------- |
| `src/harness/ansi.ts`       | 68       | `ANSI_REGEX`, `stripAnsi`         |
| `src/harness/async.ts`      | 288      | timeouts, deferred, flush helpers |
| `src/harness/clock.ts`      | 224      | fake clock install/restore        |
| `src/harness/console.ts`    | 343      | capture/assert helpers            |
| `src/harness/http.ts`       | 263      | fetch-mock install                |
| `src/harness/process.ts`    | 376      | process mocks, signal handlers    |
| `src/harness/temp-dir.ts`   | 264      | mkdir/rm flows, error branches    |
| `src/bench/data.ts`         | 373      | data generation helpers           |
| `src/presets/base.ts`       | 122      | base vitest config                |
| `src/presets/node.ts`       | 81       | node preset                       |
| `src/presets/svelte.ts`     | 92       | svelte preset                     |
| `src/presets/playwright.ts` | 147      | playwright preset                 |
| **Total**                   | **2641** | 12 modules, 0 test files          |

---

## TASK 1 — Add vitest project entry + package scripts

**Status**: [x]

**Gap**: `@/test-presets` has no vitest `projects[]` entry in root `vitest.config.ts` and no `qa:test` / `qa:test:coverage` scripts in its `package.json`. Coverage cannot be measured.

**Plan**:

- Add one `projects[]` entry to `vitest.config.ts`: `{ extends: true, test: { name: 'test-presets', root: 'packages/shared/config/test', include: ['src/**/*.test.ts'] } }` so coverage thresholds + include/exclude are inherited.
- Add to `packages/shared/config/test/package.json` scripts: `qa:test: pnpm -w exec vitest run --project test-presets`, `qa:test:coverage: pnpm -w exec vitest run --project test-presets --coverage`.
- Keep ordering: insert project entry near other `config-*` siblings (after `config-tooling-vscode`).

**Files**:

- Edit: `vitest.config.ts`
- Edit: `packages/shared/config/test/package.json`

**Verification**: `pnpm -w exec vitest list --project test-presets` exits 0. `pnpm --filter @/test-presets run qa:test` exits 0 with "passWithNoTests".

---

## TASK 2 — `harness/ansi.ts` tests

**Status**: [x]

**Gap**: 0 coverage on `ANSI_REGEX` + `stripAnsi`.

**Plan**:

- Read file to enumerate branches.
- Test `ANSI_REGEX` matches: SGR (`\u001b[31m`), reset (`\u001b[0m`), cursor (`\u001b[2;5H`), erase (`\u001b[2J`), OSC title (`\u001b]0;title\u0007`).
- Test `stripAnsi`: empty string → `''`; plain ASCII unchanged; single SGR removed; multiple interleaved SGR removed; input with no match equals input; preserves surrounding unicode.
- Every assertion uses exact expected strings.

**Files**:

- Create: `harness/ansi.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/harness/ansi.test.ts` exits 0 and reports exactly 15 passing tests.

---

## TASK 3 — `harness/async.ts` tests

**Status**: [x]

**Gap**: 0 coverage on 288 LOC of deferred/timeout/flush helpers.

**Plan**:

- Read module to enumerate exports and branches.
- For each exported function: cover happy path, each early-return branch, each thrown-error branch, and each fallback (`??`, `||`) branch.
- Use `vi.useFakeTimers()` where helpers schedule timers; advance via `vi.advanceTimersByTimeAsync`.
- Use `.catch((e) => e)` pattern for rejection assertions to avoid unhandled-rejection warnings.
- Assertions on timeout messages match exact error codes/strings surfaced by the implementation (read source first).

**Files**:

- Create: `harness/async.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/harness/async.test.ts` exits 0 and reports exactly 24 passing tests.

---

## TASK 4 — `harness/clock.ts` tests

**Status**: [x]

**Gap**: 0 coverage on 224 LOC of fake-clock install/restore helpers.

**Plan**:

- Read module; enumerate install/advance/restore API.
- Test install + Date.now override + restore reverts; double-install throws exact error code; restore-without-install no-ops or throws exact code per source; `advance(n)` runs queued timers in order; 0-advance is no-op.
- Every branch in conditional setup covered (support-detection fallbacks if any).

**Files**:

- Create: `harness/clock.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/harness/clock.test.ts` exits 0 and reports exactly 13 passing tests.

---

## TASK 5 — `harness/console.ts` tests

**Status**: [x]

**Gap**: 0 coverage on 343 LOC of console capture/assert helpers.

**Plan**:

- Read module; identify levels captured (log/info/warn/error/debug) and filter/assert helpers.
- Test: capture starts with empty buffer; each level writes to buffer with exact `{level, args}` shape; stopCapture restores originals; double-stop is idempotent; filter by level returns only matching entries; assert-contains with exact string passes / non-match throws exact error code.
- Cover ANSI-strip branch (if console module uses `stripAnsi` for matchers).

**Files**:

- Create: `harness/console.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/harness/console.test.ts` exits 0 and reports exactly 22 passing tests.

---

## TASK 6 — `harness/http.ts` tests

**Status**: [x]

**Gap**: 0 coverage on 263 LOC of fetch-mock install.

**Plan**:

- Read module; enumerate install API (route matcher, response builder, unmatched-fallthrough).
- `vi.stubGlobal('fetch', …)` interception; test: matched request returns queued response; unmatched URL rejects with exact error code; restore unstubs global; 404 / 500 status handlers applied; JSON body round-trip.
- Covers every `??`/`||` default + each `instanceof Request|string|URL` branch in the matcher.

**Files**:

- Create: `harness/http.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/harness/http.test.ts` exits 0 and reports exactly 23 passing tests.

---

## TASK 7 — `harness/process.ts` tests

**Status**: [x]

**Gap**: 0 coverage on 376 LOC of process mocks + signal handlers.

**Plan**:

- Read module; identify which `process.*` members are stubbed (`exit`, `env`, `stdout.write`, `signals`).
- Test install replaces each with mock; exit-mock records code without terminating; env-mock provides per-test overlay; stdout.write accumulates to buffer; signal registration + dispatch routes through handler; restore reverts originals; double-restore is no-op.
- Error branches: registering handler for unknown signal throws exact code.

**Files**:

- Create: `harness/process.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/harness/process.test.ts` exits 0 and reports exactly 23 passing tests.

---

## TASK 8 — `harness/temp-dir.ts` tests

**Status**: [x]

**Gap**: 0 coverage on 264 LOC of mkdtemp/rm helpers.

**Plan**:

- Use real `node:fs/promises` against `os.tmpdir()` — no mocking needed for happy path.
- For error branches: `vi.mock('node:fs/promises', …)` per-test scenario (mkdtemp rejection, rm rejection).
- Test: createTempDir returns absolute path inside `os.tmpdir()`; cleanup removes dir + contents; cleanup of missing dir swallows ENOENT (exact error code check); double-cleanup idempotent.

**Files**:

- Create: `harness/temp-dir.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/harness/temp-dir.test.ts` exits 0 and reports exactly 25 passing tests.

---

## TASK 9 — `bench/data.ts` tests

**Status**: [x]

**Gap**: 0 coverage on 373 LOC of benchmark data generators.

**Plan**:

- Read module; enumerate exported generators (string/number/array/tree generators).
- Test each: zero-size → empty output; small size → exact length; seeded output is deterministic (same seed → same data); boundary sizes (1, max); invalid size → exact error code.
- Covers every ternary + `%` branch in generator loops.

**Files**:

- Create: `bench/data.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/bench/data.test.ts` exits 0 and reports exactly 32 passing tests.

---

## TASK 10 — Preset tests (`base`, `node`, `svelte`, `playwright`)

**Status**: [x]

**Gap**: 0 coverage on 4 preset modules (442 LOC combined). Presets export config objects + merge helpers.

**Plan**:

- For each preset: import and assert the config object has exact keys/values (`environment`, `include`, `exclude`, `globals`, `coverage.thresholds`, …).
- If preset exports a merge/factory function: call with empty override → base returned unchanged; call with partial override → each key merged deeply; call with array fields → concatenated or replaced per source semantics (read source to determine exact behaviour).
- Every default-fallback (`??`/`||`) exercised.

**Files**:

- Create: `presets/base.test.ts`
- Create: `presets/node.test.ts`
- Create: `presets/svelte.test.ts`
- Create: `presets/playwright.test.ts`

**Verification**: `pnpm -w exec vitest run --project test-presets src/presets/` exits 0 and reports exactly 62 passing tests (22 base + 10 node + 14 svelte + 16 playwright).

---

## TASK 11 — Register Rules + Config

**Status**: [x]

**Plan**:

- Verify the new `projects[]` entry `test-presets` appears in `vitest.config.ts` and is discovered: `pnpm -w exec vitest list --project test-presets` enumerates every new `*.test.ts` file (12 files).
- Verify `packages/shared/config/test/package.json` scripts `qa:test` and `qa:test:coverage` are present.
- Confirm no production source file outside `packages/shared/config/test/src/` was modified beyond the two registration edits in TASK 1.
- Confirm no new exports introduced in source modules — tests only import existing exported surface.

**Files**:

- Read-only verify: `vitest.config.ts`, `packages/shared/config/test/package.json`, `git diff --name-only HEAD`.

**Verification**: `git diff --name-only HEAD -- 'packages/shared/config/test/src/**/*.ts' ':!**/*.test.ts'` prints nothing. Vitest project listing shows all 12 new test files.

---

## TASK 12 — Integration Verification

**Status**: [x]

**Plan**:

- Command registration check: N/A — no CLI commands added; `grep -c 'registerCommand' packages/shared/config/test/src` returns 0 (unchanged).
- Config settings read check: N/A — no new `config.get` keys added; grep confirms no new setting keys in `packages/shared/config/test/src`.
- Class instantiation check: N/A — no new classes; every function exported by the source modules is pre-existing and already re-exported via package.json `exports`. Tests import directly by relative path so no new wiring is required.
- Dead code / unused export check: `git diff -U0 -- 'packages/shared/config/test/src/**/*.ts' ':!packages/shared/config/test/src/**/*.test.ts'` is empty → structurally impossible for tests to introduce orphaned source exports.
- Grep audit: baseline test count for `test-presets` project = 0; post-plan count ≥ 12 test files and ≥ 60 test cases. Every new `*.test.ts` resolves against an existing source file of the same basename.

**Verification**:

- `git diff --name-only HEAD -- 'packages/shared/config/test/src/**/*.ts' ':!**/*.test.ts'` prints nothing.
- `grep -rE 'registerCommand|config\.get\(' packages/shared/config/test/src` count equals baseline (0).
- No unused export, no dead code: structurally guaranteed because plan is test-only in `src/`.
- Every new test file pairs with an existing source module by basename (`<name>.test.ts` ↔ `<name>.ts`).

---

## TASK 13 — Full QA + Coverage

**Status**: [x]

**Plan**:

- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/test-presets run qa:test`
- Run: `pnpm --filter @/test-presets run qa:test:coverage`
- Verify all four thresholds pass: S≥80%, B≥75%, F≥80%, L≥80%.
- Verify test count ≥ 60 across all new files (was 0).
- Target: S≥90%, B≥85%, F≥95%, L≥90%.

**Verification**: Every pnpm command exits 0. Coverage report shows all four metrics green for `packages/shared/config/test/src/**`.

---

## TASK 14 — Final Verification + Commit

**Status**: [x]

**Plan**:

- Verify every new `*.test.ts` file (12 files) exists and is picked up by the `test-presets` vitest project.
- Verify coverage now passes all four thresholds (previously unmeasurable).
- Verify only `vitest.config.ts`, `packages/shared/config/test/package.json`, and new `*.test.ts` files plus the plan doc changed (`git diff --name-only HEAD`).
- Verify no regressions in other projects: `pnpm -w exec vitest run` exits 0.
- Commit with message citing baseline (no tests) → final coverage numbers.

**Verification**:

- Verify test file count for `packages/shared/config/test/src` is exactly 12.
- Verify all four coverage metrics pass thresholds.
- Verify `pnpm --filter @/test-presets run qa:test:coverage` exits 0.
- Verify no regressions in the existing 1438+ tests across other projects.
- Verify `git diff --name-only HEAD` shows only the two config edits, 12 new `*.test.ts` files, and `docs/plans/*.md`.

---

## Execution Order

| Task | Description                            | Depends On |
| ---- | -------------------------------------- | ---------- |
| 1    | Vitest project entry + package scripts | --         |
| 2    | `harness/ansi.ts` tests                | 1          |
| 3    | `harness/async.ts` tests               | 1          |
| 4    | `harness/clock.ts` tests               | 1          |
| 5    | `harness/console.ts` tests             | 1          |
| 6    | `harness/http.ts` tests                | 1          |
| 7    | `harness/process.ts` tests             | 1          |
| 8    | `harness/temp-dir.ts` tests            | 1          |
| 9    | `bench/data.ts` tests                  | 1          |
| 10   | Preset tests (4 files)                 | 1          |
| 11   | Register Rules + Config                | 2-10       |
| 12   | Integration Verification               | 11         |
| 13   | Full QA + Coverage                     | 12         |
| 14   | Final Verification + Commit            | 13         |
