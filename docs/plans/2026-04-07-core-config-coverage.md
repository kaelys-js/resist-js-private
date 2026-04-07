# Core-Config Schemas — Push Coverage Past All Thresholds

## Context

`qa:test:coverage` for `@/schemas/core-config` currently fails all thresholds except branches. Three files are entirely untested (`secret-schemas.ts`, `product.ts` schemas, cross-field `v.check` callbacks). This plan adds tests to `config.test.ts` to cover every uncovered statement and function, bringing coverage above 80% on all axes.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-07
**Package**: `@/schemas/core-config` (`packages/shared/schemas/core-config/src/`)
**Goal**: Raise statement/function/line coverage past 80% thresholds with test-only changes. Currently failing S:70.4%, F:0%, L:70.4%.
**Architecture**: Vitest + v8 coverage; Valibot schemas (`v.strictObject`, `v.pipe`, `v.check`); schema-only package — no runtime logic beyond schema definitions and cross-field validation callbacks.

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
| Tests | 44 total (44 pass, 1 test file) |
| Statements | 70.4% (69/98) — need 80% (+10) |
| Branches | 100% (0/0) — passing |
| Functions | 0% (0/2) — need 80% (+2) |
| Lines | 70.4% (69/98) — need 80% (+10) |
| Thresholds | S:80% B:75% F:80% L:80% |

### Per-file uncovered code

| File | Stmts Covered | Funcs Covered | Key Gaps |
|------|---------------|---------------|----------|
| business.ts | 9/10 | 0/1 | `v.check` callback at line 291 (defaultLocale in locales) |
| config.ts | 2/3 | 0/1 | `v.check` callback at line 111 (defaultLocale in locales) |
| product.ts | 0/3 | 0/0 | `ProductLayersSchema`, `ProductToolingOverridesSchema`, `ProductConfigSchema` — entirely untested |
| secret-schemas.ts | 0/24 | 0/0 | All 13 individual + 3 composite + 2 registry schemas — entirely untested |

---

## TASK 1 — secret-schemas.ts: Cover All 24 Statements (Largest Gap)

**Status**: [x]

**Gap**: 24 uncovered statements — entire file untested. This is 82% of the total gap.

**Plan**:

Import all exported schemas. For each schema, test with valid data and verify `v.safeParse` succeeds.

Tests to add in `src/config.test.ts` (extend existing file):

