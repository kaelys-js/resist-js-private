# Test Configuration Best Practices — Design Document

**Date:** 2026-03-03
**Scope:** Vitest workspace config, Playwright config, test mocks, test setup

## Problem

The test infrastructure has several issues identified through best-practices review:

1. **Playwright config** missing timeouts, failure artifacts, and CI-aware settings
2. **Vitest root config** using `threads` pool (compatibility risk), missing `$app/state` mock
3. **ResizeObserver + Element.animate polyfills** duplicated in 3 test files instead of centralized
4. **Editor vitest.config.ts** is redundant (root config's inline editor project is what actually runs)
5. **Missing `$app/state` mock** — used by `+layout.svelte` and `+error.svelte`

## Changes

### 1. Playwright Config (`editor/playwright.config.ts`)

**Before:**
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

**After:**
```typescript
const isCI: boolean = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: isCI
    ? [['html', { open: 'never' }], ['github']]
    : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
```

**Key changes:**
- Local retries: 1 → 0 (don't mask flaky tests locally)
- Add `actionTimeout: 10_000` (prevent hanging on missing elements)
- Add `navigationTimeout: 15_000` (catch slow loads)
- Add explicit `timeout` and `expect.timeout`
- Add `screenshot: 'only-on-failure'` + `video: 'retain-on-failure'`
- CI-aware reporter (html + github on CI, list locally)
- `webServer`: `port` → `url`, add `timeout: 120_000`, add `stdout`/`stderr`

### 2. Vitest Root Config (`vitest.config.ts`)

**Changes to editor project:**
- `pool: 'threads'` → `pool: 'forks'` (better Babylon.js/SvelteKit compat)
- Add `$app/state` alias → `test-mocks/app-state.ts`

### 3. Test Setup Centralization (`editor/src/test-setup-component.ts`)

Move duplicated polyfills from 3 test files into the shared setup:
- `ResizeObserver` mock (currently in dev-toolbar.test.ts, dev-toolbar-feature-flags.test.ts, error-page.test.ts)
- `Element.prototype.animate` mock (currently in dev-toolbar.test.ts, error-page.test.ts)

### 4. New Mock: `$app/state` (`editor/src/test-mocks/app-state.ts`)

```typescript
export const page = {
  url: new URL('http://localhost'),
  params: {},
  route: { id: null },
  status: 200,
  error: null,
  data: {},
  form: undefined,
  state: {},
};

export const navigating = null;
export const updated = { current: false, check: async () => false };
```

### 5. Remove Redundant Editor Vitest Config

Delete `editor/vitest.config.ts` — the root config's inline editor project is what `pnpm qa:test` actually uses. Having both creates drift risk.

### 6. Clean Up Test Files

Remove `beforeAll` blocks containing `ResizeObserver`/`Element.animate` polyfills from:
- `dev-toolbar.test.ts`
- `dev-toolbar-feature-flags.test.ts`
- `error-page.test.ts`

## Files Modified

| File | Action |
|------|--------|
| `editor/playwright.config.ts` | Update config |
| `vitest.config.ts` | Update pool, add $app/state alias |
| `editor/src/test-setup-component.ts` | Add ResizeObserver, Element.animate polyfills |
| `editor/src/test-mocks/app-state.ts` | New — $app/state mock |
| `editor/vitest.config.ts` | Delete |
| `editor/src/lib/components/dev-toolbar.test.ts` | Remove beforeAll polyfills |
| `editor/src/lib/components/dev-toolbar-feature-flags.test.ts` | Remove beforeAll polyfills |
| `editor/src/lib/components/error-page.test.ts` | Remove beforeAll polyfills |

## Risk Assessment

- **Low risk**: All changes are config/test infrastructure — no production code modified
- **Playwright changes**: Only affect test runner behavior, not test logic
- **Vitest pool change**: `forks` is the default in Vitest 4.x, more compatible than `threads`
- **Mock centralization**: Same polyfill code, just moved to setup file
- **Deleting editor vitest.config.ts**: Verified it's unused by `pnpm qa:test`
