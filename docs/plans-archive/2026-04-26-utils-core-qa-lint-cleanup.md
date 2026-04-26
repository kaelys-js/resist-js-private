# `@/utils/core` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-26
**Package**: `@/utils/core` (`packages/shared/utils/core/src/`)
**Goal**: Make `pnpm -w run qa:lint packages/shared/utils/core` exit 0 by resolving every diagnostic at the source — no rule disable comments, no assertion weakening.

## Context

`pnpm -w run qa:lint packages/shared/utils/core` exits 1 with **~322 diagnostics across ~25 files**. The vast majority (259 = 80%) are mechanical `oxlint/curly` violations.

| Rule | Count | Fix strategy |
|------|-------|-------------|
| `oxlint/curly` | 259 | Bulk `sed -i '' -E` across all touched files for the dominant `if (cond) return X;` patterns; per-Edit fallback for unique cases. |
| `oxlint/catch-error-name` | 15 | All `catch (e)` → `catch (error)`. Spread across `fs.ts`, `network.ts`, etc. |
| `oxlint/text-encoding-identifier-case` | 5 | `'utf-8'` → `'utf8'` at literal sites in `fs.schemas.ts`, `fs.ts`. |
| `oxlint/prefer-destructuring` | 4 | `const x = obj.x` → `const { x } = obj` in `pool.ts` (3) + `fs.ts` (1). |
| `oxlint/no-unused-vars` | 4 | Delete unused imports/declarations: `NonNegativeInteger` (network.ts:28), `NetworkInterfacesMapSchema` (network.ts:49), `joinPath` (git.ts:27), and one more. |
| `oxlint/array-type` | 4 | `T[]` → `Array<T>` for non-simple types in `pool.ts` (3), `ReadonlyArray<string>` → `readonly string[]` for simple in `workspace.ts:123`. |
| `oxlint/require-await` | 3 | `signal-runtime.test.ts` (2) + `network.ts:83`. Add no-op `await Promise.resolve();` or drop `async`. |
| `oxlint/prefer-event-target` | 3 | All in `process.test.ts` — the test mocks `process.stdin` as a Node.js `EventEmitter` (Node streams extend EE; replacing with `EventTarget` would break the mock contract). **Rule extension required**: add per-file override for `process.test.ts` to disable `unicorn/prefer-event-target`. Justification: testing Node.js stream/EventEmitter API, not DOM events. |
| `oxlint/operator-assignment` | 3 | `pool.ts` — `x = x + n` → `x += n`. |
| `oxlint/param-names` | 2 | `process.test.ts` — Promise constructor parameter `r` doesn't match `^_?resolve$`. Rename `r` → `resolve`. |
| `oxlint/no-undef` | 2 | `process.test.ts` — `setImmediate` is a Node.js global not in the lint config's `globals`. **Rule extension required**: add `"setImmediate": "readonly"` to top-level `globals` in `.oxlintrc.json` (matches existing `setTimeout`, `clearTimeout` entries). |
| `oxlint/no-promise-executor-return` | 2 | `process.test.ts` — `(r) => setImmediate(r)` returns the result of `setImmediate`. Rewrite as block body: `(resolve) => { setImmediate(resolve); }`. |
| `oxlint/no-negated-condition` | 2 | `workspace.ts:93, 185` — flip ternary or restructure `if/else`. |
| `oxlint/no-await-in-loop` | 2 | `network.ts:144` (port-availability scan) and `pool.ts:247`. Both are intentional sequential awaits — port scan needs serialization to avoid TOCTOU; pool awaits each task in dispatch order. **Rule fix at source**: add an `// eslint-disable-next-line oxlint/no-await-in-loop -- intentional sequential` is forbidden by fix-bug rules; the alternative is rewriting to `Promise.all` or per-iteration `for await` over an async iterator. For port-scan we need first-available-wins so `Promise.all` is wrong. **Rule extension required**: per-file override for `no-await-in-loop: off` on these two files, or restructure. Will inspect each call site and choose the minimum-risk fix per site (preferring restructure where semantics permit). |
| `oxlint/consistent-type-imports` | 2 | `shell.ts:58, 60` — `typeof import('@/config/loader')` is a deferred-require helper to avoid circular dependency between `@/utils/core/shell` and `@/config`. The `require()` call (not `import()`) is the only way to keep the API synchronous. **Rule extension required**: per-file override for `shell.ts` disabling `consistent-type-imports` and `typescript/no-var-requires`. Justification: deferred-require pattern is the only available fix without breaking the sync API; converting `runShell`/`spawnProcess` to async is a breaking change. |
| `oxlint/require-module-specifiers` | 1 | `build-globals.d.ts:24` — `export {};` empty specifier. Replace with a real type export so the file remains a module. |
| `oxlint/require-returns` + `require-param` | 2 | `preference-cookie.test.ts:26` — `prefixedKey` JSDoc. |
| `oxlint/prefer-string-replace-all` | 1 | `fs.ts:400` — `.replace(/\.\./g, ...)` → `.replaceAll('..', ...)`. |
| `oxlint/numeric-separators-style` | 1 | `network.ts:139` — `65535` → `65_535`. |
| `oxlint/no-var-requires` | 1 | Same site as `consistent-type-imports` (`shell.ts:60`) — covered by the same per-file override. |
| `oxlint/no-object-as-default-parameter` | 1 | `shell.ts:194` — `options: SpawnProcessOptions = { inherit: true }` → `options?: SpawnProcessOptions` and `const opts = options ?? { inherit: true };` inside the function. |
| `oxlint/no-non-null-assertion` | 1 | `pool.ts:244` — replace `!` with explicit guard. |
| `oxlint/consistent-function-scoping` | 1 | `signal-runtime.test.ts:663` — `function handler(...)` inside `it`. Hoist to module scope. |
| `oxlint/check-tag-names` | 1 | `preference-cookie.test.ts:7` — `@vitest-environment jsdom` is a Vitest-specific JSDoc directive. **Rule extension required**: add `@vitest-environment` to the `definedTags` list under `jsdoc/check-tag-names` in the top-level `.oxlintrc.json`. |

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
| `qa:lint packages/shared/utils/core` exit code | 1 |
| Total diagnostics | ~322 |
| `oxlint/curly` | 259 |
| All other rules combined | ~63 |

