/**
 * Tests for the PWA web manifest route.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('GET /manifest.webmanifest', () => {
  it('returns 200 with application/manifest+json content type', () => {
    const response: Response = GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/manifest+json');
  });

  it('body is valid JSON with required manifest fields', async () => {
    const response: Response = GET({} as never);
    const body = await response.json();
    expect(body.name).toBeDefined();
    expect(body.short_name).toBeDefined();
    expect(body.start_url).toBeDefined();
    expect(body.icons).toBeDefined();
    expect(Array.isArray(body.icons)).toBe(true);
    expect(body.screenshots).toBeDefined();
    expect(Array.isArray(body.screenshots)).toBe(true);
  });

  it('manifest has correct app name and display mode', async () => {
    const response: Response = GET({} as never);
    const body = await response.json();
    expect(body.name).toBe('Storylyne');
    expect(body.display).toBe('standalone');
  });
});
