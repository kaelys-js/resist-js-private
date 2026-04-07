import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Num, Bool, Name, MillisecondTimestamp } from '@/schemas/common';
import { createDevtoolsAPI, getDevtoolsKey, type DevtoolsAPI } from './devtools-api.svelte';
import type { DevtoolsConfig, AppStoreContract, DebugStoreContract } from './types';
import type { PanelMetric } from '@/utils/web-vitals/vitals-panel-store.svelte';
import type { ConnectionSnapshot } from '@/utils/web-vitals/connection.svelte';

// ── Perf module mocks ────────────────────────────────────────────────────────

// cast safe: test fixture literals to branded types
const mockPanelMetrics: PanelMetric[] = [
  {
    name: 'LCP' as Name,
    value: 1200,
    rating: 'good',
    timestamp: 1000 as unknown as MillisecondTimestamp,
    diagnostics: null,
  },
  {
    name: 'CLS' as Name,
    value: 0.05,
    rating: 'good',
    timestamp: 1001 as unknown as MillisecondTimestamp,
    diagnostics: null,
  },
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

const {
  mockGetVitalsPanelMetrics,
  mockGetBeaconStatus,
  mockGetConnectionSnapshot,
  mockCreateWatcher,
  mockFormatThresholds,
} = vi.hoisted(() => ({
  mockGetVitalsPanelMetrics: vi.fn(),
  mockGetBeaconStatus: vi.fn(),
  mockGetConnectionSnapshot: vi.fn(),
  mockCreateWatcher: vi.fn(),
  mockFormatThresholds: vi.fn(),
}));

vi.mock('@/utils/web-vitals/vitals-panel-store.svelte', () => ({
  getVitalsPanelMetrics: mockGetVitalsPanelMetrics,
  reportVitalToPanel: vi.fn(),
  resetPanelMetrics: vi.fn(),
}));

vi.mock('@/utils/web-vitals/vitals-beacon', () => ({
  getBeaconStatus: mockGetBeaconStatus,
  queueVital: vi.fn(),
  flushVitals: vi.fn(),
  setupVitalsBeacon: vi.fn(),
  setDeviceInfo: vi.fn(),
  resetBeacon: vi.fn(),
}));

vi.mock('@/utils/web-vitals/connection.svelte', () => ({
  getConnectionSnapshot: mockGetConnectionSnapshot,
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

vi.mock('./state-logger.svelte', () => ({
  createWatcher: mockCreateWatcher,
}));

vi.mock('@/utils/web-vitals/vitals-diagnostics', () => ({
  formatThresholds: mockFormatThresholds,
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
  mockGetVitalsPanelMetrics
    .mockClear()
    .mockImplementation(() => ({ ok: true, data: mockPanelMetrics, error: null }));
  mockGetBeaconStatus
    .mockClear()
    .mockImplementation(() => ({ ok: true, data: mockBeaconStatus, error: null }));
  mockGetConnectionSnapshot
    .mockClear()
    .mockImplementation(() => ({ ok: true, data: mockConnectionSnapshot, error: null }));
  mockCreateWatcher.mockClear().mockImplementation(() => vi.fn());
  mockFormatThresholds.mockClear().mockImplementation(() => 'good: ≤100, poor: >300');
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

  it('perf.logVitals() calls console.log', () => {
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.perf.logVitals();
    expect(spy).toHaveBeenCalled();
    api.destroy();
  });

  it('perf.logDevice() calls console.log', () => {
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.perf.logDevice();
    expect(spy).toHaveBeenCalled();
    api.destroy();
  });
});

describe('devtools.set edge cases', () => {
  it('returns early for path without section.key format', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    // Should not throw for invalid path
    devtools.set('noDotsHere', 'value');
    expect(appStore.setTheme).not.toHaveBeenCalled();
    api.destroy();
  });

  it('silently ignores when app store has no setter for key', () => {
    // Create store WITHOUT setTheme
    const sparseStore = {
      ...appStore,
      setTheme: undefined,
    };
    const api = createDevtoolsAPI(sparseStore as never, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    // Should not throw — typeof undefined !== 'function' guard
    devtools.set('app.theme', 'midnight');
    api.destroy();
  });
});

describe('devtools.help', () => {
  it('prints help text to console', () => {
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.help();
    expect(spy).toHaveBeenCalled();
    api.destroy();
  });
});

// ── Additional coverage tests ────────────────────────────────────────────────

describe('devtools mutation methods (setMode, setLocale, setSidebarOpen)', () => {
  it('setMode calls appStore.setMode', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setMode('dark');
    expect(appStore.setMode).toHaveBeenCalledWith('dark');
    api.destroy();
  });

  it('setLocale calls appStore.setLocale', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setLocale('ja');
    expect(appStore.setLocale).toHaveBeenCalledWith('ja');
    api.destroy();
  });

  it('setSidebarOpen calls appStore.setSidebarOpen', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setSidebarOpen(false);
    expect(appStore.setSidebarOpen).toHaveBeenCalledWith(false);
    api.destroy();
  });

  it('setMode is no-op when setter is missing (typeof guard)', () => {
    const store = { ...appStore, setMode: undefined };
    const api = createDevtoolsAPI(store as never, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setMode('dark');
    api.destroy();
  });

  it('setLocale is no-op when setter is missing', () => {
    const store = { ...appStore, setLocale: undefined };
    const api = createDevtoolsAPI(store as never, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setLocale('ja');
    api.destroy();
  });

  it('setSidebarOpen is no-op when setter is missing', () => {
    const store = { ...appStore, setSidebarOpen: undefined };
    const api = createDevtoolsAPI(store as never, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.setSidebarOpen(false);
    api.destroy();
  });
});

describe('devtools.set additional branches', () => {
  it('set debug.enabled calls debugStore.setEnabled', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.set('debug.enabled', true);
    expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
    api.destroy();
  });

  it('set features.unknownFlag is no-op (not in featureKeys)', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.set('features.unknownFlag', true);
    expect(appStore.setFeature).not.toHaveBeenCalled();
    api.destroy();
  });

  it('set unknownSection.key is no-op (unknown section)', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.set('unknownSection.key', 'value');
    expect(appStore.setTheme).not.toHaveBeenCalled();
    expect(debugStore.setEnabled).not.toHaveBeenCalled();
    api.destroy();
  });

  it('set app.unknownKey is no-op (key not in appSetterMap)', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.set('app.unknownKey', 'value');
    api.destroy();
  });
});

describe('devtools.logState', () => {
  it('logs app, features, and debug state', () => {
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.logState();
    const allOutput: Str = spy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toContain('State');
    expect(allOutput).toContain('app.');
    expect(allOutput).toContain('features.');
    expect(allOutput).toContain('debug.');
    api.destroy();
  });
});

describe('devtools.logFeatures', () => {
  it('calls console.table with features', () => {
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.logFeatures();
    expect(tableSpy).toHaveBeenCalledOnce();
    tableSpy.mockRestore();
    api.destroy();
  });
});

describe('devtools.registerWatcher / unregisterWatcher', () => {
  it('registerWatcher calls createWatcher', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    const getter = () => ({ count: 1 });
    devtools.registerWatcher('test', getter);
    expect(mockCreateWatcher).toHaveBeenCalledWith('test', getter, debugStore, 'TestAppStore');
    api.destroy();
  });

  it('registerWatcher replaces existing watcher (calls old cleanup)', () => {
    const oldCleanup = vi.fn();
    mockCreateWatcher.mockReturnValueOnce(oldCleanup);
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.registerWatcher('test', () => ({}));
    devtools.registerWatcher('test', () => ({}));
    expect(oldCleanup).toHaveBeenCalledOnce();
    api.destroy();
  });

  it('unregisterWatcher calls cleanup and removes', () => {
    const cleanup = vi.fn();
    mockCreateWatcher.mockReturnValueOnce(cleanup);
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.registerWatcher('test', () => ({}));
    devtools.unregisterWatcher('test');
    expect(cleanup).toHaveBeenCalledOnce();
    api.destroy();
  });

  it('unregisterWatcher is no-op for nonexistent name', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.unregisterWatcher('nonexistent');
    api.destroy();
  });
});

