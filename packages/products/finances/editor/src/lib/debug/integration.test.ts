/**
 * Debug system integration tests.
 *
 * Full-flow tests that verify the debug store, URL param parsing,
 * devtools API, orchestrator, welcome banner, state logging pipeline,
 * and unknown param detection work together correctly.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, Num, Str } from '@/schemas/common';
import {
  parseDebugParams,
  applyUrlOverrides,
  isValidAppKey,
  isValidFeatureFlag,
} from '$lib/utils/url-params';
import { createDevtoolsAPI, DEVTOOLS_KEY, type EditorDevtools } from './devtools-api.svelte';
import { activateDebugServices, syncDebugServices, type DebugServicesHandle } from './init.svelte';
import { diffSnapshot, formatTimestamp } from './console-styles';
import { shouldLog } from './state-logger.svelte';
import { APP_NAME, URL_PARAM_PREFIX } from '$lib/config/app-meta';

// Mock state-logger to avoid $effect in tests
vi.mock('./state-logger.svelte', async () => {
  const mod = await import('./state-logger.svelte');
  return {
    LOG_LEVEL_PRIORITY: mod.LOG_LEVEL_PRIORITY,
    shouldLog: mod.shouldLog,
    createStateLogger: vi.fn(() => ({ destroy: vi.fn() })),
    createWatcher: vi.fn(() => vi.fn()),
  };
});

/**
 * Typed accessor for the devtools window global (avoids hardcoded key).
 *
 * @returns The devtools instance or undefined if not registered
 */
const devtoolsGlobal = (): EditorDevtools | undefined =>
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools | undefined;

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
    showCharts: true,
    showInflation: true,
    showProjections: true,
    showNetPosition: true,
    settings: true,
    themeSelection: true,
    languageSelection: true,
    modeToggle: true,
    sidebar: true,
    resizableSidebar: true,
    breadcrumb: true,
    sidebarToggle: true,
    sidebarHelp: true,
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

const createMockDebugStore = (enabled: Bool, logLevel = 'info') => ({
  debug: {
    enabled,
    logLevel: logLevel as 'trace' | 'debug' | 'info' | 'warn' | 'error',
  },
  urlOverrides: {} as Record<Str, Str>,
  setEnabled: vi.fn(okVoid),
  setLogLevel: vi.fn(okVoid),
});

let editorStore: ReturnType<typeof createMockEditorStore>;
let consoleSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let groupSpy: ReturnType<typeof vi.spyOn>;
let tableSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  editorStore = createMockEditorStore();
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
  groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

// =============================================================================
// URL Parsing → Override Application
// =============================================================================

