import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Num, Bool } from '@/schemas/common';
import { createDevtoolsAPI, getDevtoolsKey, type DevtoolsAPI } from './devtools-api.svelte';
import type { DevtoolsConfig, AppStoreContract, DebugStoreContract } from './types';
import type { PanelMetric } from '@/utils/web-vitals/vitals-panel-store.svelte';
import type { ConnectionSnapshot } from '@/utils/web-vitals/connection.svelte';

// ── Perf module mocks ────────────────────────────────────────────────────────

const mockPanelMetrics: PanelMetric[] = [
  { name: 'LCP', value: 1200, rating: 'good', timestamp: 1000 },
  { name: 'CLS', value: 0.05, rating: 'good', timestamp: 1001 },
];

const mockBeaconStatus = {
  queued: 2 as Num,
  queuedItems: [
    { name: 'LCP' as Str, value: 1200 as Num, rating: 'good' as Str },
    { name: 'CLS' as Str, value: 0.05 as Num, rating: 'good' as Str },
  ],
  lastFlushAt: '2026-03-06T12:00:00Z' as Str | null,
  sessionId: 'test-session-id' as Str,
  maxQueueSize: 10 as Num,
};

const mockConnectionSnapshot: ConnectionSnapshot = {
  effectiveType: '4g',
  saveData: false,
  rtt: 50,
  downlink: 10,
  quality: 'fast',
  isLowEndDevice: false,
  isLowEndExperience: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
};

vi.mock('@/utils/web-vitals/vitals-panel-store.svelte', () => ({
  getVitalsPanelMetrics: (): PanelMetric[] => mockPanelMetrics,
  reportVitalToPanel: vi.fn(),
  resetPanelMetrics: vi.fn(),
}));

vi.mock('@/utils/web-vitals/vitals-beacon', () => ({
  getBeaconStatus: () => mockBeaconStatus,
  queueVital: vi.fn(),
  flushVitals: vi.fn(),
  setupVitalsBeacon: vi.fn(),
  setDeviceInfo: vi.fn(),
  resetBeacon: vi.fn(),
}));

vi.mock('@/utils/web-vitals/connection.svelte', () => ({
  getConnectionSnapshot: (): ConnectionSnapshot => mockConnectionSnapshot,
  getConnectionQuality: () => 'fast' as const,
  getEffectiveType: () => '4g',
  getSaveData: () => false as Bool,
  getRtt: () => 50 as Num,
  getDownlink: () => 10 as Num,
  getIsLowEndDevice: () => false as Bool,
  getIsLowEndExperience: () => false as Bool,
  getDeviceMemory: () => 8 as Num,
  getHardwareConcurrency: () => 8 as Num,
  initConnection: vi.fn(),
  updateFromNavigatorInfo: vi.fn(),
  resetConnection: vi.fn(),
}));

const APP_NAME = 'TestApp';
const DEVTOOLS_KEY: Str = getDevtoolsKey(APP_NAME);

const okVoid = () => ({ ok: true as const, data: undefined, error: null });

const TEST_APP_SCHEMA = {
  appName: { type: 'optional', default: APP_NAME },
  theme: { type: 'optional', default: '' },
  mode: { type: 'optional', default: 'system' },
  locale: { type: 'optional', default: 'en' },
  sidebarOpen: { type: 'optional', default: true },
};

const TEST_FLAGS_SCHEMA = {
  settings: { type: 'optional', default: true },
  sidebar: { type: 'optional', default: true },
};

const TEST_DEBUG_SCHEMA = {
  enabled: { type: 'optional', default: false },
  logLevel: { type: 'optional', default: 'info' },
};

const makeConfig = (): DevtoolsConfig => ({
  appName: APP_NAME,
  urlParamPrefix: 'ta.',
  appPreferencesSchema: TEST_APP_SCHEMA,
  featureFlagsSchema: TEST_FLAGS_SCHEMA,
  debugStateSchema: TEST_DEBUG_SCHEMA,
  goto: vi.fn(async () => {}),
  isValidAppKey: (key: Str) => key in TEST_APP_SCHEMA,
  isValidFeatureFlag: (key: Str) => key in TEST_FLAGS_SCHEMA,
});