describe('devtools.toString / Symbol.toStringTag', () => {
  it('toString returns formatted string with app name', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    const str: Str = devtools.toString();
    expect(str).toContain('TestApp');
    expect(str).toContain('Devtools');
    api.destroy();
  });

  it('Symbol.toStringTag returns app name + Devtools', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    expect(devtools[Symbol.toStringTag]).toBe('TestApp Devtools');
    api.destroy();
  });
});

describe('devtools.appName getter', () => {
  it('returns appName from appStore', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    expect(devtools.appName).toBe('TestApp');
    api.destroy();
  });

  it('falls back to config.appName when appStore.app.appName is undefined', () => {
    appStore.app.appName = undefined as unknown as Str;
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    expect(devtools.appName).toBe('TestApp');
    api.destroy();
  });
});

describe('devtools.buildInfo getter', () => {
  it('returns build info (non-null in test env)', () => {
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    expect(devtools.buildInfo).not.toBeNull();
    api.destroy();
  });
});

describe('devtools.resetToDefaults / resetAllToDefaults', () => {
  it('resetToDefaults calls setters with schema defaults', () => {
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.resetToDefaults();
    const allOutput: Str = spy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toContain('[Reset]');
    api.destroy();
  });

  it('resetAllToDefaults resets preferences, features, and logLevel', () => {
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.resetAllToDefaults();
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('info');
    expect(appStore.setFeature).toHaveBeenCalled();
    const allOutput: Str = spy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toContain('All state reset');
    api.destroy();
  });
});

describe('devtools.copyDebugUrl', () => {
  it('copies URL to clipboard on success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    await devtools.copyDebugUrl();
    expect(writeText).toHaveBeenCalledOnce();
    const allOutput: Str = spy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toContain('[Copied]');
    api.destroy();
  });

  it('falls back to console.log on clipboard failure', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    await devtools.copyDebugUrl();
    const allOutput: Str = spy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toContain('[Debug URL]');
    api.destroy();
  });
});