describe('URL parsing → override application flow', () => {
  it('parses and applies all override categories simultaneously', () => {
    const url = new URL(
      `http://localhost?${URL_PARAM_PREFIX}debug=true&${URL_PARAM_PREFIX}logLevel=trace&${URL_PARAM_PREFIX}theme=midnight&${URL_PARAM_PREFIX}mode=dark&${URL_PARAM_PREFIX}locale=ja&${URL_PARAM_PREFIX}sidebarOpen=false&${URL_PARAM_PREFIX}appName=MyRPG&${URL_PARAM_PREFIX}ff.settings=false&${URL_PARAM_PREFIX}ff.sidebar=false`,
    );
    const debugStore = createMockDebugStore(false);

    const parseResult = parseDebugParams(url);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    applyUrlOverrides(editorStore, debugStore, parseResult.data);

    // Debug params
    expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');

    // App preference params
    expect(editorStore.setTheme).toHaveBeenCalledWith('midnight');
    expect(editorStore.setMode).toHaveBeenCalledWith('dark');
    expect(editorStore.setLocale).toHaveBeenCalledWith('ja');
    expect(editorStore.setSidebarOpen).toHaveBeenCalledWith(false);
    expect(editorStore.setAppName).toHaveBeenCalledWith('MyRPG');

    // Feature flag params
    expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);
    expect(editorStore.setFeature).toHaveBeenCalledWith('sidebar', false);
  });

  it('warns about unknown params with list of valid options', () => {
    const debugStore = createMockDebugStore(false);
    applyUrlOverrides(editorStore, debugStore, { logLesel: 'debug' });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const warnMsg = warnSpy.mock.calls[0]?.[0] as string;
    expect(warnMsg).toContain(`Unknown URL override: ${URL_PARAM_PREFIX}logLesel=debug`);
    expect(warnMsg).toContain('valid:');
    expect(warnMsg).toContain('debug');
    expect(warnMsg).toContain('logLevel');
    expect(warnMsg).toContain('theme');
  });

  it('warns for each unknown param individually', () => {
    const debugStore = createMockDebugStore(false);
    applyUrlOverrides(editorStore, debugStore, { foo: 'bar', baz: 'qux' });

    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`${URL_PARAM_PREFIX}foo=bar`));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`${URL_PARAM_PREFIX}baz=qux`));
  });

  it('does not warn for any valid param', () => {
    const debugStore = createMockDebugStore(false);
    applyUrlOverrides(editorStore, debugStore, {
      debug: 'true',
      logLevel: 'debug',
      theme: 'midnight',
      mode: 'dark',
      locale: 'ja',
      sidebarOpen: 'false',
      appName: 'Test',
      'ff.settings': 'false',
      'ff.sidebar': 'true',
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('converts sidebarOpen string to boolean', () => {
    const debugStore = createMockDebugStore(false);
    applyUrlOverrides(editorStore, debugStore, { sidebarOpen: 'true' });
    expect(editorStore.setSidebarOpen).toHaveBeenCalledWith(true);

    applyUrlOverrides(editorStore, debugStore, { sidebarOpen: 'false' });
    expect(editorStore.setSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('converts feature flag strings to booleans', () => {
    const debugStore = createMockDebugStore(false);
    applyUrlOverrides(editorStore, debugStore, {
      'ff.settings': 'true',
      'ff.sidebar': 'false',
    });
    expect(editorStore.setFeature).toHaveBeenCalledWith('settings', true);
    expect(editorStore.setFeature).toHaveBeenCalledWith('sidebar', false);
  });

  it('ignores unknown feature flag keys without warning (ff.nonexistent)', () => {
    const debugStore = createMockDebugStore(false);
    const result = applyUrlOverrides(editorStore, debugStore, { 'ff.nonexistent': 'true' });
    expect(result.ok).toBe(true);
    expect(editorStore.setFeature).not.toHaveBeenCalled();
    // ff.* keys don't trigger the unknown key warning — they're handled by the ff.* branch
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns ok even when all params are unknown', () => {
    const debugStore = createMockDebugStore(false);
    const result = applyUrlOverrides(editorStore, debugStore, { x: '1', y: '2' });
    expect(result.ok).toBe(true);
  });

  it('handles empty overrides', () => {
    const debugStore = createMockDebugStore(false);
    const result = applyUrlOverrides(editorStore, debugStore, {});
    expect(result.ok).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('ignores non-wf URL params during parsing', () => {
    const url = new URL(
      `http://localhost?foo=bar&page=1&${URL_PARAM_PREFIX}debug=true&utm_source=test`,
    );
    const result = parseDebugParams(url);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.data)).toEqual(['debug']);
    }
  });
});

// =============================================================================
// Schema validation helpers
// =============================================================================

describe('schema-driven validation helpers', () => {
  it('isValidAppKey accepts all AppPreferences fields', () => {
    for (const key of [
      'appName',
      'theme',
      'mode',
      'locale',
      'sidebarOpen',
      'userName',
      'userEmail',
      'userAvatar',
    ]) {
      expect(isValidAppKey(key)).toBe(true);
    }
  });

  it('isValidAppKey rejects feature flag keys and unknowns', () => {
    expect(isValidAppKey('settings')).toBe(false);
    expect(isValidAppKey('logLevel')).toBe(false);
    expect(isValidAppKey('nonexistent')).toBe(false);
  });

  it('isValidFeatureFlag accepts all FeatureFlags fields', () => {
    for (const key of [
      'showCharts',
      'showInflation',
      'showProjections',
      'showNetPosition',
      'settings',
      'themeSelection',
      'languageSelection',
      'modeToggle',
      'sidebar',
      'resizableSidebar',
      'breadcrumb',
      'sidebarToggle',
      'sidebarHelp',
      'appIconInSidebar',
      'appNameInSidebar',
      'headerUserDropdown',
      'headerUserAvatar',
      'headerUserAccount',
      'headerUserSubscription',
      'headerUserNotifications',
      'headerUserShortcuts',
      'headerUserSettings',
      'headerUserWhatsNew',
      'headerUserLogout',
      'authGatedUi',
      'skeletonLoading',
    ]) {
      expect(isValidFeatureFlag(key)).toBe(true);
    }
  });

  it('isValidFeatureFlag rejects app keys and unknowns', () => {
    expect(isValidFeatureFlag('theme')).toBe(false);
    expect(isValidFeatureFlag('logLevel')).toBe(false);
    expect(isValidFeatureFlag('nonexistent')).toBe(false);
  });
});

// =============================================================================
// State Logger Pipeline (shouldLog + diffSnapshot)
// =============================================================================

describe('state logger pipeline', () => {
  describe('shouldLog', () => {
    it('allows debug messages at debug and trace levels', () => {
      expect(shouldLog('debug', 'debug')).toBe(true);
      expect(shouldLog('debug', 'trace')).toBe(true);
    });

    it('blocks debug messages at info, warn, error levels', () => {
      expect(shouldLog('debug', 'info')).toBe(false);
      expect(shouldLog('debug', 'warn')).toBe(false);
      expect(shouldLog('debug', 'error')).toBe(false);
    });

    it('error messages pass at every level', () => {
      for (const level of ['trace', 'debug', 'info', 'warn', 'error'] as const) {
        expect(shouldLog('error', level)).toBe(true);
      }
    });

    it('each level allows itself', () => {
      for (const level of ['trace', 'debug', 'info', 'warn', 'error'] as const) {
        expect(shouldLog(level, level)).toBe(true);
      }
    });
  });

  describe('diffSnapshot', () => {
    it('detects string value changes', () => {
      const diffs = diffSnapshot({ theme: 'warm' }, { theme: 'midnight' });
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({ key: 'theme', old: 'warm', new: 'midnight' });
    });

    it('detects boolean value changes', () => {
      const diffs = diffSnapshot({ sidebarOpen: true }, { sidebarOpen: false });
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({ key: 'sidebarOpen', old: true, new: false });
    });

    it('detects multiple simultaneous changes', () => {
      const diffs = diffSnapshot(
        { theme: '', mode: 'system', locale: 'en' },
        { theme: 'midnight', mode: 'dark', locale: 'ja' },
      );
      expect(diffs).toHaveLength(3);
    });

    it('ignores unchanged keys', () => {
      const diffs = diffSnapshot(
        { theme: 'midnight', mode: 'system' },
        { theme: 'midnight', mode: 'dark' },
      );
      expect(diffs).toHaveLength(1);
      expect(diffs[0]?.key).toBe('mode');
    });

    it('returns empty when snapshots are identical', () => {
      const state = { theme: 'midnight', mode: 'dark', sidebarOpen: true };
      expect(diffSnapshot(state, { ...state })).toHaveLength(0);
    });

    it('detects added keys', () => {
      const diffs = diffSnapshot({}, { newKey: 'value' });
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({ key: 'newKey', old: undefined, new: 'value' });
    });

    it('detects removed keys', () => {
      const diffs = diffSnapshot({ oldKey: 'value' }, {});
      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({ key: 'oldKey', old: 'value', new: undefined });
    });

    it('uses JSON comparison for nested objects', () => {
      const diffs = diffSnapshot({ nested: { a: 1, b: 2 } }, { nested: { a: 1, b: 2 } });
      expect(diffs).toHaveLength(0);
    });

    it('detects changes in nested objects', () => {
      const diffs = diffSnapshot({ nested: { a: 1 } }, { nested: { a: 2 } });
      expect(diffs).toHaveLength(1);
    });
  });

  describe('formatTimestamp', () => {
    it('returns HH:MM:SS.mmm format', () => {
      const ts = formatTimestamp();
      expect(ts).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });
  });
});

// =============================================================================
// Devtools API Integration
// =============================================================================

describe('devtools API state inspection', () => {
  it('state reflects current store values', () => {
    const debugStore = createMockDebugStore(true, 'trace');
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    expect(devtools.state.app.theme).toBe('');
    expect(devtools.state.app.locale).toBe('en');
    expect(devtools.state.app.mode).toBe('system');
    expect(devtools.state.app.sidebarOpen).toBe(true);
    expect(devtools.state.app.appName).toBe(APP_NAME);
    expect(devtools.state.features.settings).toBe(true);
    expect(devtools.state.features.resizableSidebar).toBe(true);
    expect(devtools.state.debug.enabled).toBe(true);
    expect(devtools.state.debug.logLevel).toBe('trace');

    api.destroy();
  });

  it('state returns fresh snapshots (not stale references)', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    const snap1 = devtools.state;
    const snap2 = devtools.state;
    expect(snap1).not.toBe(snap2); // Fresh object each time

    api.destroy();
  });

  it('appName and buildInfo are accessible', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    expect(devtools.appName).toBe(APP_NAME);
    // buildInfo may be null in test environment where Vite define constants are missing
    const info = devtools.buildInfo;
    expect(info === null || typeof info === 'object').toBe(true);

    api.destroy();
  });
});

describe('devtools API mutations', () => {
  it('setTheme calls editor store', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.setTheme('midnight');
    expect(editorStore.setTheme).toHaveBeenCalledWith('midnight');

    api.destroy();
  });

  it('setMode calls editor store', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.setMode('dark');
    expect(editorStore.setMode).toHaveBeenCalledWith('dark');

    api.destroy();
  });

  it('setLocale calls editor store', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.setLocale('ja');
    expect(editorStore.setLocale).toHaveBeenCalledWith('ja');

    api.destroy();
  });

  it('setSidebarOpen calls editor store', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.setSidebarOpen(false);
    expect(editorStore.setSidebarOpen).toHaveBeenCalledWith(false);

    api.destroy();
  });

  it('setFeature calls editor store', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.setFeature('settings', false);
    expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);

    api.destroy();
  });

  it('setLogLevel calls debug store', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.setLogLevel('trace');
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');

    api.destroy();
  });

  it('enable/disable calls debug store', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.disable();
    expect(debugStore.setEnabled).toHaveBeenCalledWith(false);

    devtools.enable();
    expect(debugStore.setEnabled).toHaveBeenCalledWith(true);

    api.destroy();
  });

  it('generic set works for all app paths', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.set('app.theme', 'ocean');
    expect(editorStore.setTheme).toHaveBeenCalledWith('ocean');

    devtools.set('app.mode', 'dark');
    expect(editorStore.setMode).toHaveBeenCalledWith('dark');

    devtools.set('app.locale', 'ko');
    expect(editorStore.setLocale).toHaveBeenCalledWith('ko');

    devtools.set('app.sidebarOpen', false);
    expect(editorStore.setSidebarOpen).toHaveBeenCalledWith(false);

    api.destroy();
  });

  it('generic set works for feature paths', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.set('features.sidebar', false);
    expect(editorStore.setFeature).toHaveBeenCalledWith('sidebar', false);

    devtools.set('features.settings', false);
    expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);

    api.destroy();
  });

  it('generic set works for debug paths', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.set('debug.logLevel', 'error');
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('error');

    devtools.set('debug.enabled', false);
    expect(debugStore.setEnabled).toHaveBeenCalledWith(false);

    api.destroy();
  });

  it('generic set ignores invalid paths silently', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    // No section
    devtools.set('', 'value');
    // Unknown section
    devtools.set('unknown.key', 'value');
    // No key
    devtools.set('app', 'value');

    // None should have been called
    expect(editorStore.setTheme).not.toHaveBeenCalled();
    expect(debugStore.setEnabled).not.toHaveBeenCalled();

    api.destroy();
  });

  it('generic set ignores unknown feature flag keys', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.set('features.nonexistent', true);
    expect(editorStore.setFeature).not.toHaveBeenCalled();

    api.destroy();
  });
});