const createMockAppStore = (): AppStoreContract & Record<Str, unknown> => ({
  app: {
    appName: APP_NAME,
    theme: '',
    mode: 'system',
    locale: 'en',
    sidebarOpen: true,
  },
  features: { settings: true, sidebar: true },
  setAppName: vi.fn(okVoid),
  setTheme: vi.fn(okVoid),
  setMode: vi.fn(okVoid),
  setLocale: vi.fn(okVoid),
  setSidebarOpen: vi.fn(okVoid),
  setFeature: vi.fn(okVoid),
});

const createMockDebugStore = (): DebugStoreContract => ({
  debug: { enabled: true, logLevel: 'info' },
  urlOverrides: {},
  setEnabled: vi.fn(okVoid),
  setLogLevel: vi.fn(okVoid),
});

let appStore: ReturnType<typeof createMockAppStore>;
let debugStore: ReturnType<typeof createMockDebugStore>;
let config: DevtoolsConfig;

beforeEach(() => {
  appStore = createMockAppStore();
  debugStore = createMockDebugStore();
  config = makeConfig();
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

afterEach(() => {
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

describe('getDevtoolsKey', () => {
  it('derives from app name', () => {
    expect(getDevtoolsKey('Storylyne')).toBe('__STORYLYNE_DEVTOOLS__');
    expect(getDevtoolsKey('TestApp')).toBe('__TESTAPP_DEVTOOLS__');
  });
});

describe('createDevtoolsAPI', () => {
  it('registers window global', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeDefined();
    api.destroy();
  });

  it('destroy removes window global', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    api.destroy();
    expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeUndefined();
  });
});

describe('devtools.state', () => {
  it('returns current app state', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    expect(devtools.state.app.theme).toBe('');
    expect(devtools.state.app.locale).toBe('en');
    api.destroy();
  });

  it('returns current features state', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    expect(devtools.state.features.settings).toBe(true);
    api.destroy();
  });

  it('returns current debug state', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    expect(devtools.state.debug.enabled).toBe(true);
    api.destroy();
  });
});

describe('devtools convenience methods', () => {
  it('setTheme calls app store', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setTheme('midnight');
    expect(appStore.setTheme).toHaveBeenCalledWith('midnight');
    api.destroy();
  });

  it('setFeature calls app store', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setFeature('settings', false);
    expect(appStore.setFeature).toHaveBeenCalledWith('settings', false);
    api.destroy();
  });

  it('setLogLevel calls debug store', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setLogLevel('trace');
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');
    api.destroy();
  });

  it('enable calls debug store', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.enable();
    expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
    api.destroy();
  });

  it('disable calls debug store', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.disable();
    expect(debugStore.setEnabled).toHaveBeenCalledWith(false);
    api.destroy();
  });
});

describe('devtools.set (generic setter)', () => {
  it('sets app.theme via path', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.set('app.theme', 'ocean');
    expect(appStore.setTheme).toHaveBeenCalledWith('ocean');
    api.destroy();
  });

  it('sets features.sidebar via path', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.set('features.sidebar', false);
    expect(appStore.setFeature).toHaveBeenCalledWith('sidebar', false);
    api.destroy();
  });

  it('sets debug.logLevel via path', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.set('debug.logLevel', 'error');
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('error');
    api.destroy();
  });
});

describe('devtools.register / unregister', () => {
  it('registers a custom namespace', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.register('test', { ping: () => 'pong' });
    expect((devtools as Record<Str, unknown>).test).toBeDefined();
    api.destroy();
  });

  it('unregisters a custom namespace', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.register('test', { ping: () => 'pong' });
    devtools.unregister('test');
    expect((devtools as Record<Str, unknown>).test).toBeUndefined();
    api.destroy();
  });
});

describe('devtools.perf namespace', () => {
  it('perf.vitals() returns current panel metrics', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    const vitals: PanelMetric[] = devtools.perf.vitals();
    expect(vitals).toHaveLength(2);
    expect(vitals[0]?.name).toBe('LCP');
    api.destroy();
  });

  it('perf.beacon() returns beacon status', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    const beacon = devtools.perf.beacon();
    expect(beacon.queued).toBe(2);
    expect(beacon.sessionId).toBe('test-session-id');
    api.destroy();
  });

  it('perf.device() returns connection snapshot', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    const device: ConnectionSnapshot = devtools.perf.device();
    expect(device.effectiveType).toBe('4g');
    expect(device.quality).toBe('fast');
    api.destroy();
  });
});
