# `@/lint` (`packages/shared/config/tooling/lint`) — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: `packages/shared/config/tooling/lint/src/`
**Goal**: Make `pnpm -w run qa:lint packages/shared/config/tooling/lint` exit 0 by resolving every diagnostic at the source — no rule disable comments, no assertion weakening.

## Context

`pnpm -w run qa:lint packages/shared/config/tooling/lint` exits 1 with **233 diagnostics across ~70 files** (mostly workspace-rule files at `src/rules/workspace/`).

| Rule | Count | Notes |
|------|-------|-------|
| `oxlint/no-await-in-loop` | 58 | All in `src/rules/workspace/*.ts` — workspace rules iterate over packages performing sequential file IO. Parallel await would change semantics (early-bail per-rule, ordered diagnostics). **Rule extension required**: per-glob override for `**/lint/src/rules/workspace/**` to disable `no-await-in-loop`. |
| `oxlint/require-await` | 55 | Almost all in workspace rule files (the rule contract requires `async check(ctx)`; many rule bodies don't actually `await` because they just iterate over already-materialized data). **Rule extension required**: same per-glob override disabling `require-await`. |
| `oxlint/prefer-destructuring` | 25 | Mechanical: `const x = obj.x` → `const { x } = obj`. |
| `oxlint/array-type` | 23 | Mostly `T[]` for non-simple types → `Array<T>`. Some `ReadonlyArray<simple>` → `readonly simple[]`. |
| `oxlint/no-non-null-assertion` | 12 | Replace `!` with explicit guards or `??` fallback. |
| `oxlint/no-negated-condition` | 9 | Flip ternaries / restructure if/else. |
| `oxlint/curly` | 6 | Single-line `if` bodies → braces. |
| `oxlint/catch-error-name` | 6 | `catch (e)` / `catch (err)` → `catch (error)`; rename body refs. |
| `oxlint/no-unused-vars` | 5 | Delete unused imports/vars. |
| `oxlint/require-param` | 4 | Add `@param` JSDoc. |
| `oxlint/no-lonely-if` | 4 | `else { if (...) ... }` → `else if (...) ...`. |
| `oxlint/no-array-sort` | 4 | `.sort()` → `.toSorted()` (immutable variant). |
| `oxlint/prefer-template` | 3 | `'a' + b` → ``${a}${b}``. |
| `oxlint/prefer-string-replace-all` | 3 | `.replace(/.../g, ...)` → `.replaceAll(/...g, ...)`. |
| `oxlint/numeric-separators-style` | 2 | Add `_` separators. |
| `oxlint/no-new-array` | 2 | `new Array(n)` → `Array.from({ length: n })`. |
| `oxlint/no-duplicate-imports` (+ `no-duplicates`) | 3 | Merge duplicate imports. |
| `oxlint/consistent-type-definitions` | 2 | `interface X` → `type X` in `svelte-template.ts:20, 28` (discriminated-union halves). |
| `tsgo/TS2741` | 9 | All in `oxc-runner.ts` — `packageNames` field missing from option literals. Add `packageNames: []` to each option literal, OR add `?` modifier to that field in the schema. Inspect the type def first. |
| `tsgo/TS2345` | 10 | All in `oxc-runner.ts` — `(dir: PathLike, _opts?: unknown) => unknown[]` not assignable to the `readdirSync` overload taking `Dirent<NonSharedBuffer>[]`. Inspect: likely a mock typing issue from an `as never`-style cast missing. |
| `tsgo/TS2353` | 1 | `oxc-runner.ts` — `path` not in `Dirent<string>`. Drop the `path` property from the literal (Dirent has it in newer Node typings only). |
| `tsgo/TS2613` | 1 | `oxc-runner.ts` — module has no default export. Switch to `import { en } from '...'`. |
| `oxlint/require-returns` | 1 | `oxc-runner.ts` JSDoc. |
| `oxlint/prefer-string-slice` | 1 | `.substring(...)` → `.slice(...)`. |
| `oxlint/prefer-spread` | 1 | `Array.from(x)` or `arr.concat(x)` → spread `[...x]`. |
| `oxlint/prefer-set-has` | 1 | `arr.includes(x)` (in hot loop) → `set.has(x)`. |
| `oxlint/prefer-await-to-then` | 1 | `rule-context.ts:510` — convert `.then()` chain to `async`/`await`. |
| `oxlint/filename-case` | 1 | `vite-optimizeDeps.ts` → `vite-optimize-deps.ts` (kebab-case). Update the one importer in `svelte5-config-rules.test.ts:28`. Rule id stays `svelte5-config/vite-optimizeDeps` (matches Vite's actual `optimizeDeps` config key — that's intentional). |
| `oxlint/consistent-function-scoping` | 1 | Inspect site, hoist if non-capturing. |

Each task is atomic: implement → verify (`qa:lint <file>`) → update plan → next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `qa:lint packages/shared/config/tooling/lint` exit code | 1 |
| Total diagnostics | 233 |
| `oxlint/no-await-in-loop` + `require-await` (workspace rules) | 113 |
| All other rules combined | ~120 |

---

## TASK 1 — Extend `.oxlintrc.json` overrides

**Status**: [ ]

**Gap**: Workspace-rule files require `no-await-in-loop` and `require-await` to be disabled.

**Plan**:
- Add a per-glob override:
  ```json
  { "files": ["**/lint/src/rules/workspace/**"],
    "rules": {
      "no-await-in-loop": "off",
      "require-await": "off"
    } }
  ```
  Justification: workspace rules iterate over packages doing sequential file IO; rule contract enforces `async check(ctx)` even when no real await is used.

**Files**: Edit `.oxlintrc.json`.

**Verification**: After edit the 113 await-rule diagnostics are gone. Total drops to ~120.

**Approval requirement**: Matches existing precedent (network.ts, pool.ts already have `no-await-in-loop: off`).

---

## TASK 2 — Fix `oxc-runner.ts` (19 diagnostics)

**Status**: [ ]

**Gap**: 9 TS2741 (missing `packageNames` field), 10 TS2345 (readdirSync mock typing), 1 TS2353 (`path` not in Dirent), 1 TS2613 (no default export), 4 `catch-error-name`, 4 `array-type`, 2 `prefer-template`, 2 `no-new-array`, 2 `no-negated-condition`, 2 `no-lonely-if`, 1 `require-param`, 1 `prefer-string-replace-all`, 1 `no-duplicate-imports`.

**Plan**:
- Inspect the option literal type. Likely `LintRunOptions` has a required `packageNames: readonly string[]` field. Add `packageNames: []` to each test/CLI literal. (9 sites — verify before each edit.)
- TS2345: the function signature `(dir: PathLike, _opts?: unknown) => unknown[]` is a mock for `fs.readdirSync`. Cast at the call site: `(readdirSync as ReadonlyDeep<typeof originalReaddirSync>)` — or use the per-overload form. Inspect.
- TS2613: `import en from './locale/locales/en'` → `import { en } from './locale/locales/en'`.
- TS2353: drop `path: ''` from a Dirent literal.
- Rename `catch (err)` → `catch (error)` (4 sites) + body refs.
- `T[]` → `Array<T>` for non-simple (4 sites).
- Wrap 6 curly + apply other mechanical fixes per rule.
- Merge the duplicate svelte-template import.

**Files**:
- Edit: `packages/shared/config/tooling/lint/src/framework/oxc-runner.ts`

**Verification**: 0 diagnostics on file.

---

## TASK 3 — Fix `svelte-template.ts` (4 diagnostics)

**Status**: [ ]

**Gap**: 2 `consistent-type-definitions` (lines 20, 28: `interface SvelteParseOk` / `SvelteParseErr` → `type`); 2 other (curly etc per file count).

**Plan**:
- Convert both `interface` to `type` aliases. They're used as discriminated-union halves (`SvelteParseResult = SvelteParseOk | SvelteParseErr`); `type` works for unions equally.

**Files**: Edit `svelte-template.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 4 — Fix `rule-context.ts` (1 prefer-await-to-then)

**Status**: [ ]

**Gap**: `cachedFilesByExtension` uses `.then()` chain at line 510.

**Plan**:
- Convert to async-await form: make the cache build via an async IIFE or change `cachedFilesByExtension` to compute via inline await. Maintain the cache contract (returns same `Promise` for same key).

**Files**: Edit `rule-context.ts`.

**Verification**: 0 diagnostics on file. Rule-context tests still pass.

---

## TASK 5 — Bulk fix `oxlint/curly` (6 sites)

**Status**: [ ]

**Plan**: Run a Python regex pass (heredoc inline) over the affected files to wrap single-line `if`/`for`/`while` bodies in braces.

**Files**: Various.

**Verification**: 0 curly diagnostics remaining.

---

## TASK 6 — Sweep `catch-error-name` across the package

**Status**: [ ]

**Plan**: Run the same Python heredoc rename approach used in `@/utils/core` — for each `} catch (e)` / `} catch (err)`, rename to `catch (error)` and update body identifier refs within the catch block.

**Files**: Multiple workspace-rule files + framework files.

**Verification**: 0 catch-error-name diagnostics remaining.

---

## TASK 7 — Fix `array-type` violations (23 sites)

**Status**: [ ]

**Plan**: Two regex-substitutions pass:
- `T[]` for non-simple types (e.g. `Array<{ … }>`, `Array<Map<…>>`, `Array<X | Y>`) → `Array<T>`.
- `ReadonlyArray<simple>` → `readonly simple[]`.
Inspect each diagnostic before applying — the rule distinguishes simple vs non-simple types.

**Files**: Multiple.

**Verification**: 0 array-type diagnostics remaining.

---

## TASK 8 — Fix `prefer-destructuring` (25 sites)

**Status**: [ ]

**Plan**: Per-Edit per site — `const x = obj.x` → `const { x } = obj`. Bulk `replace_all` on common forms where possible.

**Files**: Multiple.

**Verification**: 0 prefer-destructuring diagnostics remaining.

---

## TASK 9 — Fix `no-non-null-assertion` (12 sites)

**Status**: [ ]

**Plan**: Per-site rewrite using explicit guards or `??` fallback. Inspect each.

**Files**: Multiple.

**Verification**: 0 no-non-null-assertion diagnostics remaining.

---

## TASK 10 — Fix `no-negated-condition` (9 sites), `no-lonely-if` (4), `no-array-sort` (4), `prefer-template` (3), `prefer-string-replace-all` (3), `numeric-separators-style` (2), `no-new-array` (2), `no-duplicate-imports` + `no-duplicates` (3), `prefer-string-slice` (1), `prefer-spread` (1), `prefer-set-has` (1), `consistent-function-scoping` (1)

**Status**: [ ]

**Plan**: Per-site mechanical fixes.

**Files**: Multiple.

**Verification**: All these rule diagnostics gone.

---

## TASK 11 — Fix `no-unused-vars` (5) + `require-param` (4) + `require-returns` (1)

**Status**: [ ]

**Plan**: Delete unused imports; add JSDoc tags.

**Files**: Multiple.

**Verification**: 0 of these diagnostics remaining.

---

## TASK 12 — Rename `vite-optimizeDeps.ts` → `vite-optimize-deps.ts`

**Status**: [ ]

**Plan**:
- Rename file to kebab-case.
- Update one importer (`svelte5-config-rules.test.ts:28`).
- Keep rule id `svelte5-config/vite-optimizeDeps` unchanged (matches Vite's `optimizeDeps` config key intentionally).

**Files**:
- Rename: `vite-optimizeDeps.ts` → `vite-optimize-deps.ts`
- Edit: `svelte5-config-rules.test.ts`

**Verification**: 0 filename-case diagnostic; the test file still imports the rule successfully.

---

## TASK 13 — Register Rules + Config

**Status**: [ ]

**Plan**:
- TASK 1 covered `.oxlintrc.json`.
- TASK 12 file rename verified via grep before vs after.
- No new exports.

**Files**: None additional.

**Verification**: `git diff --name-only HEAD` lists exactly the edited files plus `.oxlintrc.json` plus the plan doc.

---

## TASK 14 — Integration Verification

**Status**: [ ]

**Plan**:
- `grep -c registerCommand` unchanged.
- `grep -c "config\.get("` unchanged.
- Repo-wide grep confirms 0 importers of any deleted symbols.

**Verification**: Counts match baselines.

---

## TASK 15 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- `pnpm -w run qa:format`
- `pnpm -w run qa:lint packages/shared/config/tooling/lint` — exit 0.
- `pnpm --filter @/lint run qa:test` (resolve real package name from `package.json`).

**Verification**:
- Lint exits 0.
- Tests pass.

---

## TASK 16 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all touched files match the spec.
- Verify `qa:lint` exit 0, `git status` clean after commit.
- Commit message: `fix(lint): clear all qa:lint diagnostics` listing the rules cleared.

**Verification**:
- Lint exit 0.
- Clean tree.
- Commit message includes `qa:lint` + `lint`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | `.oxlintrc.json` overrides | -- |
| 2 | Fix `oxc-runner.ts` | 1 |
| 3 | Fix `svelte-template.ts` | 1 |
| 4 | Fix `rule-context.ts` | 1 |
| 5 | Bulk `curly` | 1 |
| 6 | `catch-error-name` sweep | 1 |
| 7 | `array-type` sweep | 1 |
| 8 | `prefer-destructuring` sweep | 1 |
| 9 | `no-non-null-assertion` sweep | 1 |
| 10 | Other mechanical sweeps | 1 |
| 11 | Unused-vars + JSDoc | 1 |
| 12 | Rename `vite-optimizeDeps.ts` | -- |
| 13 | Register Rules + Config | 1-12 |
| 14 | Integration Verification | 13 |
| 15 | Full QA + Coverage | 14 |
| 16 | Final verification + commit | 15 |
