import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str, Num, Bool } from '@/schemas/common';
import { createDevtoolsAPI, DEVTOOLS_KEY, type EditorDevtools } from './devtools-api.svelte';
import { APP_NAME } from '$lib/config/app-meta';
import type { PanelMetric } from '$lib/perf/vitals-panel-store.svelte';
import type { ConnectionSnapshot } from '$lib/perf/connection.svelte';

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

vi.mock('$lib/perf/vitals-panel-store.svelte', () => ({
  getVitalsPanelMetrics: (): PanelMetric[] => mockPanelMetrics,
  reportVitalToPanel: vi.fn(),
  resetPanelMetrics: vi.fn(),
}));

vi.mock('$lib/perf/vitals-beacon', () => ({
  getBeaconStatus: () => mockBeaconStatus,
  queueVital: vi.fn(),
  flushVitals: vi.fn(),
  setupVitalsBeacon: vi.fn(),
  setDeviceInfo: vi.fn(),
  resetBeacon: vi.fn(),
}));

vi.mock('$lib/perf/connection.svelte', () => ({
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

const okVoid = () => ({ ok: true as const, data: undefined, error: null });

const createMockEditorStore = () => ({
  app: {
    appName: APP_NAME,
    theme: '' as
      | ''
      | 'midnight'
      | 'warm'
      | 'forest'
      | 'ocean'
      | 'rose'
      | 'lavender'
      | 'sunset'
      | 'slate'
      | 'copper'
      | 'aurora'
      | 'amethyst',
    mode: 'system' as 'light' | 'dark' | 'system',
    locale: 'en' as 'en' | 'ja' | 'zh' | 'ko' | 'fr' | 'de' | 'es',
    sidebarOpen: true,
    userName: 'User',
    userEmail: '',
    userAvatar: '',
    subscriptionPlan: 'pro' as 'free' | 'starter' | 'pro' | 'enterprise',
    mockDataDelay: 0,
  },
  features: {
    settings: true,
    themeSelection: true,
    languageSelection: true,
    modeToggle: true,
    sidebar: true,
    sidebarHome: true,
    sceneList: true,
    resizableSidebar: true,
    breadcrumb: true,
    sidebarToggle: true,
    sidebarHelp: true,
    projectDropdown: true,
    projectDropdownSettings: true,
    projectDropdownIcon: true,
    appIconInSidebar: true,
    appNameInSidebar: true,
    headerUserDropdown: true,
    headerUserAvatar: true,
    headerUserAccount: true,
    headerUserSubscription: true,
    headerUserNotifications: true,
    headerUserShortcuts: true,
    headerUserSettings: true,
    headerUserWhatsNew: true,
    headerUserLogout: true,
    authGatedUi: true,
    emptyScenePlaceholder: true,
    skeletonLoading: true,
  },
  setAppName: vi.fn(okVoid),
  setTheme: vi.fn(okVoid),
  setMode: vi.fn(okVoid),
  setLocale: vi.fn(okVoid),
  setSidebarOpen: vi.fn(okVoid),
  setUserName: vi.fn(okVoid),
  setUserEmail: vi.fn(okVoid),
  setUserAvatar: vi.fn(okVoid),
  setSubscriptionPlan: vi.fn(okVoid),
  setMockDataDelay: vi.fn(okVoid),
  setFeature: vi.fn(okVoid),
  save: vi.fn(okVoid),
  load: vi.fn(okVoid),
});

const createMockDebugStore = () => ({
  debug: { enabled: true, logLevel: 'info' as const },
  urlOverrides: {},
  setEnabled: vi.fn(okVoid),
  setLogLevel: vi.fn(okVoid),
});

let editorStore: ReturnType<typeof createMockEditorStore>;
let debugStore: ReturnType<typeof createMockDebugStore>;

beforeEach(() => {
  editorStore = createMockEditorStore();
  debugStore = createMockDebugStore();
  // Clean up window global
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

afterEach(() => {
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

describe('DEVTOOLS_KEY', () => {
  it('derives from APP_NAME', () => {
    expect(DEVTOOLS_KEY).toBe(`__${APP_NAME.toUpperCase()}_DEVTOOLS__`);
  });
});

describe('createDevtoolsAPI', () => {
  it('registers window global', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeDefined();
    api.destroy();
  });

  it('destroy removes window global', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    api.destroy();
    expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeUndefined();
  });
});

describe('devtools.state', () => {
  it('returns current app state', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    expect(devtools.state.app.theme).toBe('');
    expect(devtools.state.app.locale).toBe('en');
    api.destroy();
  });

  it('returns current features state', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    expect(devtools.state.features.settings).toBe(true);
    api.destroy();
  });

  it('returns current debug state', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    expect(devtools.state.debug.enabled).toBe(true);
    api.destroy();
  });
});

describe('devtools convenience methods', () => {
  it('setTheme calls editor store', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.setTheme('midnight');
    expect(editorStore.setTheme).toHaveBeenCalledWith('midnight');
    api.destroy();
  });

  it('setMode calls editor store', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.setMode('dark');
    expect(editorStore.setMode).toHaveBeenCalledWith('dark');
    api.destroy();
  });

  it('setLocale calls editor store', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.setLocale('ja');
    expect(editorStore.setLocale).toHaveBeenCalledWith('ja');
    api.destroy();
  });

  it('setSidebarOpen calls editor store', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.setSidebarOpen(false);
    expect(editorStore.setSidebarOpen).toHaveBeenCalledWith(false);
    api.destroy();
  });

  it('setFeature calls editor store', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.setFeature('settings', false);
    expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);
    api.destroy();
  });

  it('setLogLevel calls debug store', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.setLogLevel('trace');
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');
    api.destroy();
  });

  it('enable calls debug store', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.enable();
    expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
    api.destroy();
  });

  it('disable calls debug store', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.disable();
    expect(debugStore.setEnabled).toHaveBeenCalledWith(false);
    api.destroy();
  });
});

