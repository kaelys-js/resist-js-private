# Test Configuration Best Practices — Implementation Plan

**Date:** 2026-03-03
**Design:** `docs/plans/2026-03-03-test-config-design.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Task 1: Create `$app/state` mock file

**File:** `packages/products/webforge/editor/src/test-mocks/app-state.ts`

Create mock for SvelteKit's `$app/state` module matching the runes-based API.

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 2: Update Vitest root config

**File:** `vitest.config.ts`

Changes:
1. Change `pool: 'threads'` → `pool: 'forks'` (root-level test config)
2. Add `'$app/state'` alias to editor project's alias block, pointing to `packages/products/webforge/editor/src/test-mocks/app-state.ts`

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test` — all 2753+ tests must still pass

## Task 3: Centralize jsdom polyfills in test setup

**File:** `packages/products/webforge/editor/src/test-setup-component.ts`

Add to end of file:
1. `ResizeObserver` polyfill (no-op observe/unobserve/disconnect)
2. `Element.prototype.animate` polyfill (returns object with cancel/finished)

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 4: Remove duplicated polyfills from test files

**Files:**
- `packages/products/webforge/editor/src/lib/components/dev-toolbar.test.ts`
- `packages/products/webforge/editor/src/lib/components/dev-toolbar-feature-flags.test.ts`
- `packages/products/webforge/editor/src/lib/components/error-page.test.ts`

Remove the `beforeAll` blocks that set up `ResizeObserver` and `Element.prototype.animate`. Keep all other imports and test code.

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test` — all tests must still pass (polyfills now come from setup file)

## Task 5: Update Playwright config

**File:** `packages/products/webforge/editor/playwright.config.ts`

Full rewrite with:
- `isCI` variable for conditional config
- Local retries → 0
- `timeout: 30_000`, `expect: { timeout: 5_000 }`
- `actionTimeout: 10_000`, `navigationTimeout: 15_000`
- `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`
- CI-aware reporter
- `webServer`: `port` → `url`, `timeout: 120_000`, `stdout: 'ignore'`, `stderr: 'pipe'`

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test:e2e` — all 286 E2E tests must pass

## Task 6: Delete redundant editor vitest.config.ts

**File:** `packages/products/webforge/editor/vitest.config.ts` — DELETE

This file is unused by `pnpm qa:test` (root config's inline editor project runs instead).

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test` — verify all tests still pass without the local config

## Task 7: Run full QA suite

Run complete test suite to verify everything works:
- `pnpm -w run qa:lint --tools` — 0 errors
- `pnpm qa:lint` — 0 errors
- `pnpm qa:format` — clean
- `pnpm qa:test` — all unit tests pass
- `pnpm qa:test:e2e` — all E2E tests pass

## Task 8: Update ARCHITECTURE.md

Add a "Test Infrastructure" section documenting:
- Vitest project structure (root config with projects)
- Playwright configuration (build+preview, CI-aware)
- Mock files location and purpose
- Test setup file and centralized polyfills