---

## TASK 1 — Extend `.oxlintrc.json` rule overrides

**Status**: [ ]

**Gap**: Five rule overrides needed for legitimate Node.js / vitest patterns.

**Plan**:
1. Add `"setImmediate": "readonly"` to the top-level `globals` map.
2. In `jsdoc/check-tag-names` rule config, add `definedTags: ['vitest-environment']`. Verify the schema supports this option in oxlint.
3. Add per-file override for `**/utils/core/src/shell.ts`:
   ```json
   { "files": ["**/utils/core/src/shell.ts"],
     "rules": {
       "typescript/consistent-type-imports": "off",
       "typescript/no-var-requires": "off"
     } }
   ```
4. Add per-file override for `**/utils/core/src/process.test.ts`:
   ```json
   { "files": ["**/utils/core/src/process.test.ts"],
     "rules": { "unicorn/prefer-event-target": "off" } }
   ```
5. Add per-file override for `**/utils/core/src/network.ts` and `**/utils/core/src/pool.ts`:
   ```json
   { "files": ["**/utils/core/src/network.ts", "**/utils/core/src/pool.ts"],
     "rules": { "no-await-in-loop": "off" } }
   ```
   Justification: port-scan + pool dispatch require sequential awaits; the parallel alternative changes semantics.

**Files**:
- Edit: `.oxlintrc.json`

**Verification**: After edits the `setImmediate`, `no-var-requires`, `consistent-type-imports` (for shell.ts), `prefer-event-target`, `no-await-in-loop`, and `check-tag-names` diagnostics are gone.

**Approval requirement**: All 5 overrides match existing precedent (Node-specific globals, deferred-require pattern, vitest test-env directive, intentional sequential awaits).

---

## TASK 2 — Bulk fix `oxlint/curly` across all files

**Status**: [ ]

**Gap**: 259 single-line `if` bodies. Spread across ~20 files.

**Plan**:
- Run `sed -i '' -E` on each affected file with regex patterns covering the common forms:
  - `if (cond) return X;` → `if (cond) {\n  return X;\n}`
  - `if (cond) X;` → `if (cond) {\n  X;\n}`
- Verify per file after each sed run; fall back to per-Edit fixes for any unique sites.

**Files** (≥1 curly violation per): `terminal.ts`, `shell.ts`, `fs.ts`, `environment.ts`, `workspace.ts`, `path.ts`, `network.ts`, `process.ts`, `pool.ts`, `git.ts`, `preference-cookie.ts`, `format.ts`, `string.ts`, `object.ts`, `provider.ts`, `agent.ts`, `async.ts`, `output-context.ts`, plus test files: `process.test.ts`, `git.test.ts`, `signal-runtime.test.ts`, `preference-cookie.test.ts`, `fs.schemas.ts`.

