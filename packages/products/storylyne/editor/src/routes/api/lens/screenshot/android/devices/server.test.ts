/**
 * Tests for the Android devices listing API endpoint.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  dev: true,
  sdkStatus: {
    installed: true,
    instructions: '',
    paths: { emulator: '/e', adb: '/a', avdmanager: '/v' },
  } as {
    installed: boolean;
    instructions: string;
    paths: { emulator: string; adb: string; avdmanager: string };
  },
  profiles: [] as unknown[],
  systemImages: [] as string[],
  profilesThrows: null as unknown,
}));

vi.mock('$app/environment', () => ({
  get dev() {
    return state.dev;
  },
}));

vi.mock('$lib/server/simulator/android-sdk', () => ({
  checkAndroidSdk: vi.fn(async () => {
    await Promise.resolve();
    return state.sdkStatus;
  }),
}));

vi.mock('$lib/server/simulator/android-devices', () => ({
  getAndroidDeviceProfiles: vi.fn(() => {
    if (state.profilesThrows) {
      throw state.profilesThrows;
    }
    return state.profiles;
  }),
  listSystemImages: vi.fn(async () => {
    await Promise.resolve();
    return state.systemImages;
  }),
}));

async function load() {
  vi.resetModules();
  return await import('./+server');
}

describe('GET /api/lens/screenshot/android/devices', () => {
  beforeEach(() => {
    state.dev = true;
    state.sdkStatus = {
      installed: true,
      instructions: '',
      paths: { emulator: '/e', adb: '/a', avdmanager: '/v' },
    };
    state.profiles = [
      { name: 'Pixel_9_API_35', width: 1080, height: 2424, density: 420, apiLevel: 35 },
    ];
    state.systemImages = ['system-images;android-35;google_apis;arm64-v8a'];
    state.profilesThrows = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 in production', async () => {
    state.dev = false;
    const { GET } = await load();
    const res = await GET({} as never);
    expect(res.status).toBe(404);
  });

  it('returns available=false with error when SDK not installed', async () => {
    state.sdkStatus = {
      installed: false,
      instructions: 'Install Android SDK',
      paths: { emulator: '', adb: '', avdmanager: '' },
    };
    const { GET } = await load();
    const res = await GET({} as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.available).toBe(false);
    expect(body.error).toBe('Install Android SDK');
    expect(body.devices).toEqual([]);
  });

  it('returns fresh device list on cache miss', async () => {
    const { GET } = await load();
    const res = await GET({} as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.available).toBe(true);
    expect(body.devices).toEqual(state.profiles);
    expect(body.systemImages).toEqual(state.systemImages);
  });

  it('serves cached result on second call within TTL', async () => {
    const mod = await load();
    const r1 = await mod.GET({} as never);
    const r2 = await mod.GET({} as never);
    expect(await r1.text()).toBe(await r2.text());
  });

  it('returns 500 when getAndroidDeviceProfiles throws', async () => {
    state.profilesThrows = new Error('emulator missing');
    const { GET } = await load();
    const res = await GET({} as never);
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.available).toBe(false);
    expect(body.error).toBe('emulator missing');
  });

  it('returns fallback error message on non-Error throw', async () => {
    state.profilesThrows = 42;
    const { GET } = await load();
    const res = await GET({} as never);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Failed to list Android devices');
  });
});
