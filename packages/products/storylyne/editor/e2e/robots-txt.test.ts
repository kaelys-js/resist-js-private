/**
 * Playwright e2e: robots.txt route behavior.
 *
 * Verifies the `/robots.txt` route returns 200 with `text/plain`
 * Content-Type and emits the expected directives for search engines,
 * AI-search crawlers (e.g. Perplexity, ChatGPT-User), and AI-training
 * crawlers (GPTBot, ClaudeBot, etc).
 *
 * @module
 */

import { test, expect } from '@playwright/test';

test.describe('robots.txt', () => {
  test('returns 200', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
  });

  test('has text/plain content type', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/plain');
  });

  test('contains User-agent: * directive', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const text = await response.text();
    expect(text).toContain('User-agent: *');
  });

  test('disallows /api/ for all agents', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const text = await response.text();
    expect(text).toContain('Disallow: /api/');
  });

  test('blocks AI training crawlers', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const text = await response.text();
    const blockedCrawlers = [
      'GPTBot',
      'anthropic-ai',
      'CCBot',
      'Google-Extended',
      'Bytespider',
      'cohere-ai',
    ];
    for (const crawler of blockedCrawlers) {
      expect(text, `should block ${crawler}`).toContain(`User-agent: ${crawler}`);
    }
  });

  test('allows AI search crawlers', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const text = await response.text();
    const allowedCrawlers = ['ChatGPT-User', 'Claude-Web'];
    for (const crawler of allowedCrawlers) {
      expect(text, `should allow ${crawler}`).toContain(`User-agent: ${crawler}`);
    }
  });

  test('does not contain Sitemap directive', async ({ request }) => {
    const response = await request.get('/robots.txt');
    const text = await response.text();
    expect(text).not.toContain('Sitemap:');
  });
});
