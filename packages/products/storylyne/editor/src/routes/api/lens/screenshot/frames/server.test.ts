/**
 * Tests for the device frames API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('GET /api/lens/screenshot/frames', () => {
  it('returns 200 with JSON containing frames array', async () => {
    const response: Response = GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body.frames).toBeDefined();
    expect(Array.isArray(body.frames)).toBe(true);
  });

  it('frames array has entries with required fields', async () => {
    const response: Response = GET({} as never);
    const body = await response.json();

    if (body.frames.length > 0) {
      const first = body.frames[0];
      expect(first.id).toBeDefined();
      expect(first.name).toBeDefined();
    }
  });
});