describe('devtools API extension registry', () => {
  it('register makes namespace accessible', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()! as EditorDevtools & Record<Str, unknown>;

    devtools.register('test', { ping: () => 'pong' });

    const ext = devtools.test as Record<Str, () => Str>;
    expect(ext.ping()).toBe('pong');

    api.destroy();
  });

  it('unregister removes namespace', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()! as EditorDevtools & Record<Str, unknown>;

    devtools.register('test', { ping: () => 'pong' });
    devtools.unregister('test');

    expect(devtools.test).toBeUndefined();

    api.destroy();
  });

  it('multiple extensions can coexist', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()! as EditorDevtools & Record<Str, unknown>;

    devtools.register('audio', { volume: 0.8 });
    devtools.register('scene', { name: 'town' });

    expect((devtools.audio as Record<Str, Num>).volume).toBe(0.8);
    expect((devtools.scene as Record<Str, Str>).name).toBe('town');

    api.destroy();
  });
});

describe('devtools API console output', () => {
  it('logState prints all state sections', () => {
    const debugStore = createMockDebugStore(true, 'debug');
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.logState();

    // Should log editor store header, app.*, features.*, debug.*
    const { calls } = consoleSpy.mock;
    const hasAppTheme = calls.some(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('app.theme'),
    );
    const hasFeaturesSettings = calls.some(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('features.settings'),
    );
    const hasDebugEnabled = calls.some(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('debug.enabled'),
    );
    expect(hasAppTheme).toBe(true);
    expect(hasFeaturesSettings).toBe(true);
    expect(hasDebugEnabled).toBe(true);

    api.destroy();
  });

  it('logFeatures calls console.table with features object', () => {
    const debugStore = createMockDebugStore(true);
    const api = createDevtoolsAPI(editorStore, debugStore);
    const devtools = devtoolsGlobal()!;

    devtools.logFeatures();
    expect(tableSpy).toHaveBeenCalledWith(
      expect.objectContaining({ settings: true, sidebar: true }),
    );

    api.destroy();
  });
});

