import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str } from '@/schemas/common';
import {
  parseDebugParams,
  applyUrlOverrides,
  isValidAppKey,
  isValidFeatureFlag,
} from './url-params';
import type { DevtoolsConfig, AppStoreContract } from './types';

const URL_PREFIX: Str = 'ta.';

// Test schemas (simulating a product's Valibot schema entries)
const TEST_APP_SCHEMA = {
  theme: { type: 'optional', default: '' },
  mode: { type: 'optional', default: 'system' },
  sidebarOpen: { type: 'optional', default: true },
  mockDataDelay: { type: 'optional', default: 0 },
};

const TEST_FLAGS_SCHEMA = {
  settings: { type: 'optional', default: true },
  sidebar: { type: 'optional', default: true },
};

const TEST_DEBUG_SCHEMA = {
  enabled: { type: 'optional', default: false },
  logLevel: { type: 'optional', default: 'info' },
};

const okVoid = () => ({ ok: true as const, data: undefined, error: null });

const makeConfig = (): DevtoolsConfig => ({
  appName: 'TestApp',
  urlParamPrefix: URL_PREFIX,
  appPreferencesSchema: TEST_APP_SCHEMA,
  featureFlagsSchema: TEST_FLAGS_SCHEMA,
  debugStateSchema: TEST_DEBUG_SCHEMA,
  goto: vi.fn(async () => {}),
  isValidAppKey: (key: Str) => key in TEST_APP_SCHEMA,
  isValidFeatureFlag: (key: Str) => key in TEST_FLAGS_SCHEMA,
});

// ── parseDebugParams ────────────────────────────────────────────────────

describe('parseDebugParams', () => {
  it('returns empty overrides for URL with no prefixed params', () => {
    const result = parseDebugParams(new URL('http://localhost'), URL_PREFIX);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({});
    }
  });

  it('extracts single prefixed param', () => {
    const result = parseDebugParams(
      new URL(`http://localhost?${URL_PREFIX}debug=true`),
      URL_PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ debug: 'true' });
    }
  });

  it('extracts multiple prefixed params', () => {
    const result = parseDebugParams(
      new URL(
        `http://localhost?${URL_PREFIX}debug=true&${URL_PREFIX}logLevel=trace&${URL_PREFIX}theme=midnight`,
      ),
      URL_PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ debug: 'true', logLevel: 'trace', theme: 'midnight' });
    }
  });

  it('ignores non-prefixed params', () => {
    const result = parseDebugParams(
      new URL(`http://localhost?foo=bar&${URL_PREFIX}debug=true&baz=qux`),
      URL_PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ debug: 'true' });
    }
  });

  it('handles feature flag params with ff. prefix', () => {
    const result = parseDebugParams(
      new URL(`http://localhost?${URL_PREFIX}ff.settings=false`),
      URL_PREFIX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ 'ff.settings': 'false' });
    }
  });
});

// ── isValidAppKey / isValidFeatureFlag ──────────────────────────────────

describe('isValidAppKey', () => {
  it('returns true for valid app key', () => {
    expect(isValidAppKey('theme', TEST_APP_SCHEMA)).toBe(true);
    expect(isValidAppKey('mode', TEST_APP_SCHEMA)).toBe(true);
  });

  it('returns false for unknown key', () => {
    expect(isValidAppKey('unknown', TEST_APP_SCHEMA)).toBe(false);
  });
});

describe('isValidFeatureFlag', () => {
  it('returns true for valid flag', () => {
    expect(isValidFeatureFlag('settings', TEST_FLAGS_SCHEMA)).toBe(true);
  });

  it('returns false for unknown flag', () => {
    expect(isValidFeatureFlag('unknown', TEST_FLAGS_SCHEMA)).toBe(false);
  });
});

// ── applyUrlOverrides ───────────────────────────────────────────────────

