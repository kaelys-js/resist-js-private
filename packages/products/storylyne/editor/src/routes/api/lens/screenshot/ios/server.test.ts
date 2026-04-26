/**
 * Tests for the iOS Simulator screenshot API endpoint.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ServerModule from './+server';

type LoadedModule = typeof ServerModule;

const state = vi.hoisted(() => ({
  dev: true,
  xcrunAvailable: true,
  devices: [] as Array<{ udid: string; name: string; runtimeVersion: string }>,
  acquireImpl: null as ((udid: string, name: string) => Promise<{ udid: string }>) | null,
  acquireThrows: null as Error | null,
  debugProxyInstalled: false,
  inspectablePages: [] as Array<{ url: string; webSocketDebuggerUrl: string }>,
  consoleLogs: [] as unknown[],
  screenshotBuffer: Buffer.from('png-bytes'),
  safeAreaInsets: null as { top: number; bottom: number; left: number; right: number } | null,
  deviceFrame: null as { framePath: string; screenRegion: unknown } | null,
}));

vi.mock('$app/environment', () => ({
  get dev() {
    return state.dev;
  },
}));

vi.mock('$lib/server/simulator/ios-simctl', () => ({
  isXcrunAvailable: vi.fn(async () => {
    await Promise.resolve();
    return state.xcrunAvailable;
  }),
  listSimulatorDevices: vi.fn(async () => {
    await Promise.resolve();
    return state.devices;
  }),
}));

vi.mock('$lib/server/simulator/ios-accessibility', () => ({
  applyAccessibilitySettings: vi.fn(() => {}),
  parseAccessibilityParams: vi.fn(() => ({})),
}));

vi.mock('$lib/server/simulator/ios-debug-proxy', () => ({
  isDebugProxyInstalled: vi.fn(async () => {
    await Promise.resolve();
    return state.debugProxyInstalled;
  }),
  startDebugProxy: vi.fn(() => {}),
  getInspectablePages: vi.fn(async () => {
    await Promise.resolve();
    return state.inspectablePages;
  }),
}));

vi.mock('$lib/server/simulator/ios-pool', () => ({
  acquireSimulator: vi.fn((udid: string, name: string) => {
    if (state.acquireThrows) {
      throw state.acquireThrows;
    }
    if (state.acquireImpl) {
      return state.acquireImpl(udid, name);
    }
    return { udid };
  }),
  releaseSimulator: vi.fn(() => {}),
}));

vi.mock('$lib/server/simulator/ios-page-load', () => ({
  waitForPageLoad: vi.fn(() => {}),
}));

vi.mock('$lib/server/simulator/ios-console-capture', () => ({
  captureConsoleLogs: vi.fn(async () => {
    await Promise.resolve();
    return state.consoleLogs;
  }),
  formatConsoleMessages: vi.fn((m: unknown) => m),
}));

vi.mock('$lib/server/simulator/ios-screenshot', () => ({
  captureSimulatorScreenshot: vi.fn(async () => {
    await Promise.resolve();
    return state.screenshotBuffer;
  }),
}));

vi.mock('$lib/server/simulator/ios-navigate', () => ({
  openUrlInSimulator: vi.fn(() => {}),
}));

vi.mock('$lib/server/simulator/ios-safe-area', () => ({
  getStaticSafeAreaInsets: vi.fn(() => state.safeAreaInsets),
}));

vi.mock('$lib/server/simulator/device-frames', () => ({
  findDeviceFrameByName: vi.fn(() => state.deviceFrame),
}));

async function load(): Promise<LoadedModule> {
  vi.resetModules();
  return (await import('./+server')) as LoadedModule;
}

function makeEvent(search = ''): { url: URL } {
  return { url: new URL(`http://localhost:3100/api/lens/screenshot/ios${search}`) };
}

describe('GET /api/lens/screenshot/ios', () => {
  beforeEach(() => {
    state.dev = true;
    state.xcrunAvailable = true;
    state.devices = [
      { udid: 'UDID-A', name: 'iPhone 17 Pro', runtimeVersion: 'iOS 18.0' },
      { udid: 'UDID-B', name: 'iPad Pro 13-inch', runtimeVersion: 'iPadOS 18.0' },
    ];
    state.acquireImpl = null;
    state.acquireThrows = null;
    state.debugProxyInstalled = false;
    state.inspectablePages = [];
    state.consoleLogs = [];
    state.screenshotBuffer = Buffer.from('png-bytes');
    state.safeAreaInsets = null;
    state.deviceFrame = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 in production (dev=false)', async () => {
    state.dev = false;
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('iOS Screenshot API is dev-only');
  });

  it('returns 500 when xcrun is unavailable', async () => {
    state.xcrunAvailable = false;
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Xcode CLI tools not available/);
  });

  it('returns 400 when component param is missing', async () => {
    const { GET } = await load();
    const res = await GET(makeEvent('') as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing required "component" parameter');
  });

  it('returns 500 when no simulator devices exist', async () => {
    state.devices = [];
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/No iOS Simulator devices available/);
  });

  it('returns 400 when requested device name is unknown', async () => {
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button&device=Nope+Phone') as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Unknown iOS Simulator device "Nope Phone"');
  });

  it('returns 200 with JSON response on happy path (no debug proxy)', async () => {
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
    const body = await res.json();
    expect(body.source).toBe('ios-simulator');
    expect(body.browser).toBe('safari');
    expect(body.device).toBe('iPhone 17 Pro');
    expect(body.deviceOS).toBe('iOS 18.0');
    expect(body.debugProxyAvailable).toBe(false);
    expect(typeof body.image).toBe('string');
    expect(body.image.length).toBeGreaterThan(0);
  });

  it('passes through s, variant, option, device query params', async () => {
    const { GET } = await load();
    const res = await GET(
      makeEvent(
        '?component=button&device=iPad+Pro+13-inch&s=eyJ4IjoxfQ%3D%3D&variant=primary&option=x',
      ) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.device).toBe('iPad Pro 13-inch');
  });

  it('includes consoleLogs + debugProxyAvailable=true when proxy is installed', async () => {
    state.debugProxyInstalled = true;
    state.inspectablePages = [
      { url: 'http://localhost/isolate/button', webSocketDebuggerUrl: 'ws://x' },
      { url: 'http://other', webSocketDebuggerUrl: 'ws://y' },
    ];
    state.consoleLogs = [{ level: 'info', text: 'hi', source: 'console-api' }];
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.debugProxyAvailable).toBe(true);
    expect(body.consoleLogs).toEqual([{ level: 'info', text: 'hi', source: 'console-api' }]);
  });

  it('debug proxy installed but no matching isolate page → no console logs fetched', async () => {
    state.debugProxyInstalled = true;
    state.inspectablePages = [{ url: 'http://host/other', webSocketDebuggerUrl: 'ws://z' }];
    state.consoleLogs = [{ level: 'error', text: 'would-not-surface', source: 'console-api' }];
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect(body.debugProxyAvailable).toBe(true);
    expect(body.consoleLogs).toEqual([]);
  });

  it('includes safeAreaInsets when the lookup returns them', async () => {
    state.safeAreaInsets = { top: 47, bottom: 34, left: 0, right: 0 };
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect(body.safeAreaInsets).toEqual({ top: 47, bottom: 34, left: 0, right: 0 });
  });

  it('omits safeAreaInsets when the lookup returns null', async () => {
    state.safeAreaInsets = null;
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect('safeAreaInsets' in body).toBe(false);
  });

  it('includes deviceFrame when a matching frame exists', async () => {
    state.deviceFrame = { framePath: 'iphone-17-pro', screenRegion: { x: 0, y: 0 } };
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    const body = await res.json();
    expect(body.deviceFrame).toEqual({
      frameId: 'iphone-17-pro',
      screenRegion: { x: 0, y: 0 },
    });
  });

  it('returns 500 with error message when acquireSimulator throws', async () => {
    state.acquireThrows = new Error('pool exhausted');
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('pool exhausted');
  });

  it('returns fallback error message when a non-Error is thrown', async () => {
    state.acquireThrows = 'string-error' as unknown as Error;
    const { GET } = await load();
    const res = await GET(makeEvent('?component=button') as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('iOS Simulator screenshot failed');
  });
});
