# `@/secrets/infisical` — qa:lint Cleanup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: `packages/shared/secrets/infisical/src/`
**Goal**: Make `pnpm -w run qa:lint packages/shared/secrets` exit 0 by resolving every oxlint diagnostic at the source — no rule disable comments, no assertion weakening.
**Architecture**: 121 diagnostics across 7 files; all fixes are mechanical or semantically equivalent. Curly braces dominate (91 of 121); the rest are unused-var deletions, modern-API swaps, type-form rewrites, and two guarded `!` assertions that we replace with explicit local-variable checks.

Each task is atomic: implement -> verify (`qa:lint <file>`) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| `qa:lint packages/shared/secrets` exit code | 1 |
| Total diagnostics | 121 |
| `oxlint/curly` (7 files) | 91 |
| `oxlint/no-unused-vars` (5 files) | 9 |
| `oxlint/no-dynamic-delete` (client.test.ts:65-72) | 8 |
| `oxlint/require-await` (secrets.ts:256, 285, 309) | 3 |
| `oxlint/numeric-separators-style` (client.test.ts:86, 269) | 2 |
| `oxlint/no-non-null-assertion` (environments.ts:85, 164) | 2 |
| `oxlint/array-type` (cloudflare.ts:313, 315) | 2 |
| `oxlint/no-duplicate-imports` (client.ts:36-37) | 1 |
| `oxlint/prefer-number-properties` (client.ts:144) | 1 |
| `oxlint/require-returns` (cloudflare.test.ts:20) | 1 |

---

## TASK 1 — Fix `client.ts` (12 diagnostics)

**Status**: [ ]

**Gap**: 10 single-line ifs (curly), 1 unused import (`NullableStrSchema` line 21), 1 duplicate import for `@/utils/core/object` (lines 36-37), 1 `parseInt` global use (line 144).

**Plan**:
- Delete `NullableStrSchema,` from the named-import block (line 21).
- Merge `import { safeStringify } from '@/utils/core/object';` + `import type { DeepReadonly } from '@/utils/core/object';` → `import { safeStringify, type DeepReadonly } from '@/utils/core/object';`.
- Line 144: `parseInt(cacheTtlEnv, 10)` → `Number.parseInt(cacheTtlEnv, 10)`.
- Wrap each curly-violating single-line `if` in braces (10 sites).

**Files**:
- Edit: `packages/shared/secrets/infisical/src/client.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/secrets/infisical/src/client.ts` reports 0 diagnostics.

---

## TASK 2 — Fix `secrets.ts` (19 diagnostics)

**Status**: [ ]

**Gap**: 15 single-line ifs (curly), 3 `async` functions with no `await` (require-await; lines 256, 285, 309), 1 unused import (`type ClientOptions` line 20).

**Plan**:
- Delete `type ClientOptions,` from the named-import block (line 20).
- Wrap each curly-violating single-line `if` in braces (15 sites — all `if (!x.ok) return x;` form).
- For each of `getGlobalSecrets`, `getProductSecrets`, `getAllSecrets` (lines 256, 285, 309): change `return getSecrets(…)` to `return await getSecrets(…)` so the function legitimately uses `await`. The functions must remain `async` because their early-return paths return synchronous `Result<…>` objects that need auto-wrapping into `Promise<Result<…>>` to match the declared return type.

**Files**:
- Edit: `packages/shared/secrets/infisical/src/secrets.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/secrets/infisical/src/secrets.ts` reports 0 diagnostics.

---

## TASK 3 — Fix `environments.ts` (8 diagnostics)

**Status**: [ ]

**Gap**: 6 single-line ifs (curly), 2 non-null assertions guarded by surrounding checks (lines 85, 164).

**Plan**:
- Wrap 6 single-line ifs in braces.
- Line 85 — replace the `!` assertion with an explicit local check:
  ```ts
  // Before:
  if (branchResult.data in DEFAULT_BRANCH_MAPPING) {
    return ok(StandardEnvironmentSchema, DEFAULT_BRANCH_MAPPING[branchResult.data]!);
  }
  // After:
  const mapped: StandardEnvironment | undefined = DEFAULT_BRANCH_MAPPING[branchResult.data];
  if (mapped !== undefined) {
    return ok(StandardEnvironmentSchema, mapped);
  }
  ```
  (Drop the `in`-check; the `!== undefined` guard is equivalent for a string-keyed record and avoids the assertion.)
