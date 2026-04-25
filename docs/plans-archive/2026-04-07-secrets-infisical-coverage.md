# Secrets/Infisical — Push All Coverage Metrics Past Thresholds

## Context

`qa:test:coverage` for `@/secrets/infisical` fails 3 of 4 thresholds — statements 65.58% (need 80%), branches 61.03% (need 75%), lines 72.62% (need 80%). Functions barely pass at 81.25%. The package has 4 source files with 4 test files and 61 existing tests. Gaps are spread across all files: 106 uncovered statements, 90 uncovered branch paths, 6 uncovered functions. This plan adds targeted tests to each test file covering error branches, success paths, proxy traps, and convenience accessor functions.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/secrets/infisical` (`packages/shared/secrets/infisical/src/`)
**Goal**: Raise all 4 coverage metrics past thresholds (S:80% B:75% F:80% L:80%) with test-only changes.
**Architecture**: Vitest + v8 coverage; Result pattern; Valibot schema validation via `safeParse()` from `@/utils/result/safe`; vi.mock for external deps (`@infisical/sdk`, `@/config/loader`, `@/secrets/infisical/client`).

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric     | Value                              |
| ---------- | ---------------------------------- |
| Tests      | 61 total (61 pass, 4 test files)   |
| Statements | 65.58% (202/308) — FAIL (need 80%) |
| Branches   | 61.03% (141/231) — FAIL (need 75%) |
| Functions  | 81.25% (26/32) — pass              |
| Lines      | 72.62% (191/263) — FAIL (need 80%) |
| Thresholds | S:80% B:75% F:80% L:80%            |

### Per-file gaps

| File            | Statements | Functions | Branches | Key Gaps                                                                                                                                            |
| --------------- | ---------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| client.ts       | 60/72      | 6/6       | 48/63    | Error branches in resolveOptions, getClient, createClient, isAuthenticated; debug branch; accessToken/clientId spreads                              |
| cloudflare.ts   | 48/92      | 9/12      | 23/50    | 3 uncovered proxy traps (has, ownKeys, getOwnPropertyDescriptor); createSecretsProxy success path; getEnvSecret/getEnvSecretOrDefault success paths |
| environments.ts | 47/53      | 6/6       | 36/42    | Validation error branches for non-string inputs on all functions                                                                                    |
| secrets.ts      | 47/91      | 5/8       | 34/76    | 3 uncovered functions (getGlobalSecrets, getProductSecrets, getAllSecrets); getSecrets success paths; all validation error branches                 |

---

## TASK 1 — client.test.ts coverage (13 new tests)

**Status**: [x]

**Gap**: 12 uncovered statements, 15 uncovered branch paths. Missing: resolveOptions error branches, getClient error branches, createClient validation/spread/debug, isAuthenticated success path.

**Plan**:

Add import for mocked getConfig: `const { getConfig } = await import('@/config/loader');`

**resolveOptions()**:

- `returns error for invalid options input` — `resolveOptions(42 as any)`, assert `result.ok === false` — covers B[0] line 131
- `returns error when getConfig() fails` — mock `getConfig` to fail via `mockReturnValueOnce`, assert `result.ok === false` — covers B[1] line 136
- `uses INFISICAL_CACHE_TTL env var` — set env var to `'60000'`, assert `result.data.cacheTtl === 60000` — covers B[3] line 143 ternary
- `returns error for non-numeric INFISICAL_CACHE_TTL` — set env var to `'not-a-number'`, assert `result.ok === false` — covers B[4] line 152

**getClient()**:

- `returns error for invalid options` — `getClient({ siteUrl: 42 } as any)`, assert error — covers B[11] line 188
- `returns error when resolveOptions fails` — mock getConfig fail, assert error — covers B[12] line 192
- `creates new client when options change` — call twice with different opts, assert `mockInfisicalClient` called twice — covers singleton invalidation

**createClient()**:

- `returns error for invalid resolved options` — `createClient({ siteUrl: 123 } as any)`, assert error — covers B[17] line 234
- `spreads accessToken when non-empty` — resolve with token, assert constructor arg — covers B[18] line 241
- `spreads clientId and clientSecret when both non-empty` — set env vars, assert constructor arg — covers B[19] line 244
- `writes to stdout when debug is true` — spy on stdout.write, resolve with `debug: true`, assert called — covers B[20] line 253

**isAuthenticated()**:

- `returns error for invalid options` — `isAuthenticated(42 as any)`, assert error — covers B[24] line 322
- `returns true when listSecrets succeeds` — set PROJECT_ID, mock listSecrets success, assert `result.data === true` — covers S[69] line 340

**Files**:

- Edit: `src/client.test.ts`

**Verification**: `pnpm --filter @/secrets/infisical run qa:test` — all tests pass

---

## TASK 2 — cloudflare.test.ts coverage (20 new tests)

**Status**: [x]

**Gap**: 44 uncovered statements, 27 uncovered branch paths, 3 uncovered functions (proxy traps). Almost all success paths untested.

**Plan**:

Add helper fixture at top of file:

```typescript
function makeValidEnv(): Record<string, string> {
  return {
    API_SECRET_KEY: 'a'.repeat(32),
    D1_DATABASE_ID: 'db-id',
    KV_NAMESPACE_ID: 'kv-id',
    LEMON_SQUEEZY_API_KEY: 'ls-key-12345',
    REVENUECAT_API_KEY: 'rc-key-12345',
    POSTHOG_API_KEY: 'ph-key-12345',
    RESEND_API_KEY: 're_testkey123',
    GA_MEASUREMENT_ID: 'G-12345',
    STATUS_PAGE_TOKEN: 'sp-key-12345',
  };
}
```

**createSecretsProxy() — 7 tests**:

- `get returns value on valid env` — covers ensureValidated success + get trap
- `caches validated result` — second access hits `validated !== null` early return
- `throws on invalid env (non-object)` — covers `!envResult.ok` branch
- `caches and re-throws validation error` — first access caches error, second re-throws via `validationError !== null`
- `has() returns true/false` — covers uncovered has() function (F+1)
- `ownKeys() returns keys` — covers uncovered ownKeys() function (F+1)
- `getOwnPropertyDescriptor() returns descriptor or undefined` — covers uncovered function (F+1) + both branches

**getEnvSecret() — 3 tests**:

- `returns value for valid env and key` — success path
- `returns error for invalid key name` — `!keyResult.ok`
- `returns error when env fails validation` — `!result.ok` from validateWorkerEnv

**hasEnvSecret() — 2 tests**:

- `returns false for non-string value` — typeof narrowing
- `returns error for invalid key` — `!keyResult.ok`

**getEnvSecretOrDefault() — 4 tests**:

- `returns actual value when env valid` — success path
- `returns default when getEnvSecret fails` — fallback path
- `returns error for invalid key` — `!keyResult.ok`
- `returns error for invalid default value` — `!defaultResult.ok`

**withValidatedEnv() — 1 test**:

- `returns validated secrets for valid env` — success path

**hasRequiredSecrets() — 3 tests**:

- `returns true when all keys present` — success loop
- `returns error for invalid key names` — `!keysResult.ok`
- `returns false for empty string value` — `value.length === 0`

**Files**:

- Edit: `src/cloudflare.test.ts`

**Verification**: `pnpm --filter @/secrets/infisical run qa:test` — all tests pass

---

## TASK 3 — environments.test.ts coverage (10 new tests)

**Status**: [x]

**Gap**: 6 uncovered statements, 6 uncovered branch paths. All are validation error branches for non-string/invalid inputs.

**Plan**:

**Validation error branches**:

- `getEnvironmentFromBranch returns error for non-string` — `42 as any` — covers B[0] line 81
- `getParentEnvironment returns error for invalid env` — `'invalid' as any` — covers B[4] line 126
- `getChildEnvironments returns error for invalid env` — `'invalid' as any` — covers B[6] line 156
- `canAccessEnvironment returns error for invalid first param` — covers B[9] line 195
- `canAccessEnvironment returns error for invalid second param` — covers B[10] line 202

**Additional pattern coverage**:

- `getEnvironmentFromBranch returns development for chore/* branch`
- `getEnvironmentFromBranch returns staging for develop`
- `detectEnvironment uses GITHUB_HEAD_REF fallback`
- `detectEnvironment uses CI_COMMIT_BRANCH fallback`
- `getEnvironmentFromBranch returns development for docs/* branch`

**Files**:

- Edit: `src/environments.test.ts`

**Verification**: `pnpm --filter @/secrets/infisical run qa:test` — all tests pass

---

## TASK 4 — secrets.test.ts coverage (29 new tests)

**Status**: [x]

**Gap**: 44 uncovered statements, 42 uncovered branch paths, 3 uncovered functions (getGlobalSecrets, getProductSecrets, getAllSecrets).

**Plan**:

Add helper and import `* as v from 'valibot'`.

**getSecrets() — 12 tests**: invalid options error, client failure, env var fallbacks, missing projectId, tags passthrough, SDK throw, array-to-record conversion, non-conforming entries skip, non-array rawSecrets, attachToProcessEnv, skipValidation, schema validation failure.

**getSecret() — 3 tests**: non-string key error, invalid options error, missing projectId error.

**getGlobalSecrets() — 3 tests**: client failure, delegates with path '/', invalid options error. (covers F+1)

**getProductSecrets() — 2 tests**: client failure, invalid options error. (covers F+1)

**getAllSecrets() — 2 tests**: client failure, invalid options error. (covers F+1)

**hasSecret() — 2 tests**: invalid key error, invalid options error.

**getSecretsByKeys() — 3 tests**: invalid keys error, invalid options error, partial results with undefined for missing keys.

**loadSecretsToEnv() — 2 tests**: invalid options error, success path loads to env.

**Files**:

- Edit: `src/secrets.test.ts`

**Verification**: `pnpm --filter @/secrets/infisical run qa:test` — all tests pass

---

## TASK 5 — Register Rules + Config

**Status**: [x]

**Plan**:

- No new rules or commands to register — test-only changes
- Verify test files match vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/secrets/infisical run qa:test` discovers all test files, no orphaned tests

---

## TASK 6 — Integration Verification

**Status**: [x]

**Plan**:

- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: N/A — no new config settings
- Class instantiation check: N/A — no new classes (test-only changes)
- Unused exports / dead code check: No new exports, verify export count unchanged

**Verification**:

- `git diff --name-only` returns only `.test.ts` files
- Export count unchanged from baseline
- No orphaned test files

---

## TASK 7 — Full QA + Coverage

**Status**: [x]

**Plan**:

- Run: `pnpm -w run qa:format:check` (fix with `pnpm -w run qa:format` if needed)
- Run: `pnpm --filter @/secrets/infisical run qa:test:coverage`
- Verify all 4 thresholds pass (S >= 80%, B >= 75%, F >= 80%, L >= 80%)

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 8 — Final Verification + Commit

**Status**: [x]

**Plan**:

- Verify all 4 test files exist and pass
- Verify coverage meets all thresholds
- Verify no production source files modified
- Verify no regressions — existing 61 tests still pass
- Commit with descriptive message

**Verification**:

- Test count >= 125 (baseline 61 + ~72 new)
- All coverage metrics pass thresholds
- `pnpm --filter @/secrets/infisical run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description                   | Depends On |
| ---- | ----------------------------- | ---------- |
| 1    | client.test.ts coverage       | --         |
| 2    | cloudflare.test.ts coverage   | --         |
| 3    | environments.test.ts coverage | --         |
| 4    | secrets.test.ts coverage      | --         |
| 5    | Register rules + config       | 1-4        |
| 6    | Integration verification      | 5          |
| 7    | Full QA + Coverage            | 6          |
| 8    | Final verification + commit   | 7          |
