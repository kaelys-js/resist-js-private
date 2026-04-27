/**
 * Playwright e2e: RFC 9116 `/.well-known/security.txt` route.
 *
 * Verifies the route returns 200 with `text/plain` Content-Type and
 * the body contains the RFC-mandated `Contact:` and `Expires:` fields
 * along with optional `Encryption:`, `Acknowledgments:`, `Policy:`,
 * `Hiring:`, and `Preferred-Languages:` directives where configured.
 *
 * @module
 */

import { test, expect } from '@playwright/test';

test.describe('security.txt', () => {
  test('returns 200 at /.well-known/security.txt', async ({ request }) => {
    const response = await request.get('/.well-known/security.txt');
    expect(response.status()).toBe(200);
  });

  test('has text/plain content type', async ({ request }) => {
    const response = await request.get('/.well-known/security.txt');
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/plain');
  });

  test('contains Contact field with URL', async ({ request }) => {
    const response = await request.get('/.well-known/security.txt');
    const text = await response.text();
    expect(text).toMatch(/Contact:\s*https?:\/\//);
  });

  test('contains Expires field with ISO 8601 date in the future', async ({ request }) => {
    const response = await request.get('/.well-known/security.txt');
    const text = await response.text();
    const match = text.match(/Expires:\s*(\S+)/);
    expect(match).toBeTruthy();
    const expiresDate = new Date(match![1]);
    expect(expiresDate.getTime()).toBeGreaterThan(Date.now());
  });

  test('contains Preferred-Languages field', async ({ request }) => {
    const response = await request.get('/.well-known/security.txt');
    const text = await response.text();
    expect(text).toContain('Preferred-Languages:');
  });

  test('contains Canonical field with URL', async ({ request }) => {
    const response = await request.get('/.well-known/security.txt');
    const text = await response.text();
    expect(text).toMatch(/Canonical:\s*https?:\/\//);
  });

  test('contains Policy field with URL', async ({ request }) => {
    const response = await request.get('/.well-known/security.txt');
    const text = await response.text();
    expect(text).toMatch(/Policy:\s*https?:\/\//);
  });
});