describe('devtools.login / logout', () => {
  it('login calls config.goto without auth param', () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/app?ta.auth=false'),
      writable: true,
      configurable: true,
    });
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.login();
    expect(config.goto).toHaveBeenCalledOnce();
    const url: Str = (config.goto as ReturnType<typeof vi.fn>).mock.calls[0][0] as Str;
    expect(url).not.toContain('ta.auth');
    api.destroy();
  });

  it('logout calls config.goto with auth=false param', () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/app'),
      writable: true,
      configurable: true,
    });
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.logout();
    expect(config.goto).toHaveBeenCalledOnce();
    const url: Str = (config.goto as ReturnType<typeof vi.fn>).mock.calls[0][0] as Str;
    expect(url).toContain('ta.auth=false');
    api.destroy();
  });
});

describe('devtools.perf error paths', () => {
  it('perf.vitals() returns empty array on error', () => {
    mockGetVitalsPanelMetrics.mockReturnValueOnce({ ok: false, error: { code: 'ERR' } });
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    expect(devtools.perf.vitals()).toEqual([]);
    api.destroy();
  });

  it('perf.beacon() returns fallback on error', () => {
    mockGetBeaconStatus.mockReturnValueOnce({ ok: false, error: { code: 'ERR' } });
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    const beacon = devtools.perf.beacon();
    expect(beacon.queued).toBe(0);
    expect(beacon.sessionId).toBe('');
    api.destroy();
  });

  it('perf.device() returns fallback on error', () => {
    mockGetConnectionSnapshot.mockReturnValueOnce({ ok: false, error: { code: 'ERR' } });
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    const device = devtools.perf.device();
    expect(device.quality).toBe('unknown');
    api.destroy();
  });

  it('perf.logDevice() returns early on error (no console output)', () => {
    mockGetConnectionSnapshot.mockReturnValueOnce({ ok: false, error: { code: 'ERR' } });
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.perf.logDevice();
    // Should NOT have logged device info (early return on error)
    const deviceOutput = spy.mock.calls.filter((c: unknown[]) => String(c[0]).includes('Device'));
    expect(deviceOutput).toHaveLength(0);
    api.destroy();
  });
});

describe('devtools.perf.logVitals detailed branches', () => {
  it('logs "No Web Vitals" when metrics are empty', () => {
    mockGetVitalsPanelMetrics.mockReturnValueOnce({ ok: true, data: [] });
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.perf.logVitals();
    const allOutput: Str = spy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toContain('No Web Vitals');
    api.destroy();
  });

  it('logs metrics with diagnostics and findings', () => {
    const metricsWithDiag: PanelMetric[] = [
      {
        name: 'LCP' as Name,
        value: 3000,
        rating: 'needsImprovement',
        timestamp: 1000 as unknown as MillisecondTimestamp,
        diagnostics: {
          thresholds: { good: 2500, poor: 4000, unit: 'ms' as const },
          findings: [
            { label: 'LCP Element', value: '<img.hero>' },
            { value: 'Slow network detected' },
          ],
        },
      },
      {
        name: 'CLS' as Name,
        value: 0.3,
        rating: 'poor',
        timestamp: 1001 as unknown as MillisecondTimestamp,
        diagnostics: {
          thresholds: { good: 0.1, poor: 0.25, unit: '' as const },
          findings: [{ label: 'Shift source', value: 'image resize' }],
        },
      },
    ];
    mockGetVitalsPanelMetrics.mockReturnValueOnce({ ok: true, data: metricsWithDiag });
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.perf.logVitals();
    const allOutput: Str = spy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(allOutput).toContain('LCP');
    expect(allOutput).toContain('CLS');
    expect(allOutput).toContain('Thresholds');
    expect(allOutput).toContain('LCP Element');
    expect(allOutput).toContain('Slow network detected');
    expect(mockFormatThresholds).toHaveBeenCalled();
    api.destroy();
  });

  it('logs "No Web Vitals" on vitals error result', () => {
    mockGetVitalsPanelMetrics.mockReturnValueOnce({ ok: false, error: { code: 'ERR' } });
    const spy = vi.spyOn(console, 'log');
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.perf.logVitals();
    const allOutput: Str = spy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(allOutput).toContain('No Web Vitals');
    api.destroy();
  });
});

describe('devtools.destroy with active watchers', () => {
  it('cleans up all registered watchers on destroy', () => {
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();
    mockCreateWatcher.mockReturnValueOnce(cleanup1).mockReturnValueOnce(cleanup2);
    const api = createDevtoolsAPI(appStore, debugStore, config);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as DevtoolsAPI;
    devtools.registerWatcher('w1', () => ({}));
    devtools.registerWatcher('w2', () => ({}));
    api.destroy();
    expect(cleanup1).toHaveBeenCalledOnce();
    expect(cleanup2).toHaveBeenCalledOnce();
  });
});