- Line 164 — replace the `!` assertion with an explicit local check, collapsing both bounds-fail cases into one:
  ```ts
  // Before:
  if (idx === -1 || idx >= ENVIRONMENT_HIERARCHY.length - 1) {
    return okUnchecked([]);
  }
  return okUnchecked([ENVIRONMENT_HIERARCHY[idx + 1]!]);
  // After:
  const next: StandardEnvironment | undefined =
    idx === -1 ? undefined : ENVIRONMENT_HIERARCHY[idx + 1];
  if (next === undefined) {
    return okUnchecked([]);
  }
  return okUnchecked([next]);
  ```
  (Same behavior; the `idx === -1` ternary preserves the early-bail without indexing with `-1`.)

**Files**:
- Edit: `packages/shared/secrets/infisical/src/environments.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/secrets/infisical/src/environments.ts` reports 0 diagnostics.

---

## TASK 4 — Fix `cloudflare.ts` (18 diagnostics)

**Status**: [ ]

**Gap**: 14 single-line ifs (curly), 2 unused imports (`ERRORS`, `err` from `@/schemas/result/result` — line 19), 2 array-type form violations (lines 313, 315).

**Plan**:
- Delete `ERRORS, err,` from the named-import block on line 19 (keep `ok`, `okUnchecked`, type imports).
- Wrap 14 single-line ifs in braces.
- Line 313: `keys: readonly (keyof ProductSecrets)[]` → `keys: ReadonlyArray<keyof ProductSecrets>`.
- Line 315: `Result<(keyof ProductSecrets)[]>` → `Result<Array<keyof ProductSecrets>>`.

**Files**:
- Edit: `packages/shared/secrets/infisical/src/cloudflare.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/secrets/infisical/src/cloudflare.ts` reports 0 diagnostics.

---

## TASK 5 — Fix `client.test.ts` (22 diagnostics)

**Status**: [ ]

**Gap**: 9 single-line ifs (curly), 8 `delete process.env[…]` dynamic-delete (lines 65-72), 3 unused declarations (`type Str` line 9, `ClientOptionsSchema` line 50, `ResolvedOptionsSchema` line 51), 2 numeric-separators (lines 86, 269).

**Plan**:
- Remove `Str,` (type) from the type-import on line 9.
- Remove `ClientOptionsSchema,` and `ResolvedOptionsSchema,` from the destructuring on lines 50-51.
- Replace each `delete process.env[ENV_VARS.X];` with `Reflect.deleteProperty(process.env, ENV_VARS.X);` (8 sites).
- `300000` → `300_000` (line 86); `60000` → `60_000` (line 269).
- Wrap 9 single-line ifs in braces.

**Files**:
- Edit: `packages/shared/secrets/infisical/src/client.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/secrets/infisical/src/client.test.ts` reports 0 diagnostics.

---

## TASK 6 — Fix `cloudflare.test.ts` (10 diagnostics)

**Status**: [ ]

**Gap**: 9 single-line ifs (curly), 1 missing `@returns` JSDoc on `makeValidEnv` (line 20).

**Plan**:
- Add `@returns` tag to `makeValidEnv` JSDoc:
  ```ts
  /**
   * Minimum valid ProductSecrets env object for tests.
   *
   * @returns
   */
  ```
- Wrap 9 single-line ifs in braces.

**Files**:
- Edit: `packages/shared/secrets/infisical/src/cloudflare.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/secrets/infisical/src/cloudflare.test.ts` reports 0 diagnostics.

---

## TASK 7 — Fix `environments.test.ts` (29 diagnostics)

**Status**: [ ]

**Gap**: 28 single-line ifs (curly) — predominantly `if (result.ok) expect(...)`. 1 unused import (`vi` line 7).