describe('devtools.set (generic setter)', () => {
  it('sets app.theme via path', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.set('app.theme', 'ocean');
    expect(editorStore.setTheme).toHaveBeenCalledWith('ocean');
    api.destroy();
  });

  it('sets features.sidebar via path', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.set('features.sidebar', false);
    expect(editorStore.setFeature).toHaveBeenCalledWith('sidebar', false);
    api.destroy();
  });

  it('sets debug.logLevel via path', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.set('debug.logLevel', 'error');
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('error');
    api.destroy();
  });

  it('sets debug.enabled via path', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.set('debug.enabled', false);
    expect(debugStore.setEnabled).toHaveBeenCalledWith(false);
    api.destroy();
  });
});

describe('devtools.register / unregister', () => {
  it('registers a custom namespace', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.register('test', { ping: () => 'pong' });
    expect((devtools as Record<Str, unknown>).test).toBeDefined();
    const ext = (devtools as Record<Str, unknown>).test as Record<Str, () => Str>;
    expect(ext.ping()).toBe('pong');
    api.destroy();
  });

  it('unregisters a custom namespace', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.register('test', { ping: () => 'pong' });
    devtools.unregister('test');
    expect((devtools as Record<Str, unknown>).test).toBeUndefined();
    api.destroy();
  });
});

describe('devtools.logState / logFeatures', () => {
  it('logState calls console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.logState();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    api.destroy();
  });

  it('logFeatures calls console.table', () => {
    const spy = vi.spyOn(console, 'table').mockImplementation(() => {});
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.logFeatures();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    api.destroy();
  });
});

describe('devtools.registerWatcher / unregisterWatcher', () => {
  it('registerWatcher creates a watcher', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    let callCount = 0;
    devtools.registerWatcher('test', () => {
      callCount++;
      return { value: callCount };
    });
    // Getter is called once during initial snapshot capture
    expect(callCount).toBeGreaterThanOrEqual(1);
    api.destroy();
  });

  it('unregisterWatcher removes a watcher', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.registerWatcher('test', () => ({ value: 1 }));
    devtools.unregisterWatcher('test');
    // Should not throw after unregistering
    api.destroy();
  });

  it('unregisterWatcher is safe for unknown names', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    // Should not throw
    devtools.unregisterWatcher('nonexistent');
    api.destroy();
  });

  it('registerWatcher replaces existing watcher with same name', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.registerWatcher('test', () => ({ value: 1 }));
    // Re-register with same name — should replace, not duplicate
    devtools.registerWatcher('test', () => ({ value: 2 }));
    api.destroy();
  });

  it('destroy cleans up all registered watchers', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.registerWatcher('w1', () => ({ a: 1 }));
    devtools.registerWatcher('w2', () => ({ b: 2 }));
    // destroy should clean up both watchers without errors
    api.destroy();
  });
});

describe('devtools meta', () => {
  it('exposes appName', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    expect(devtools.appName).toBe(APP_NAME);
    api.destroy();
  });

  it('exposes buildInfo or null', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    // buildInfo may be null in test environment where Vite define constants are missing
    const info = devtools.buildInfo;
    expect(info === null || typeof info === 'object').toBe(true);
    api.destroy();
  });
});

describe('devtools.perf namespace', () => {
  it('exposes perf as a property', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    expect(devtools.perf).toBeDefined();
    expect(typeof devtools.perf).toBe('object');
    api.destroy();
  });

  it('perf.vitals() returns current panel metrics', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    const vitals: PanelMetric[] = devtools.perf.vitals();
    expect(vitals).toHaveLength(2);
    expect(vitals[0]?.name).toBe('LCP');
    expect(vitals[1]?.name).toBe('CLS');
    api.destroy();
  });

  it('perf.beacon() returns beacon status', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    const beacon = devtools.perf.beacon();
    expect(beacon.queued).toBe(2);
    expect(beacon.sessionId).toBe('test-session-id');
    expect(beacon.lastFlushAt).toBe('2026-03-06T12:00:00Z');
    expect(beacon.maxQueueSize).toBe(10);
    expect(beacon.queuedItems).toHaveLength(2);
    api.destroy();
  });

  it('perf.device() returns connection snapshot', () => {
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    const device: ConnectionSnapshot = devtools.perf.device();
    expect(device.effectiveType).toBe('4g');
    expect(device.quality).toBe('fast');
    expect(device.deviceMemory).toBe(8);
    expect(device.hardwareConcurrency).toBe(8);
    expect(device.saveData).toBe(false);
    expect(device.isLowEndDevice).toBe(false);
    api.destroy();
  });

  it('perf.logVitals() prints to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.perf.logVitals();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    api.destroy();
  });

  it('perf.logDevice() prints to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
    devtools.perf.logDevice();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    api.destroy();
  });
});
