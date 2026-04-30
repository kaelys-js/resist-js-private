/**
 * Tests for the Playwright device profiles API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';

describe('GET /api/lens/screenshot/devices', () => {
  it('returns 200 with JSON array of device profiles', async () => {
    const response: Response = await GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = (await response.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('each device has name, width, height, scale fields', async () => {
    const response: Response = await GET({} as never);
    const body = (await response.json()) as Array<Record<string, unknown>>;
    const [first] = body;

    expect(typeof first?.name).toBe('string');
    expect(typeof first?.width).toBe('number');
    expect(typeof first?.height).toBe('number');
    expect(typeof first?.scale).toBe('number');
  });

  it('devices are sorted by name ascending', async () => {
    const response: Response = await GET({} as never);
    const body: Array<{ name: string }> = await response.json();
    const names: string[] = body.map((d): string => d.name);
    const sorted: string[] = names.toSorted((a: string, b: string): number => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('sets Cache-Control: no-cache', async () => {
    const response: Response = await GET({} as never);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('returns cached result on second call (identical body)', async () => {
    const first: Response = await GET({} as never);
    const second: Response = await GET({} as never);
    expect(await first.text()).toBe(await second.text());
  });

  it('extracts iOS version from iPhone UA strings', async () => {
    const response: Response = await GET({} as never);
    const body: Array<{ name: string; os: string }> = await response.json();
    const iphone = body.find((d): boolean => /iPhone/i.test(d.name));
    expect(iphone).toBeDefined();
    expect(iphone?.os).toMatch(/^iOS /);
  });

  it('extracts Android version for Pixel/Galaxy devices', async () => {
    const response: Response = await GET({} as never);
    const body: Array<{ name: string; os: string }> = await response.json();
    const android = body.find(
      (d): boolean => /Pixel|Galaxy/i.test(d.name) && /^Android/i.test(d.os),
    );
    expect(android).toBeDefined();
  });

  it('labels Desktop Chrome entries with macOS/Windows/Linux', async () => {
    const response: Response = await GET({} as never);
    const body: Array<{ name: string; os: string }> = await response.json();
    const desktop = body.find((d): boolean => /Desktop Chrome/i.test(d.name));
    expect(desktop).toBeDefined();
    if (desktop) {
      expect(['macOS', 'Windows', 'Linux', '']).toContain(desktop.os);
    }
  });

  it('exposes defaultBrowser, mobile and touch flags as typed values', async () => {
    const response: Response = await GET({} as never);
    const body: Array<{
      defaultBrowser: string;
      mobile: boolean;
      touch: boolean;
    }> = await response.json();

    for (const d of body) {
      expect(typeof d.defaultBrowser).toBe('string');
      expect(typeof d.mobile).toBe('boolean');
      expect(typeof d.touch).toBe('boolean');
    }
  });
});

describe('GET /api/lens/screenshot/devices — dev gate', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock('$app/environment');
    vi.resetModules();
  });

  it('returns 404 when $app/environment.dev is false', async () => {
    vi.doMock('$app/environment', () => ({ dev: false }));
    const { GET: prodGET } = await import('./+server');
    const response: Response = await prodGET({} as never);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Devices API is dev-only');
  });
});
