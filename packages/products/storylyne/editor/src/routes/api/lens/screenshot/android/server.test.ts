/**
 * Tests for the Android Emulator screenshot API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type LoadedModule = typeof import('./+server');

const state = vi.hoisted(() => ({
  dev: true,
  sdkStatus: {
    installed: true,
    instructions: '',
    paths: { emulator: '/sdk/emulator', adb: '/sdk/adb' },
  } as {
    installed: boolean;
    instructions: string;
    paths: { emulator: string; adb: string };
  },
  acquireResult: { serial: 'emulator-5554' } as { serial: string } | null,
  acquireThrows: null as unknown,
  cdpForwardThrows: false,
  cdpFetchTargets: [] as Array<Record<string, unknown>>,
  cdpFetchThrows: false,
  consoleLogs: [] as Array<{ level: string; text: string; source: string }>,
  screenshotBase64: 'ZmFrZS1wbmc=',
  deviceFrame: null as { framePath: string; screenRegion: unknown } | null,
}));

vi.mock('$app/environment', () => ({
  get dev() {
    return state.dev;
  },
}));

vi.mock('$lib/server/simulator/android-sdk', () => ({
  checkAndroidSdk: vi.fn(async () => state.sdkStatus),
}));

vi.mock('$lib/server/simulator/android-accessibility', () => ({
  applyAccessibilitySettings: vi.fn(async () => {}),
  parseAccessibilityParams: vi.fn(() => ({})),
}));

vi.mock('$lib/server/simulator/android-pool', () => ({
  acquireEmulator: vi.fn(async () => {
    if (state.acquireThrows) throw state.acquireThrows;
    return state.acquireResult;
  }),
  releaseEmulator: vi.fn(() => {}),
}));

vi.mock('$lib/server/simulator/android-cdp', () => ({
  setupCdpForward: vi.fn(async () => {
    if (state.cdpForwardThrows) throw new Error('cdp forward failed');
  }),
  captureConsoleLogs: vi.fn(async () => state.consoleLogs),
}));

vi.mock('$lib/server/simulator/android-navigate', () => ({
  openUrlInEmulator: vi.fn(async () => {}),
  setupPortForward: vi.fn(async () => {}),
}));

vi.mock('$lib/server/simulator/android-page-load', () => ({
  waitForPageLoad: vi.fn(async () => {}),
}));

vi.mock('$lib/server/simulator/android-screenshot', () => ({
  captureEmulatorScreenshot: vi.fn(async () => state.screenshotBase64),
}));

vi.mock('$lib/server/simulator/device-frames', () => ({
  findDeviceFrameByName: vi.fn(() => state.deviceFrame),
}));

async function load(): Promise<LoadedModule> {
  vi.resetModules();
  return (await import('./+server')) as LoadedModule;
}

function makeEvent(search = ''): { url: URL } {
  return { url: new URL(`http://localhost:3100/api/lens/screenshot/android${search}`) };
}

describe('GET /api/lens/screenshot/android', () => {
  beforeEach(() => {
    state.dev = true;
    state.sdkStatus = {
      installed: true,
      instructions: '',
      paths: { emulator: '/sdk/emulator', adb: '/sdk/adb' },
    };
    state.acquireResult = { serial: 'emulator-5554' };
    state.acquireThrows = null;
    state.cdpForwardThrows = false;
    state.cdpFetchTargets = [];
    state.cdpFetchThrows = false;
    state.consoleLogs = [];
    state.screenshotBase64 = 'ZmFrZS1wbmc=';
    state.deviceFrame = null;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (state.cdpFetchThrows) throw new Error('ECONNREFUSED');
        return { json: async () => state.cdpFetchTargets } as unknown as Response;
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns 404 in production (dev=false)', async () => {
    state.dev = false;
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Android Screenshot API is dev-only');
  });

  it('returns 500 with instructions when the SDK is not installed', async () => {
    state.sdkStatus = {
      installed: false,
      instructions: 'Install Android Studio',
      paths: { emulator: '', adb: '' },
    };
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Install Android Studio');
    expect(body.installed).toBe(false);
  });

  it('returns 400 when component is missing', async () => {
    const { GET } = await load();
    const res = await GET(makeEvent('') as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing required "component" parameter');
  });

  it('returns 500 when acquireEmulator returns null', async () => {
    state.acquireResult = null;
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to boot Android emulator with AVD "Medium_Phone_API_35"');
  });

  it('returns 500 when acquireEmulator throws', async () => {
    state.acquireThrows = new Error('boot failed');
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('boot failed');
  });

  it('returns fallback error message when a non-Error is thrown', async () => {
    state.acquireThrows = 'oops';
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect(body.error).toBe('Android Emulator screenshot failed');
  });

  it('returns 200 with happy-path shape, default AVD name when not specified', async () => {
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
    const body = await res.json();
    expect(body.source).toBe('android-emulator');
    expect(body.browser).toBe('chrome-mobile');
    expect(body.device).toBe('Medium_Phone_API_35');
    expect(body.image).toBe('ZmFrZS1wbmc=');
    expect(body.consoleLogs).toEqual([]);
  });

  it('uses a custom AVD name and passes through s/variant/option', async () => {
    const { GET } = await load();
    const res = await GET(
      makeEvent(
        '?component=button&avd=Pixel_9_API_35&s=eyJ4IjoxfQ%3D%3D&variant=primary&option=x',
      ) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.device).toBe('Pixel_9_API_35');
  });

  it('captures console logs when CDP target is reachable', async () => {
    state.cdpFetchTargets = [{ type: 'page', webSocketDebuggerUrl: 'ws://localhost:9222/page/1' }];
    state.consoleLogs = [{ level: 'warning', text: 'yo', source: 'console-api' }];
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect(body.consoleLogs).toEqual([{ level: 'warning', message: 'yo', source: 'console-api' }]);
  });

  it('falls back to no console logs when CDP forward throws', async () => {
    state.cdpForwardThrows = true;
    state.cdpFetchTargets = [{ type: 'page', webSocketDebuggerUrl: 'ws://x' }];
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect(body.consoleLogs).toEqual([]);
  });

  it('falls back when CDP fetch throws', async () => {
    state.cdpFetchThrows = true;
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect(body.consoleLogs).toEqual([]);
  });

  it('no console logs when no CDP page target found', async () => {
    state.cdpFetchTargets = [{ type: 'worker' }];
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect(body.consoleLogs).toEqual([]);
  });

  it('includes deviceFrame when lookup returns a frame', async () => {
    state.deviceFrame = { framePath: 'pixel-9', screenRegion: { x: 10 } };
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button&avd=Pixel_9_API_35') as never);
    const body = await res.json();
    expect(body.deviceFrame).toEqual({ frameId: 'pixel-9', screenRegion: { x: 10 } });
  });

  it('omits deviceFrame when no matching frame is found', async () => {
    state.deviceFrame = null;
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect('deviceFrame' in body).toBe(false);
  });
});
