/**
 * Playwright e2e: HTTP security headers on every served response.
 *
 * Asserts the editor's response headers include `X-Frame-Options`,
 * `X-Content-Type-Options`, `Referrer-Policy`, `Cross-Origin-Opener-
 * Policy`, `Cross-Origin-Resource-Policy`, and `Cross-Origin-Embedder-
 * Policy` with the values configured by `hooks.server.ts`. HSTS is
 * intentionally excluded because the dev server runs with `dev=true`.
 *
 * @module
 */

import { test, expect } from '@playwright/test';

/**
 * Expected security headers on every response from the dev server.
 *
 * Note: HSTS is excluded because the dev server runs with `dev=true`.
 * CSP is set via `<meta>` tag by SvelteKit's `kit.csp`, not as a response header in dev.
 */
const EXPECTED_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['x-frame-options', 'DENY'],
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
  ['cross-origin-opener-policy', 'same-origin-allow-popups'],
  ['cross-origin-resource-policy', 'same-origin'],
  ['cross-origin-embedder-policy', 'unsafe-none'],
  ['x-dns-prefetch-control', 'off'],
  ['x-permitted-cross-domain-policies', 'none'],
  ['x-xss-protection', '0'],
];

test.describe('security headers — normal page (/)', () => {
  for (const [header, value] of EXPECTED_HEADERS) {
    test(`${header} is ${value}`, async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.headers()[header]).toBe(value);
    });
  }

  test('Permissions-Policy includes camera, microphone, geolocation, interest-cohort', async ({
    page,
  }) => {
    const response = await page.goto('/');
    const policy = response?.headers()['permissions-policy'];
    expect(policy).toBeTruthy();
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
    expect(policy).toContain('geolocation=()');
    expect(policy).toContain('interest-cohort=()');
  });

  test('HSTS is set in production preview', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.headers()['strict-transport-security']).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
  });

  test('Cache-Control is private, no-cache for HTML', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.headers()['cache-control']).toBe('private, no-cache');
  });

  // CSP is delivered via static/_headers in production (Cloudflare Pages / Netlify).
  // The SPA fallback (index.html) is not prerendered, so SvelteKit's kit.csp
  // hash-based <meta> tags only apply to explicitly prerendered routes.
});

test.describe('security headers — error page (/test-error/404)', () => {
  for (const [header, value] of EXPECTED_HEADERS) {
    test(`${header} is ${value}`, async ({ page }) => {
      const response = await page.goto('/test-error/404');
      expect(response?.headers()[header]).toBe(value);
    });
  }

  test('Permissions-Policy includes camera, microphone, geolocation, interest-cohort', async ({
    page,
  }) => {
    const response = await page.goto('/test-error/404');
    const policy = response?.headers()['permissions-policy'];
    expect(policy).toBeTruthy();
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
    expect(policy).toContain('geolocation=()');
    expect(policy).toContain('interest-cohort=()');
  });

  test('Cache-Control is private, no-cache for HTML', async ({ page }) => {
    const response = await page.goto('/test-error/404');
    expect(response?.headers()['cache-control']).toBe('private, no-cache');
  });
});
