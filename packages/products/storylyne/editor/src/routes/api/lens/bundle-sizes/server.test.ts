/**
 * Tests for the bundle sizes API endpoint.
 *
 * Runs in the storylyne-editor-server vitest project (node env, no jsdom)
 * because esbuild requires native Node.js TextEncoder.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Num } from '@/schemas/common';
import { GET } from './+server';

describe('GET /api/lens/bundle-sizes', () => {
  it('returns 200 with JSON content type', async () => {
    const response: Response = await GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  }, 30_000);

  it('response body is a JSON object with component directories', async () => {
    const response: Response = await GET({} as never);
    const body: Record<string, unknown> = await response.json();
    expect(typeof body).toBe('object');
    const keys = Object.keys(body);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('each entry has compiled and gzip numeric fields', async () => {
    const response: Response = await GET({} as never);
    const body: Record<string, { compiled: Num; gzip: Num }> = await response.json();
    const entries = Object.entries(body);
    expect(entries.length).toBeGreaterThan(0);

    for (const [dir, entry] of entries) {
      expect(typeof entry.compiled, `${dir}.compiled should be number`).toBe('number');
      expect(typeof entry.gzip, `${dir}.gzip should be number`).toBe('number');
      expect(entry.compiled, `${dir}.compiled should be positive`).toBeGreaterThan(0);
      expect(entry.gzip, `${dir}.gzip should be positive`).toBeGreaterThan(0);
    }
  });

  it('returns cached result on second call', async () => {
    const response1: Response = await GET({} as never);
    const body1: string = await response1.text();

    const start = performance.now();
    const response2: Response = await GET({} as never);
    const elapsed = performance.now() - start;
    const body2: string = await response2.text();

    expect(body1).toBe(body2);
    expect(elapsed).toBeLessThan(10);
  });
});
