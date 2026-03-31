# Head Meta Tags & Security Headers — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Pre-requisites

- Design doc: `docs/plans/2026-03-02-head-meta-security-design.md`
- All files in `packages/products/webforge/editor/`
- QA command: `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check`
- E2E command: `cd packages/products/webforge/editor && pnpm exec playwright test`

---

## Task 1: Fix `error.html` — add missing meta tags

### 1a. Write integration test (`src/error-html.test.ts`)

```typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const errorHtml: string = readFileSync(resolve(__dirname, 'error.html'), 'utf8');

describe('error.html static fallback', () => {
  it('contains charset utf-8', () => {
    expect(errorHtml).toContain('<meta charset="utf-8"');
  });

  it('contains viewport meta', () => {
    expect(errorHtml).toContain('<meta name="viewport"');
    expect(errorHtml).toContain('width=device-width');
  });

  it('contains color-scheme meta', () => {
    expect(errorHtml).toContain('<meta name="color-scheme" content="light dark"');
  });

  it('contains robots noindex', () => {
    expect(errorHtml).toContain('<meta name="robots" content="noindex, nofollow"');
  });

  it('contains SVG favicon link', () => {
    expect(errorHtml).toContain('rel="icon"');
    expect(errorHtml).toContain('type="image/svg+xml"');
  });

  it('contains PNG favicon link', () => {
    expect(errorHtml).toContain('type="image/png"');
    expect(errorHtml).toContain('sizes="32x32"');
  });

  it('contains apple-touch-icon link', () => {
    expect(errorHtml).toContain('rel="apple-touch-icon"');
    expect(errorHtml).toContain('sizes="180x180"');
  });

  it('contains title with sveltekit.status placeholder', () => {
    expect(errorHtml).toContain('%sveltekit.status%');
    expect(errorHtml).toContain('WebForge');
  });

  it('contains sveltekit.error.message placeholder', () => {
    expect(errorHtml).toContain('%sveltekit.error.message%');
  });

  it('contains Go to homepage link', () => {
    expect(errorHtml).toContain('href="/"');
    expect(errorHtml).toContain('Go to homepage');
  });
});
```

### 1b. Watch test fail

Run `pnpm qa:test` — new tests for color-scheme, robots, favicons will fail.

### 1c. Fix `src/error.html`

Add missing meta tags to `<head>`:

```html
<meta name="color-scheme" content="light dark" />
<meta name="robots" content="noindex, nofollow" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

Note: Use root-relative paths (`/favicon.svg`) — `error.html` doesn't support `%sveltekit.assets%`.

### 1d. Watch test pass

Run `pnpm qa:test` — all error.html tests pass.

### 1e. QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 2: Add security headers to `hooks.server.ts`

### 2a. Write tests (`src/hooks.server.test.ts`)

Add a new `describe('security headers')` block:

```typescript
describe('security headers', () => {
  it('sets X-Frame-Options to DENY', async () => {
    // Create a mock that captures the response from resolve
    // Verify the response has X-Frame-Options: DENY
  });

  it('sets X-Content-Type-Options to nosniff', async () => { ... });
  it('sets Referrer-Policy to strict-origin-when-cross-origin', async () => { ... });
  it('sets Permissions-Policy', async () => { ... });
  it('sets Cross-Origin-Opener-Policy to same-origin', async () => { ... });
});
```

The mock approach: `resolve` returns a `Response`. After `handle` calls `resolve`, it should set headers on the response. So the mock `resolve` function should return a real `Response` object, and after `handle` completes, we check the response headers.

Update `mockResolve()` to return a real `Response` so headers can be inspected. Or better: have `handle` return the response, and check headers on the returned response.

### 2b. Watch tests fail

Run `pnpm qa:test` — security header tests fail (no headers set yet).

### 2c. Implement security headers in `hooks.server.ts`

```typescript
const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
];

export const handle: Handle = async ({ event, resolve }) => {
  // ... existing locale logic ...

  const response: Response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', locale).replace('%dir%', dir),
  });

  for (const [name, value] of SECURITY_HEADERS) {
    response.headers.set(name, value);
  }

  return response;
};
```

### 2d. Watch tests pass

Run `pnpm qa:test`.

### 2e. QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 3: Create consolidated E2E test `e2e/head-meta.test.ts`

Test every head element on both `/` and `/test-error/404`.

Structure: Two `test.describe` blocks — `normal page (/)` and `error page (/test-error/404)`. Each tests all 16 meta elements.

For error pages, since `+error.svelte` renders inside `+layout.svelte`, all layout meta tags (description, application-name, theme-color, og:*, favicons) should be inherited. The error page only overrides title and adds robots.

Tests to write:

**Normal page (`/`)**:
1. charset utf-8
2. viewport contains width=device-width
3. color-scheme is "light dark"
4. robots contains noindex and nofollow
5. title is "WebForge"
6. description contains "HD-2D"
7. application-name is "WebForge"
8. theme-color light is #ffffff
9. theme-color dark is #0a0a0a
10. og:title is "WebForge"
11. og:description contains "HD-2D"
12. og:type is "website"
13. og:locale is "en_US"
14. favicon SVG link present
15. favicon PNG 32x32 link present
16. apple-touch-icon 180x180 link present

**Error page (`/test-error/404`)**:
1–16: Same elements. Title should match error format (`/page not found.*404.*WebForge/i`). Robots should still have noindex,nofollow. All other layout meta should be inherited unchanged.

### 3a. QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 4: Create E2E test `e2e/security-headers.test.ts`

Use `page.goto()` return value to inspect response headers.

```typescript
test('normal page has X-Frame-Options DENY', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
});
```

Tests: 5 headers × 2 pages (normal + error) = 10 tests.

### 4a. QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 5: Clean up existing E2E files

### 5a. Remove meta tests from `e2e/layout.test.ts`

Remove these 12 tests (now in `head-meta.test.ts`):
- `meta description is present`
- `meta application-name is WebForge`
- `og:locale defaults to en_US`
- `og:title matches page title`
- `og:description contains HD-2D`
- `og:type is website`
- `theme-color meta tag for light scheme`
- `theme-color meta tag for dark scheme`
- `color-scheme meta tag is present`
- `viewport meta tag is present`
- `charset meta tag is present`
- `robots noindex meta tag is present`

Keep:
- `page loads with correct title`
- `sidebar is visible on desktop`
- `breadcrumb contains Editor and Scene`

### 5b. Remove meta tests from `e2e/error-pages.test.ts`

Remove these 2 tests (now in `head-meta.test.ts`):
- `error page has noindex meta tag`
- `error page preserves og:title from layout`

Keep: All other tests in that file (status-specific, navigation, accessibility).

### 5c. QA

```bash
pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

---

## Task 6: Run E2E tests

```bash
cd packages/products/webforge/editor && pnpm exec playwright test
```

All tests must pass. Fix any failures before proceeding.

---

## QA Checklist

After all tasks:
- [ ] `pnpm -w run qa:lint --tools` — 0 errors
- [ ] `pnpm -w run qa:lint` — 0 errors
- [ ] `pnpm -w run qa:format:check` — 0 errors
- [ ] `pnpm qa:test` — all unit/integration tests pass
- [ ] `cd packages/products/webforge/editor && pnpm exec playwright test` — all E2E tests pass
