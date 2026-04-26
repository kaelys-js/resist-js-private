/**
 * Tests for the iOS MJPEG stream endpoint.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  dev: true,
  xcrunOk: true,
  captureCalls: 0,
  captureThrows: false,
}));

vi.mock('$app/environment', () => ({
  get dev() {
    return state.dev;
  },
}));

vi.mock('$lib/server/simulator/ios-simctl', () => ({
  isXcrunAvailable: vi.fn(async () => {
    await Promise.resolve();
    return state.xcrunOk;
  }),
}));

vi.mock('$lib/server/simulator/ios-screenshot', () => ({
  captureSimulatorScreenshot: vi.fn(() => {
    state.captureCalls++;
    if (state.captureThrows) {
      throw new Error('screenshot failed');
    }
    return Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  }),
}));

async function load() {
  vi.resetModules();
  return await import('./+server');
}

function makeEvent(search = ''): { url: URL } {
  return { url: new URL(`http://localhost:3100/api/lens/screenshot/ios/stream${search}`) };
}

describe('GET /api/lens/screenshot/ios/stream', () => {
  beforeEach(() => {
    state.dev = true;
    state.xcrunOk = true;
    state.captureCalls = 0;
    state.captureThrows = false;
  });
  afterEach(() => vi.clearAllMocks());

  it('returns 404 in production', async () => {
    state.dev = false;
    const { GET } = await load();
    const res = await GET(makeEvent() as never);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Stream API is dev-only');
  });

  it('returns 503 when xcrun is unavailable', async () => {
    state.xcrunOk = false;
    const { GET } = await load();
    const res = await GET(makeEvent() as never);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('xcrun not available');
  });

  it('returns 200 MJPEG stream and emits at least one frame', async () => {
    const { GET } = await load();
    const res = await GET(makeEvent('?udid=X') as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/multipart\/x-mixed-replace; boundary=/);
    expect(res.body).not.toBeNull();

    const reader = res.body!.getReader();
    const { value } = await reader.read();
    expect(value).toBeDefined();
    expect(value!.length).toBeGreaterThan(0);
    await reader.cancel();
    expect(state.captureCalls).toBeGreaterThanOrEqual(1);
  });

  it('survives capture errors and continues', async () => {
    state.captureThrows = true;
    const { GET } = await load();
    const res = await GET(makeEvent() as never);
    expect(res.status).toBe(200);
    await res.body!.cancel();
  });
});
