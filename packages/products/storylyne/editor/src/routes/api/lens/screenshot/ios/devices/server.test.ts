/**
 * Tests for the iOS devices listing API endpoint.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  dev: true,
  xcrunOk: true,
  devices: [] as unknown[],
  throws: null as unknown,
}));

vi.mock('$app/environment', () => ({
  get dev() {
    return state.dev;
  },
}));

vi.mock('$lib/server/simulator/ios-simctl', () => ({
  isXcrunAvailable: vi.fn(async () => { await Promise.resolve(); return state.xcrunOk; }),
  listSimulatorDevices: vi.fn(() => {
    if (state.throws) {
      throw state.throws;
    }
    return state.devices;
  }),
}));

async function load() {
  vi.resetModules();
  return await import('./+server');
}

describe('GET /api/lens/screenshot/ios/devices', () => {
  beforeEach(() => {
    state.dev = true;
    state.xcrunOk = true;
    state.devices = [{ udid: 'U-1', name: 'iPhone 17 Pro', runtimeVersion: 'iOS 18.0' }];
    state.throws = null;
  });
  afterEach(() => vi.clearAllMocks());

  it('returns 404 in production', async () => {
    state.dev = false;
    const { GET } = await load();
    const res = await GET({} as never);
    expect(res.status).toBe(404);
  });

  it('returns available=false + error JSON when xcrun missing', async () => {
    state.xcrunOk = false;
    const { GET } = await load();
    const res = await GET({} as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.error).toBe('Xcode CLI tools not available');
    expect(body.devices).toEqual([]);
  });

  it('returns fresh device list on cache miss', async () => {
    const { GET } = await load();
    const res = await GET({} as never);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.devices).toEqual(state.devices);
  });

  it('serves cached result on second call within TTL', async () => {
    const mod = await load();
    const r1 = await mod.GET({} as never);
    const r2 = await mod.GET({} as never);
    expect(await r1.text()).toBe(await r2.text());
  });

  it('returns 500 when listSimulatorDevices throws an Error', async () => {
    state.throws = new Error('simctl broken');
    const { GET } = await load();
    const res = await GET({} as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.error).toBe('simctl broken');
  });

  it('uses fallback message when a non-Error is thrown', async () => {
    state.throws = 'oh-no';
    const { GET } = await load();
    const res = await GET({} as never);
    const body = await res.json();
    expect(body.error).toBe('Failed to list simulator devices');
  });
});
