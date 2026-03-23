/**
 * Tests for the Playwright device profiles API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('GET /api/lens/screenshot/devices', () => {
  it('returns 200 with JSON array of device profiles', async () => {
    const response: Response = await GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('each device has name, width, height, scale fields', async () => {
    const response: Response = await GET({} as never);
    const body = await response.json();
    const [first] = body;

    expect(typeof first.name).toBe('string');
    expect(typeof first.width).toBe('number');
    expect(typeof first.height).toBe('number');
    expect(typeof first.scale).toBe('number');
  });
});