describe('applyUrlOverrides', () => {
  const createMockAppStore = (): AppStoreContract & Record<Str, unknown> => ({
    app: { theme: '', mode: 'system', sidebarOpen: true, mockDataDelay: 0 },
    features: { settings: true, sidebar: true },
    setTheme: vi.fn(okVoid),
    setMode: vi.fn(okVoid),
    setSidebarOpen: vi.fn(okVoid),
    setMockDataDelay: vi.fn(okVoid),
    setFeature: vi.fn(okVoid),
  });

  const createMockDebugStore = () => ({
    debug: { enabled: false, logLevel: 'info' as const },
    urlOverrides: {},
    setEnabled: vi.fn(okVoid),
    setLogLevel: vi.fn(okVoid),
  });

  let appStore: ReturnType<typeof createMockAppStore>;
  let debugStore: ReturnType<typeof createMockDebugStore>;
  let config: DevtoolsConfig;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    appStore = createMockAppStore();
    debugStore = createMockDebugStore();
    config = makeConfig();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns ok for empty overrides', () => {
    const result = applyUrlOverrides(appStore, debugStore, {}, config);
    expect(result.ok).toBe(true);
  });

  it('applies debug=true to debug store', () => {
    applyUrlOverrides(appStore, debugStore, { debug: 'true' }, config);
    expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
  });

  it('applies logLevel to debug store', () => {
    applyUrlOverrides(appStore, debugStore, { logLevel: 'trace' }, config);
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');
  });

  it('applies theme override to app store', () => {
    applyUrlOverrides(appStore, debugStore, { theme: 'midnight' }, config);
    expect(appStore.setTheme).toHaveBeenCalledWith('midnight');
  });

  it('applies sidebarOpen as boolean', () => {
    applyUrlOverrides(appStore, debugStore, { sidebarOpen: 'false' }, config);
    expect(appStore.setSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('applies feature flag override', () => {
    applyUrlOverrides(appStore, debugStore, { 'ff.settings': 'false' }, config);
    expect(appStore.setFeature).toHaveBeenCalledWith('settings', false);
  });

  it('warns about unknown keys', () => {
    applyUrlOverrides(appStore, debugStore, { unknownKey: 'value' }, config);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Unknown URL override: ${URL_PREFIX}unknownKey=value`),
    );
  });

  it('silently ignores unknown feature flag keys', () => {
    const result = applyUrlOverrides(appStore, debugStore, { 'ff.nonexistent': 'true' }, config);
    expect(result.ok).toBe(true);
    expect(appStore.setFeature).not.toHaveBeenCalled();
  });

  it('applies multiple overrides in one call', () => {
    applyUrlOverrides(
      appStore,
      debugStore,
      {
        debug: 'true',
        logLevel: 'trace',
        theme: 'midnight',
        'ff.settings': 'false',
      },
      config,
    );
    expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
    expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');
    expect(appStore.setTheme).toHaveBeenCalledWith('midnight');
    expect(appStore.setFeature).toHaveBeenCalledWith('settings', false);
  });

  it('converts mockDataDelay to number', () => {
    applyUrlOverrides(
      appStore,
      debugStore,
      {
        mockDataDelay: '500',
      },
      config,
    );
    expect(appStore.setMockDataDelay).toHaveBeenCalledWith(500);
  });

  it('silently ignores when setter property is not a function', () => {
    const brokenStore = {
      ...appStore,
      setTheme: 'not-a-function' as unknown,
    };
    // Should not throw — the typeof setter === 'function' guard protects
    const result = applyUrlOverrides(
      brokenStore as never,
      debugStore,
      { theme: 'midnight' },
      config,
    );
    expect(result.ok).toBe(true);
  });

  it('applies sidebarOpen=true as boolean true (covers true branch)', () => {
    applyUrlOverrides(appStore, debugStore, { sidebarOpen: 'true' }, config);
    expect(appStore.setSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('converts non-numeric mockDataDelay to 0 (Number(value) || 0 fallback)', () => {
    applyUrlOverrides(appStore, debugStore, { mockDataDelay: 'abc' }, config);
    expect(appStore.setMockDataDelay).toHaveBeenCalledWith(0);
  });
});