**Global secret schemas**:
- **CloudflareSecretsSchema**: valid with `CLOUDFLARE_API_TOKEN` (8+ chars), `CLOUDFLARE_ACCOUNT_ID` (non-empty), optional `CLOUDFLARE_ZONE_ID`
- **GitHubSecretsSchema**: valid with `GITHUB_PAT`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`
- **GitLabSecretsSchema**: valid with `GITLAB_TOKEN`, `GITLAB_OAUTH_APP_ID`, `GITLAB_OAUTH_APP_SECRET`
- **TurboSecretsSchema**: valid with `TURBO_TOKEN`, `TURBO_TEAM`
- **DevEnvSecretsSchema**: valid with `HETZNER_TOKEN`

**Product secret schemas**:
- **DatabaseSecretsSchema**: valid with `D1_DATABASE_ID`, `KV_NAMESPACE_ID`
- **AuthSecretsSchema**: valid with `API_SECRET_KEY` (32+ chars)
- **PaymentSecretsSchema**: valid with `LEMON_SQUEEZY_API_KEY` (8+ chars)
- **RevenueCatSecretsSchema**: valid with `REVENUECAT_API_KEY`
- **AnalyticsSecretsSchema**: valid with `POSTHOG_API_KEY`
- **EmailSecretsSchema**: valid with `RESEND_API_KEY` (starts with `re_`), `GA_MEASUREMENT_ID`
- **StatusSecretsSchema**: valid with `STATUS_PAGE_TOKEN`
- **StorageSecretsSchema**: valid with empty optional fields

**Composite schemas**:
- **GlobalSecretsSchema**: valid with all global fields
- **ProductSecretsSchema**: valid with all product fields
- **AllSecretsSchema**: valid with all fields combined

**Registries**:
- **GLOBAL_SECRET_SCHEMAS**: verify keys `/cloudflare`, `/turbo`, `/devenv` exist
- **PRODUCT_SECRET_SCHEMAS**: verify keys `/api`, `/auth`, `/app`, `/marketing`, `/status`, `/storage` exist

**Rejection tests** (exact error codes):
- **DatabaseUrlSchema**: reject invalid URL (no protocol match)
- **SecretKeySchema**: reject short key (<32 chars)
- **ApiKeySchema**: reject short key (<8 chars)
- **EmailSecretsSchema**: reject missing `re_` prefix on RESEND_API_KEY
- **DurationStringSchema**: reject invalid format (implicit via AuthSecretsSchema)

**Files**:
- Edit: `src/config.test.ts`

**Verification**: `pnpm --filter @/schemas/core-config run qa:test` — new tests pass

---

## TASK 2 — product.ts: Cover 3 Untested Schemas

**Status**: [x]

**Gap**: 3 uncovered statements — `ProductLayersSchema`, `ProductToolingOverridesSchema`, `ProductConfigSchema` entirely untested.

**Plan**:

Tests to add in `src/config.test.ts`:

- **ProductLayersSchema**: valid with all 5 booleans (`api`, `app`, `marketing`, `status`, `assets`). Reject with missing field.
- **ProductToolingOverridesSchema**: valid with empty object `{}`. Valid with `{ ci: { enabled: true } }`.
- **ProductConfigSchema**: valid with full product config. Reject with invalid `id` (uppercase, too short). Verify optional fields default correctly.

**Files**:
- Edit: `src/config.test.ts`

**Verification**: `pnpm --filter @/schemas/core-config run qa:test` — new tests pass

---

## TASK 3 — business.ts + config.ts: Cover v.check Callbacks (2 Functions)

**Status**: [x]

**Gap**: 2 uncovered functions (the only 2 in the package) — the `v.check` cross-field validation callbacks in `BusinessSchema` (line 291) and `CoreConfigSchema` (line 111).

**Plan**:

The existing tests use `CoreConfigObjectSchema` (without the `v.check` pipe). Need to test `CoreConfigSchema` and `BusinessSchema` directly.

Tests to add in `src/config.test.ts`:

- **CoreConfigSchema valid**: parse valid config where `defaultLocale` is in `locales` → succeeds
- **CoreConfigSchema invalid**: parse config where `defaultLocale: 'fr'` but `locales: ['en']` → fails with "defaultLocale must be included"
- **BusinessSchema valid**: parse valid business config where `defaultLocale` is in `locales` → succeeds
- **BusinessSchema invalid**: parse business config where `defaultLocale` not in `locales` → fails

**Files**:
- Edit: `src/config.test.ts`

**Verification**: `pnpm --filter @/schemas/core-config run qa:test` — new tests pass, function coverage reaches 100%

---

## TASK 4 — Register Rules + Config

**Status**: [x]

**Plan**:
- No new rules or commands to register — test-only changes
- Verify test file matches vitest config include pattern (`src/**/*.test.ts`)
- No production code changes — no new exports to register

**Verification**: `pnpm --filter @/schemas/core-config run qa:test` discovers test file, no orphaned tests

---

## TASK 5 — Integration Verification

**Status**: [x]

**Plan**:
- No commands registered — test-only changes, no registerCommand calls needed
- Config settings read check: N/A — no new config settings
- Class instantiation check: N/A — no new classes added (test-only changes)
- Unused exports / dead code check: No new exports introduced, verify export count unchanged from baseline

**Verification**:
- `git diff --name-only` returns no production `.ts` files (only `.test.ts`)
- Export count unchanged from baseline

---

## TASK 6 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm --filter @/schemas/core-config run qa:test:coverage`
- Verify all 4 coverage thresholds pass (S >= 80%, F >= 80%, L >= 80%)

**Verification**: All pnpm commands exit 0, coverage passes all thresholds

---

## TASK 7 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all test files exist and pass
- Verify coverage meets all thresholds (S >= 80%, B >= 75%, F >= 80%, L >= 80%)
- Verify no production source files modified (only .test.ts files)
- Verify no regressions — existing 44 tests still pass
- Commit with descriptive message

**Verification**:
- Test count >= 60 (baseline 44 + ~16 new)
- All coverage metrics pass thresholds
- `pnpm --filter @/schemas/core-config run qa:test:coverage` exits 0

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | secret-schemas.ts — 24 uncovered statements | -- |
| 2 | product.ts — 3 untested schemas | -- |
| 3 | business.ts + config.ts — 2 v.check callbacks | -- |
| 4 | Register rules + config | 1-3 |
| 5 | Integration verification | 4 |
| 6 | Full QA + Coverage | 5 |
| 7 | Final verification + commit | 6 |