// =============================================================================
// Orchestrator Lifecycle
// =============================================================================

describe('orchestrator lifecycle', () => {
  it('activate registers devtools global, destroy removes it', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    expect(devtoolsGlobal()).toBeDefined();

    handle.destroy();

    expect(devtoolsGlobal()).toBeUndefined();
  });

  it('activate logs deactivation message on destroy', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    handle.destroy();

    const deactivateCall = consoleSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('Debug mode disabled'),
    );
    expect(deactivateCall).toBeDefined();
  });

  it('syncDebugServices full lifecycle: disabled → enabled → disabled → re-enabled', () => {
    const enabledStore = createMockDebugStore(true);
    const disabledStore = createMockDebugStore(false);

    // Start disabled
    let handle: DebugServicesHandle | null = syncDebugServices(editorStore, disabledStore, null);
    expect(handle).toBeNull();
    expect(devtoolsGlobal()).toBeUndefined();

    // Enable
    handle = syncDebugServices(editorStore, enabledStore, handle);
    expect(handle).not.toBeNull();
    expect(devtoolsGlobal()).toBeDefined();

    // Stay enabled (idempotent)
    const sameHandle = syncDebugServices(editorStore, enabledStore, handle);
    expect(sameHandle).toBe(handle);

    // Disable
    handle = syncDebugServices(editorStore, disabledStore, handle);
    expect(handle).toBeNull();
    expect(devtoolsGlobal()).toBeUndefined();

    // Stay disabled (idempotent)
    handle = syncDebugServices(editorStore, disabledStore, handle);
    expect(handle).toBeNull();

    // Re-enable
    handle = syncDebugServices(editorStore, enabledStore, handle);
    expect(handle).not.toBeNull();
    expect(devtoolsGlobal()).toBeDefined();

    handle?.destroy();
  });

  it('syncDebugServices is idempotent when already enabled', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const result = syncDebugServices(editorStore, debugStore, handle);
    expect(result).toBe(handle); // Same handle returned, not re-created

    handle.destroy();
  });

  it('syncDebugServices is idempotent when already disabled', () => {
    const debugStore = createMockDebugStore(false);
    const result = syncDebugServices(editorStore, debugStore, null);
    expect(result).toBeNull();
  });
});

