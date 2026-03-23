import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, Str, Void } from '@/schemas/common';
import { activateDebugServices, syncDebugServices, type DebugServicesHandle } from './init.svelte';
import { getDevtoolsKey } from './devtools-api.svelte';
import type { DevtoolsConfig, AppStoreContract, DebugStoreContract } from './types';

const APP_NAME = 'TestApp';
const DEVTOOLS_KEY: Str = getDevtoolsKey(APP_NAME);

// Mock the sub-modules to avoid $effect calls in state-logger
vi.mock('./state-logger.svelte', () => ({
  createStateLogger: vi.fn(() => ({ destroy: vi.fn() })),
  createWatcher: vi.fn(() => vi.fn()),
}));

vi.mock('./devtools-api.svelte', async () => {
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

beforeEach(() => {
  appStore = createMockAppStore();
  config = makeConfig();
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

afterEach(() => {
  consoleSpy.mockRestore();
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