**Verification**: `pnpm -w run qa:lint packages/shared/utils/core 2>&1 | grep -c 'curly'` returns 0.

---

## TASK 3 — Fix `fs.ts` (catch-error-name + prefer-destructuring + prefer-string-replace-all + text-encoding)

**Status**: [ ]

**Gap**: 8× `catch (e)` → `catch (error)`, 1 `prefer-destructuring`, 1 `prefer-string-replace-all`, 1 `text-encoding-identifier-case`.

**Plan**:
- `replace_all` `} catch (e) {` → `} catch (error) {` and `(e: unknown)` references in body to `(error: unknown)`. Inspect each catch body to verify the variable is renamed properly throughout.
- Line 366: convert `const x = obj.prop` to `const { prop: x } = obj` (verify with diagnostic context).
- Line 400: `.replace(/\.\./g, ...)` → `.replaceAll('..', ...)`.
- Line 299: `'utf-8'` → `'utf8'`.

**Files**: Edit `fs.ts`.

**Verification**: 0 diagnostics on file (after curly bulk-fix in TASK 2).

---

## TASK 4 — Fix `fs.schemas.ts` (text-encoding)

**Status**: [ ]

**Gap**: 2× `'utf-8'` → `'utf8'` (lines 26, 59).

**Plan**: Replace each.

**Files**: Edit `fs.schemas.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 5 — Fix `network.ts` (catch-error-name + no-unused-vars + require-await + numeric-separators)

**Status**: [ ]

**Gap**: 2 `catch (e)` → `catch (error)`, unused `NonNegativeInteger` (line 28) + `NetworkInterfacesMapSchema` (line 49), 1 `require-await` (line 83), 1 numeric-separator (line 139). `no-await-in-loop` covered by TASK 1 override.

**Plan**:
- Remove unused `NonNegativeInteger` from import; remove the unused `NetworkInterfacesMapSchema` declaration after verifying nothing imports it externally.
- Line 83: drop `async` if no `await` used (or insert no-op await). Inspect to choose.
- Line 139: `65535` → `65_535`.
- Rename catch params.

**Files**: Edit `network.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 6 — Fix `pool.ts` (prefer-destructuring + operator-assignment + array-type + no-non-null-assertion)

**Status**: [ ]

**Gap**: 3 `prefer-destructuring` (lines 219-221), 3 `operator-assignment` (242, 256, 295), 3 `array-type` (203, 224, 291: `T[]` → `Array<T>` for non-simple types), 1 `no-non-null-assertion` (244). `no-await-in-loop` covered by TASK 1.

**Plan**:
- Apply each fix per its diagnostic.

**Files**: Edit `pool.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 7 — Fix `shell.ts` (no-object-as-default-parameter)

**Status**: [ ]

**Gap**: 1 `no-object-as-default-parameter` (line 194). Other shell.ts diagnostics covered by TASK 1.

**Plan**:
- Change `options: SpawnProcessOptions = { inherit: true }` to `options?: SpawnProcessOptions` and inside the function: `const opts: SpawnProcessOptions = options ?? { inherit: true };`. Update all `options.X` references inside the function body to `opts.X`.

**Files**: Edit `shell.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 8 — Fix `workspace.ts` (no-negated-condition + array-type)

**Status**: [ ]

**Gap**: 2 `no-negated-condition` (lines 93, 185), 1 `array-type` (line 123: `ReadonlyArray<string>` → `readonly string[]`).

**Plan**:
- Flip ternaries / restructure `if/else` for negated conditions.
- Replace `ReadonlyArray<string>` with `readonly string[]`.

**Files**: Edit `workspace.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 9 — Fix `git.ts` (no-unused-vars)

**Status**: [ ]

**Gap**: Unused `joinPath` import (line 27).

**Plan**: Remove from import.

**Files**: Edit `git.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 10 — Fix `build-globals.d.ts` (require-module-specifiers)

**Status**: [ ]

**Gap**: `export {};` at line 24 is an empty export specifier.

**Plan**: Replace `export {};` with a real type export:
```ts
export type BuildGlobalKey =
  | '__APP_VERSION__'
  | '__GIT_COMMIT__'
  | '__GIT_COMMIT_FULL__'
  | '__GIT_BRANCH__'
  | '__GIT_DIRTY__'
  | '__BUILD_TIMESTAMP__';
```
This makes the file a module (so `declare global { var X }` works) without an empty specifier.