// =============================================================================
// Welcome Banner
// =============================================================================

describe('welcome banner', () => {
  it('shows app name in header', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    // App name is passed as a %s substitution arg, not embedded in the format string
    const headerCall = consoleSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes(`[${APP_NAME}]`),
    );
    expect(headerCall).toBeDefined();
    handle.destroy();
  });

  it('shows Current State collapsible group', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const stateGroup = groupSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('Current State'),
    );
    expect(stateGroup).toBeDefined();
    handle.destroy();
  });

  it('shows Feature Flags collapsible group', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const flagsGroup = groupSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('Feature Flags'),
    );
    expect(flagsGroup).toBeDefined();
    handle.destroy();
  });

  it('shows Devtools API group with logKV entries', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const apiGroup = groupSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('Devtools API'),
    );
    expect(apiGroup).toBeDefined();

    // API help is rendered as key-value rows via console.log
    const stateRow = consoleSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('.state'),
    );
    expect(stateRow).toBeDefined();

    handle.destroy();
  });

  it('shows state logger tip when logLevel is info (default)', () => {
    const debugStore = createMockDebugStore(true, 'info');
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const tipCall = consoleSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('Tip'),
    );
    expect(tipCall).toBeDefined();
    // Should mention the current level and how to change it
    const tipMsg = tipCall?.join(' ') ?? '';
    expect(tipMsg).toContain('info');
    expect(tipMsg).toContain('setLogLevel');

    handle.destroy();
  });

  it('shows state logger active when logLevel is debug', () => {
    const debugStore = createMockDebugStore(true, 'debug');
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const loggerCall = consoleSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('Logger'),
    );
    expect(loggerCall).toBeDefined();

    handle.destroy();
  });

  it('shows state logger active when logLevel is trace', () => {
    const debugStore = createMockDebugStore(true, 'trace');
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const loggerCall = consoleSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('Logger'),
    );
    expect(loggerCall).toBeDefined();

    handle.destroy();
  });

  it('does NOT show URL Overrides section when no overrides', () => {
    const debugStore = createMockDebugStore(true);
    debugStore.urlOverrides = {};
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const overrideGroup = groupSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('URL Overrides'),
    );
    expect(overrideGroup).toBeUndefined();

    handle.destroy();
  });

  it('shows URL Overrides section with valid override count', () => {
    const debugStore = createMockDebugStore(true);
    debugStore.urlOverrides = { debug: 'true', theme: 'midnight' };
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const overrideGroup = groupSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('URL Overrides'),
    );
    expect(overrideGroup).toBeDefined();
    // Suffix is in the second %c segment (arg index 2)
    const groupText = String(overrideGroup?.[0]) + String(overrideGroup?.[2] ?? '');
    expect(groupText).toContain('2 applied');

    handle.destroy();
  });

  it('flags unknown overrides separately from valid ones', () => {
    const debugStore = createMockDebugStore(true);
    debugStore.urlOverrides = { debug: 'true', logLesel: 'debug', theme: 'midnight' };
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    // Valid overrides logged as a single block via console.log
    const validBlock = consoleSpy.mock.calls.find(
      (args: unknown[]) =>
        typeof args[0] === 'string' &&
        args[0].includes(`${URL_PARAM_PREFIX}debug`) &&
        args[0].includes(`${URL_PARAM_PREFIX}theme`),
    );
    expect(validBlock).toBeDefined();

    // Unknown override warned with console.warn
    const unknownWarns = warnSpy.mock.calls.filter(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes(`✗ ${URL_PARAM_PREFIX}`),
    );
    expect(unknownWarns.length).toBe(1); // logLesel
    expect(unknownWarns[0]?.[0]).toContain('logLesel');
    expect(unknownWarns[0]?.[0]).toContain('unknown');

    handle.destroy();
  });

  it('URL Overrides summary includes unknown count', () => {
    const debugStore = createMockDebugStore(true);
    debugStore.urlOverrides = { debug: 'true', typo: 'x' };
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    const overrideGroup = groupSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('URL Overrides'),
    );
    expect(overrideGroup).toBeDefined();
    const groupText = String(overrideGroup?.[0]) + String(overrideGroup?.[2] ?? '');
    expect(groupText).toContain('1 applied');
    expect(groupText).toContain('1 unknown');

    handle.destroy();
  });

  it('recognizes ff.* overrides as valid in banner', () => {
    const debugStore = createMockDebugStore(true);
    debugStore.urlOverrides = { 'ff.settings': 'false' };
    const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

    // Valid ff.* override logged as a block via console.log
    const validBlock = consoleSpy.mock.calls.find(
      (args: unknown[]) =>
        typeof args[0] === 'string' && args[0].includes(`${URL_PARAM_PREFIX}ff.settings`),
    );
    expect(validBlock).toBeDefined();
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('ff.settings'));

    handle.destroy();
  });
});

