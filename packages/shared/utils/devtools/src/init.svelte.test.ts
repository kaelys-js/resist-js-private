import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, Str, Void } from '@/schemas/common';
import { activateDebugServices, syncDebugServices, type DebugServicesHandle } from './init.svelte';
import { getDevtoolsKey } from './devtools-api.svelte';
import type { DevtoolsConfig, AppStoreContract, DebugStoreContract } from './types';

const APP_NAME = 'TestApp';
const DEVTOOLS_KEY: Str = getDevtoolsKey(APP_NAME);

const { mockGetBuildInfo } = vi.hoisted(() => ({
  mockGetBuildInfo: vi.fn(),
}));

// Mock the sub-modules to avoid $effect calls in state-logger
vi.mock('./state-logger.svelte', () => ({
  createStateLogger: vi.fn(() => ({ destroy: vi.fn() })),
  createWatcher: vi.fn(() => vi.fn()),
}));

vi.mock('@/utils/core/build-info', () => ({
  getBuildInfo: mockGetBuildInfo,
}));

vi.mock('./devtools-api.svelte', () => {
  const key: Str = `__TESTAPP_DEVTOOLS__`;
  return {
    getDevtoolsKey: (name: Str): Str => `__${name.toUpperCase()}_DEVTOOLS__`,
    getBuildKey: (name: Str): Str => `__${name.toUpperCase()}_BUILD__`,
    createDevtoolsAPI: vi.fn((): { destroy(): Void } => {
      (window as unknown as Record<Str, unknown>)[key] = {
        stub: true,
        logState: vi.fn(),
      };
      return {
        destroy(): Void {
          Object.defineProperty(window, key, {
            value: undefined,
            writable: true,
            configurable: true,
          });
        },
      };
    }),
  };
});

const TEST_APP_SCHEMA = {
  appName: { type: 'optional', default: APP_NAME },
  theme: { type: 'optional', default: '' },
};

const TEST_FLAGS_SCHEMA = {
  settings: { type: 'optional', default: true },
};

const TEST_DEBUG_SCHEMA = {
  enabled: { type: 'optional', default: false },
  logLevel: { type: 'optional', default: 'info' },
};

const okVoid = () => ({ ok: true as const, data: undefined, error: null });

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
  app: { appName: APP_NAME, theme: '' },
  features: { settings: true },
  setFeature: vi.fn(okVoid),
  setTheme: vi.fn(okVoid),
});

const createMockDebugStore = (enabled: Bool): DebugStoreContract => ({
  debug: { enabled, logLevel: 'info' },
  urlOverrides: {},
  setEnabled: vi.fn(okVoid),
  setLogLevel: vi.fn(okVoid),
});

let appStore: ReturnType<typeof createMockAppStore>;
let config: DevtoolsConfig;
let consoleSpy: ReturnType<typeof vi.spyOn>;
let groupCollapsedSpy: ReturnType<typeof vi.spyOn>;
let groupEndSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  appStore = createMockAppStore();
  config = makeConfig();
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  groupCollapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
  groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  mockGetBuildInfo.mockReturnValue({
    ok: true,
    data: {
      version: '1.0.0',
      commit: 'abc123',
      branch: 'main',
      dirty: false,
      buildTimestamp: '2026-04-07T00:00:00Z',
    },
    error: null,
  });
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

afterEach(() => {
  consoleSpy.mockRestore();
  groupCollapsedSpy.mockRestore();
  groupEndSpy.mockRestore();
  warnSpy.mockRestore();
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

describe('activateDebugServices', () => {
  it('registers devtools window global', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeDefined();
    handle.destroy();
  });

  it('logs welcome banner on activation', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const { calls } = consoleSpy.mock;
    const hasWelcome: Bool = calls.some(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes(`[${APP_NAME}]`),
    );
    expect(hasWelcome).toBe(true);
    handle.destroy();
  });

  it('destroy removes devtools and logs deactivation', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    handle.destroy();

    expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      `%c ${APP_NAME} %c Debug mode disabled`,
      expect.any(String),
      expect.any(String),
    );
  });
});