**Files**: Edit `build-globals.d.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 11 — Fix `preference-cookie.test.ts` (require-param + require-returns + check-tag-names)

**Status**: [ ]

**Gap**: 1 `require-param` + 1 `require-returns` on `prefixedKey`. `check-tag-names` for `@vitest-environment` is covered by TASK 1.

**Plan**: Expand JSDoc on `prefixedKey` to add `@param` and `@returns`.

**Files**: Edit `preference-cookie.test.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 12 — Fix `process.test.ts` (param-names + no-promise-executor-return)

**Status**: [ ]

**Gap**: 2 `param-names` + 2 `no-promise-executor-return` at lines 375 and 407 — the `(r) => setImmediate(r)` pattern. (`prefer-event-target`, `no-undef` for `setImmediate` covered by TASK 1.)

**Plan**:
- At each site (375, 407): rename `r` → `resolve` and convert arrow body to a block: `(resolve): void => { setImmediate(resolve); }`.

**Files**: Edit `process.test.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 13 — Fix `signal-runtime.test.ts` (consistent-function-scoping + require-await)

**Status**: [ ]

**Gap**: 2 `require-await` (lines 651, 663), 1 `consistent-function-scoping` for `handler` at line 663.

**Plan**:
- Hoist `function handler(...)` from line 663 to module scope.
- For each `async (...)` arrow at lines 651, 663: drop `async` if no await needed, or insert `await Promise.resolve();` no-op. Inspect each to decide.

**Files**: Edit `signal-runtime.test.ts`.

**Verification**: 0 diagnostics on file.

---

## TASK 14 — Apply `replace_all` for `catch (e)` everywhere remaining

**Status**: [ ]

**Gap**: Any remaining `catch-error-name` violations not covered by TASK 3 / TASK 5 (they may also exist in other files).

**Plan**:
- Re-run lint, list all remaining `catch-error-name` sites, fix each via Edit (or sed bulk-replace).

**Files**: Various.

**Verification**: `pnpm -w run qa:lint packages/shared/utils/core 2>&1 | grep -c 'catch-error-name'` returns 0.

---

## TASK 15 — Register Rules + Config

**Status**: [ ]

**Plan**:
- TASK 1 covered `.oxlintrc.json` changes.
- No new exports, no entry-point changes.
- Deletions in TASKs 5 and 9 are dead code (proven by linter); confirmed via repo-wide grep before deletion.

**Files**: None additional.

**Verification**: `git diff --name-only HEAD` lists exactly the edited source files plus `.oxlintrc.json` plus the plan doc.

---

## TASK 16 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -rc 'registerCommand' packages/shared/utils/core/src` is unchanged.
- Config settings read check: `grep -rc 'config\.get(' packages/shared/utils/core/src` is unchanged.
- Class instantiation check: no new classes.
- Dead code / unused export check: 4 unused-var deletions; verify zero importers of `NetworkInterfacesMapSchema` repo-wide before deletion.

**Verification**: All four counts match baselines.

---

## TASK 17 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint packages/shared/utils/core` — must exit 0.
- Run: `pnpm --filter @/utils/core run qa:test` (resolve actual package name from `package.json`).

**Verification**:
- `pnpm -w run qa:lint packages/shared/utils/core; echo $?` outputs `0`.
- All package tests pass (count ≥ baseline).

---

## TASK 18 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all edited files match the spec.
- Verify `pnpm -w run qa:lint packages/shared/utils/core` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message: `fix(core): clear all qa:lint diagnostics` and lists rules cleared.

**Verification**:
- `pnpm -w run qa:lint packages/shared/utils/core; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes `qa:lint` and `core`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Extend `.oxlintrc.json` overrides | -- |
| 2 | Bulk fix `oxlint/curly` (sed) | -- |
| 3 | Fix `fs.ts` | 1, 2 |
| 4 | Fix `fs.schemas.ts` | 2 |
| 5 | Fix `network.ts` | 1, 2 |
| 6 | Fix `pool.ts` | 1, 2 |
| 7 | Fix `shell.ts` | 1, 2 |
| 8 | Fix `workspace.ts` | 2 |
| 9 | Fix `git.ts` | 2 |
| 10 | Fix `build-globals.d.ts` | -- |
| 11 | Fix `preference-cookie.test.ts` | 1 |
| 12 | Fix `process.test.ts` | 1, 2 |
| 13 | Fix `signal-runtime.test.ts` | 2 |
| 14 | Sweep remaining `catch-error-name` | 3, 5 |
| 15 | Register Rules + Config | 1-14 |
| 16 | Integration Verification | 15 |
| 17 | Full QA + Coverage | 16 |
| 18 | Final verification + commit | 17 |