// =============================================================================
// Full E2E-like Flow
// =============================================================================

describe('full debug activation flow', () => {
  it('simulates complete URL → parse → apply → activate → devtools cycle', () => {
    // 1. Parse URL with debug params
    const url = new URL(
      `http://localhost?${URL_PARAM_PREFIX}debug=true&${URL_PARAM_PREFIX}logLevel=debug&${URL_PARAM_PREFIX}theme=midnight`,
    );
    const parseResult = parseDebugParams(url);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    // 2. Create stores
    const debugStore = createMockDebugStore(false);
    debugStore.urlOverrides = parseResult.data;

    // 3. Apply URL overrides
    applyUrlOverrides(editorStore, debugStore, parseResult.data);
    expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('debug');
    expect(editorStore.setTheme).toHaveBeenCalledWith('midnight');

    // 4. Simulate debug.enabled becoming true → sync activates services
    const enabledDebugStore = createMockDebugStore(true, 'debug');
    enabledDebugStore.urlOverrides = parseResult.data;

    let handle: DebugServicesHandle | null = syncDebugServices(
      editorStore,
      enabledDebugStore,
      null,
    );
    expect(handle).not.toBeNull();

    // 5. Devtools API is available
    const devtools = devtoolsGlobal()!;
    expect(devtools).toBeDefined();
    expect(devtools.state.debug.logLevel).toBe('debug');
    // buildInfo may be null in test environment
    const info = devtools.buildInfo;
    expect(info === null || typeof info === 'object').toBe(true);

    // 6. Devtools mutations work
    devtools.setTheme('ocean');
    expect(editorStore.setTheme).toHaveBeenCalledWith('ocean');

    devtools.set('features.settings', false);
    expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);

    // 7. Welcome banner was logged (header + state + flags + API + logger hint)
    expect(consoleSpy).toHaveBeenCalled();
    expect(groupSpy).toHaveBeenCalled();

    // 8. URL Overrides section shows in banner
    const overrideGroup = groupSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('URL Overrides'),
    );
    expect(overrideGroup).toBeDefined();

    // 9. Logger active message (logLevel is debug)
    const loggerActive = consoleSpy.mock.calls.find(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('Logger'),
    );
    expect(loggerActive).toBeDefined();

    // 10. Destroy cleans up
    handle = syncDebugServices(editorStore, createMockDebugStore(false), handle);
    expect(handle).toBeNull();
    expect(devtoolsGlobal()).toBeUndefined();
  });

  it('devtools window global key derives from APP_NAME', () => {
    expect(DEVTOOLS_KEY).toBe(`__${APP_NAME.toUpperCase()}_DEVTOOLS__`);

    const debugStore = createMockDebugStore(true);
    activateDebugServices(editorStore, debugStore);

    expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBe(devtoolsGlobal());
  });
});
