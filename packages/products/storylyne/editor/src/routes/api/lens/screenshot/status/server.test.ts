/**
 * Tests for the combined backend status API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('GET /api/lens/screenshot/status', () => {
  it('returns 200 with JSON containing all three engine statuses', async () => {
    const response: Response = await GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body.playwright).toBeDefined();
    expect(body.iosSimulator).toBeDefined();
    expect(body.androidEmulator).toBeDefined();
  });

  it('playwright is always available', async () => {
    const response: Response = await GET({} as never);
    const body = await response.json();
    expect(body.playwright.available).toBe(true);
    expect(body.playwright.label).toBe('Playwright');
  });
});
