/**
 * Tests for the Android AVD creation API endpoint.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  dev: true,
  sdk: {
    installed: true,
    instructions: '',
    paths: { avdmanager: '/v', emulator: '/e', adb: '/a' },
  } as {
    installed: boolean;
    instructions: string;
    paths: { avdmanager: string; emulator: string; adb: string };
  },
  systemImages: ['system-images;android-35;google_apis;arm64-v8a'] as string[],
  createAvdName: 'Pixel_9_API_35',
  createThrows: null as unknown,
}));

vi.mock('$app/environment', () => ({
  get dev() {
    return state.dev;
  },
}));

vi.mock('$lib/server/simulator/android-sdk', () => ({
  checkAndroidSdk: vi.fn(async () => {
    await Promise.resolve();
    return state.sdk;
  }),
}));

vi.mock('$lib/server/simulator/android-devices', () => ({
  listSystemImages: vi.fn(async () => {
    await Promise.resolve();
    return state.systemImages;
  }),
  createAvd: vi.fn(() => {
    if (state.createThrows) {
      throw state.createThrows;
    }
    return state.createAvdName;
  }),
}));

async function load() {
  vi.resetModules();
  return await import('./+server');
}

function makeEvent(body: unknown | 'bad'): { request: Request } {
  const req =
    body === 'bad'
      ? new Request('http://localhost/create', { method: 'POST', body: 'not-json' })
      : new Request('http://localhost/create', {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        });

  return { request: req };
}

describe('POST /api/lens/screenshot/android/devices/create', () => {
  beforeEach(() => {
    state.dev = true;
    state.sdk = {
      installed: true,
      instructions: '',
      paths: { avdmanager: '/v', emulator: '/e', adb: '/a' },
    };
    state.systemImages = ['system-images;android-35;google_apis;arm64-v8a'];
    state.createAvdName = 'Pixel_9_API_35';
    state.createThrows = null;
  });
  afterEach(() => vi.clearAllMocks());

  it('returns 404 in production', async () => {
    state.dev = false;
    const { POST } = await load();
    const res = await POST(makeEvent({ deviceId: 'pixel_9' }) as never);
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid JSON body', async () => {
    const { POST } = await load();
    const res = await POST(makeEvent('bad') as never);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Invalid JSON body');
  });

  it('returns 400 when deviceId is missing', async () => {
    const { POST } = await load();
    const res = await POST(makeEvent({}) as never);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('deviceId is required');
  });

  it('returns 500 when SDK is not installed', async () => {
    state.sdk = {
      installed: false,
      instructions: 'Install Android SDK',
      paths: { avdmanager: '', emulator: '', adb: '' },
    };
    const { POST } = await load();
    const res = await POST(makeEvent({ deviceId: 'pixel_9' }) as never);
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Install Android SDK');
  });

  it('returns 500 when no system images are installed', async () => {
    state.systemImages = [];
    const { POST } = await load();
    const res = await POST(makeEvent({ deviceId: 'pixel_9' }) as never);
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toMatch(/No system images/);
  });

  it('returns 200 with AVD name on success', async () => {
    const { POST } = await load();
    const res = await POST(makeEvent({ deviceId: 'pixel_9' }) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe('Pixel_9_API_35');
    expect(body.deviceId).toBe('pixel_9');
  });

  it('returns 500 when createAvd throws', async () => {
    state.createThrows = new Error('avdmanager failed');
    const { POST } = await load();
    const res = await POST(makeEvent({ deviceId: 'pixel_9' }) as never);
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('avdmanager failed');
  });

  it('uses fallback message on non-Error throw', async () => {
    state.createThrows = 'x';
    const { POST } = await load();
    const res = await POST(makeEvent({ deviceId: 'pixel_9' }) as never);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Failed to create AVD');
  });
});