**Plan**:
- Remove `vi,` from the vitest import on line 7.
- Use `replace_all` for the dominant pattern. There are several variants; expect to do 4-6 replace_all passes covering different `expect(...)` shapes. After each pass, check remaining count.

**Files**:
- Edit: `packages/shared/secrets/infisical/src/environments.test.ts`

**Verification**:
- After edits: `pnpm -w run qa:lint packages/shared/secrets/infisical/src/environments.test.ts` reports 0 diagnostics.

---

## TASK 8 — Fix `secrets.test.ts` (1 diagnostic)

**Status**: [ ]

**Gap**: 1 unused import (`afterEach` line 7).

**Plan**:
- Remove `afterEach,` from the vitest import on line 7.

**Files**:
- Edit: `packages/shared/secrets/infisical/src/secrets.test.ts`

**Verification**:
- After edit: no diagnostics for `secrets.test.ts`.

---

## TASK 9 — Fix `environments.ts` unused import (1 diagnostic)

**Status**: [ ]

**Gap**: `NumSchema` imported on line 13 but never referenced.

**Plan**:
- Delete `NumSchema,` from the import on line 13. (Combined with TASK 3, but separated here so each file is touched in one task — TASK 3 already lists this if needed; merging is fine.)

**Note**: This task can be merged into TASK 3 — handled together as a single edit pass on `environments.ts`. Treat TASK 9 as a verification line in TASK 3.

**Files**:
- Edit: `packages/shared/secrets/infisical/src/environments.ts` (covered by TASK 3)

**Verification**:
- TASK 3's verification covers this.

---

## TASK 10 — Register Rules + Config

**Status**: [ ]

**Plan**:
- No oxlint config changes (no rule disables this round).
- No new exports, no entry-point changes.

**Files**:
- None.

**Verification**:
- `git diff --name-only HEAD` lists only the seven edited source files plus this plan doc.

---

## TASK 11 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: `grep -c registerCommand packages/shared/secrets/infisical/src` is unchanged (no commands).
- Config settings read check: `grep -c "config\.get(" packages/shared/secrets/infisical/src` is unchanged (the `getConfig()` call sites are unchanged).
- Class instantiation / feature-wired check: no new classes or modules.
- Dead code / unused export check: 9 unused-var deletions reduce dead code; verify `git diff --stat` shows net deletions in import lines.

**Verification**:
- All four counts above match baselines (or improve via deletion).
- `git diff --name-only HEAD` shows exactly: `client.ts`, `client.test.ts`, `cloudflare.ts`, `cloudflare.test.ts`, `environments.ts`, `environments.test.ts`, `secrets.ts`, `secrets.test.ts`, plan doc.

---

## TASK 12 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint packages/shared/secrets` — must exit 0.
- Run: `pnpm -r --filter <pkg-name> run qa:test` (resolve actual package name first; likely `@/secrets-infisical`).

**Verification**:
- `pnpm -w run qa:lint packages/shared/secrets; echo $?` outputs `0`.
- All package tests pass.

---

## TASK 13 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all eight edited files match the spec above.
- Verify `pnpm -w run qa:lint packages/shared/secrets` exit 0.
- Verify `git status` shows clean tree after commit.
- Commit message states "fix(secrets): clear all qa:lint diagnostics" and lists the rules cleared.

**Verification**:
- `pnpm -w run qa:lint packages/shared/secrets; echo $?` outputs `0`.
- `git status` shows clean tree after commit.
- Commit message includes `qa:lint` and `secrets`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Fix `client.ts` | -- |
| 2 | Fix `secrets.ts` | -- |
| 3 | Fix `environments.ts` (incl. unused `NumSchema`) | -- |
| 4 | Fix `cloudflare.ts` | -- |
| 5 | Fix `client.test.ts` | -- |
| 6 | Fix `cloudflare.test.ts` | -- |
| 7 | Fix `environments.test.ts` | -- |
| 8 | Fix `secrets.test.ts` | -- |
| 9 | (merged into 3) | -- |
| 10 | Register Rules + Config | 1-8 |
| 11 | Integration Verification | 10 |
| 12 | Full QA + Coverage | 11 |
| 13 | Final verification + commit | 12 |