describe('syncDebugServices', () => {
  it('returns null when debug is disabled and no handle', () => {
    const debugStore = createMockDebugStore(false);
    const result = syncDebugServices(appStore, debugStore, config, null);

    expect(result).toBeNull();
  });

  it('activates when debug is enabled and no handle', () => {
    const debugStore = createMockDebugStore(true);
    const result = syncDebugServices(appStore, debugStore, config, null);

    expect(result).not.toBeNull();
    result?.destroy();
  });

  it('deactivates when debug is disabled and handle exists', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const disabledStore = createMockDebugStore(false);
    const result = syncDebugServices(appStore, disabledStore, config, handle);

    expect(result).toBeNull();
  });

  it('returns existing handle when debug is enabled and handle exists', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const result = syncDebugServices(appStore, debugStore, config, handle);

    expect(result).toBe(handle);
    handle.destroy();
  });
});

// ── logWelcomeBanner coverage ─────────────────────────────────────────────

describe('logWelcomeBanner (via activateDebugServices)', () => {
  it('logs Build Info group when getBuildInfo succeeds', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const hasBuild: Bool = groupCalls.some((s: Str) => s.includes('Build Info'));
    expect(hasBuild).toBe(true);
    handle.destroy();
  });

  it('skips Build Info group when getBuildInfo returns error', () => {
    mockGetBuildInfo.mockReturnValueOnce({ ok: false, error: { code: 'ERR' } });
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const hasBuild: Bool = groupCalls.some((s: Str) => s.includes('Build Info'));
    expect(hasBuild).toBe(false);
    handle.destroy();
  });

  it('logs Build Info with dirty=Yes when build is dirty', () => {
    mockGetBuildInfo.mockReturnValueOnce({
      ok: true,
      data: {
        version: '1.0.0',
        commit: 'abc123',
        branch: 'main',
        dirty: true,
        buildTimestamp: '2026-04-07T00:00:00Z',
      },
      error: null,
    });
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const allOutput: Str = consoleSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(allOutput).toContain('Yes');
    handle.destroy();
  });

  it('logs Current State group', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const hasState: Bool = groupCalls.some((s: Str) => s.includes('Current State'));
    expect(hasState).toBe(true);
    handle.destroy();
  });

  it('logs Feature Flags group', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const hasFlags: Bool = groupCalls.some((s: Str) => s.includes('Feature Flags'));
    expect(hasFlags).toBe(true);
    handle.destroy();
  });

  it('logs Devtools API group with global name', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const hasApi: Bool = groupCalls.some((s: Str) => s.includes('Devtools API'));
    expect(hasApi).toBe(true);
    handle.destroy();
  });

  it('logs URL Overrides group when overrides exist with recognized keys', () => {
    const debugStore: DebugStoreContract = {
      debug: { enabled: true, logLevel: 'info' },
      urlOverrides: { debug: 'true', theme: 'midnight' },
      setEnabled: vi.fn(okVoid),
      setLogLevel: vi.fn(okVoid),
    };
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const hasOverrides: Bool = groupCalls.some((s: Str) => s.includes('URL Overrides'));
    expect(hasOverrides).toBe(true);
    handle.destroy();
  });

  it('warns about unknown URL override keys', () => {
    const debugStore: DebugStoreContract = {
      debug: { enabled: true, logLevel: 'info' },
      urlOverrides: { unknownKey: 'val' },
      setEnabled: vi.fn(okVoid),
      setLogLevel: vi.fn(okVoid),
    };
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    expect(warnSpy).toHaveBeenCalled();
    const warnOutput: Str = warnSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(warnOutput).toContain('unknownKey');
    expect(warnOutput).toContain('unknown');
    handle.destroy();
  });

  it('recognizes ff.* prefix URL overrides (isRecognizedOverrideKey)', () => {
    const debugStore: DebugStoreContract = {
      debug: { enabled: true, logLevel: 'info' },
      urlOverrides: { 'ff.settings': 'false' },
      setEnabled: vi.fn(okVoid),
      setLogLevel: vi.fn(okVoid),
    };
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => c.join(' '));
    const hasOverrides: Bool = groupCalls.some((s: Str) => s.includes('URL Overrides'));
    expect(hasOverrides).toBe(true);
    // ff.settings is recognized — no warnings
    const ffWarns = warnSpy.mock.calls.filter((c: unknown[]) =>
      String(c[0]).includes('ff.settings'),
    );
    expect(ffWarns).toHaveLength(0);
    handle.destroy();
  });

  it('recognizes logLevel URL override key', () => {
    const debugStore: DebugStoreContract = {
      debug: { enabled: true, logLevel: 'trace' },
      urlOverrides: { logLevel: 'trace' },
      setEnabled: vi.fn(okVoid),
      setLogLevel: vi.fn(okVoid),
    };
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => c.join(' '));
    const hasOverrides: Bool = groupCalls.some((s: Str) => s.includes('URL Overrides'));
    expect(hasOverrides).toBe(true);
    // logLevel is recognized — should appear in valid block, no warning
    const logLevelWarns = warnSpy.mock.calls.filter((c: unknown[]) =>
      String(c[0]).includes('logLevel'),
    );
    expect(logLevelWarns).toHaveLength(0);
    handle.destroy();
  });

  it('no URL Overrides group when urlOverrides is empty', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const hasOverrides: Bool = groupCalls.some((s: Str) => s.includes('URL Overrides'));
    expect(hasOverrides).toBe(false);
    handle.destroy();
  });

  it('shows Tip message when logLevel is info (not debug/trace)', () => {
    const debugStore = createMockDebugStore(true);
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const allOutput: Str = consoleSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(allOutput).toContain('[Tip]');
    expect(allOutput).toContain('logLevel');
    handle.destroy();
  });

  it('shows "State change logging active" when logLevel is debug', () => {
    const debugStore: DebugStoreContract = {
      debug: { enabled: true, logLevel: 'debug' },
      urlOverrides: {},
      setEnabled: vi.fn(okVoid),
      setLogLevel: vi.fn(okVoid),
    };
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const allOutput: Str = consoleSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(allOutput).toContain('[Logger]');
    expect(allOutput).toContain('State change logging active');
    handle.destroy();
  });

  it('shows "State change logging active" when logLevel is trace', () => {
    const debugStore: DebugStoreContract = {
      debug: { enabled: true, logLevel: 'trace' },
      urlOverrides: {},
      setEnabled: vi.fn(okVoid),
      setLogLevel: vi.fn(okVoid),
    };
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const allOutput: Str = consoleSpy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');
    expect(allOutput).toContain('[Logger]');
    expect(allOutput).toContain('State change logging active');
    handle.destroy();
  });

  it('URL Overrides shows suffix with count and unknown count', () => {
    const debugStore: DebugStoreContract = {
      debug: { enabled: true, logLevel: 'info' },
      urlOverrides: { theme: 'midnight', bogus: 'val' },
      setEnabled: vi.fn(okVoid),
      setLogLevel: vi.fn(okVoid),
    };
    const handle: DebugServicesHandle = activateDebugServices(appStore, debugStore, config);

    const groupCalls: Str[] = groupCollapsedSpy.mock.calls.map((c: unknown[]) => c.join(' '));
    const overrideCall = groupCalls.find((s: Str) => s.includes('URL Overrides'));
    expect(overrideCall).toBeDefined();
    expect(overrideCall).toContain('1 applied');
    expect(overrideCall).toContain('1 unknown');
    handle.destroy();
  });
});
