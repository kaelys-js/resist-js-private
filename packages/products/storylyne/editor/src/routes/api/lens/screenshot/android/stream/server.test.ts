/**
 * Tests for the Android MJPEG stream endpoint.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  dev: true,
  sdk: {
    installed: true,
    paths: { adb: '/sdk/adb', emulator: '/sdk/emulator' } as Record<string, string> | null,
  } as { installed: boolean; paths: Record<string, string> | null },
  captureCalls: 0,
  captureThrows: false,
}));

vi.mock('$app/environment', () => ({
  get dev() {
    return state.dev;
  },
}));

vi.mock('$lib/server/simulator/android-sdk', () => ({
  checkAndroidSdk: vi.fn(async () => { await Promise.resolve(); return state.sdk; }),
}));

vi.mock('$lib/server/simulator/android-screenshot', () => ({
  captureEmulatorScreenshot: vi.fn(() => {
    state.captureCalls++;
    if (state.captureThrows) {
      throw new Error('screencap failed');
    }
    /* 1x1 PNG base64 */
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }),
}));

async function load() {
  vi.resetModules();
  return await import('./+server');
}

function makeEvent(search = ''): { url: URL } {
  return { url: new URL(`http://localhost:3100/api/lens/screenshot/android/stream${search}`) };
}

describe('GET /api/lens/screenshot/android/stream', () => {
  beforeEach(() => {
    state.dev = true;
    state.sdk = { installed: true, paths: { adb: '/sdk/adb', emulator: '/sdk/emulator' } };
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

  it('returns 503 when SDK is not installed', async () => {
    state.sdk = { installed: false, paths: null };
    const { GET } = await load();
    const res = await GET(makeEvent() as never);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Android SDK not available');
  });

  it('returns 200 MJPEG stream and emits at least one frame', async () => {
    const { GET } = await load();
    const res = await GET(makeEvent('?serial=emulator-5556') as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/multipart\/x-mixed-replace; boundary=/);
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-store');
    expect(res.body).not.toBeNull();

    const reader = res.body!.getReader();
    const { value } = await reader.read();
    expect(value).toBeDefined();
    expect(value!.length).toBeGreaterThan(0);
    await reader.cancel();
    expect(state.captureCalls).toBeGreaterThanOrEqual(1);
  });

  it('survives a frame capture error (skips the frame, continues)', async () => {
    state.captureThrows = true;
    const { GET } = await load();
    const res = await GET(makeEvent() as never);
    expect(res.status).toBe(200);
    await res.body!.cancel();
  });
});
