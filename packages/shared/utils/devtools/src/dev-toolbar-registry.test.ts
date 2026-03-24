import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import {
  discoverFeatureFlags,
  discoverAppPreferences,
  discoverDebugFields,
  introspectEntry,
  humanizeKey,
  humanizeOption,
  generateDebugUrl,
} from './dev-toolbar-registry';
import type { DevtoolsConfig } from './types';

// =============================================================================
// Test schemas (inline — simulates any product's Valibot schemas)
// =============================================================================

const TestFlagsSchema = v.strictObject({
  sidebar: v.optional(v.boolean(), true),
  toolbar: v.optional(v.boolean(), true),
  darkMode: v.optional(v.boolean(), false),
});

const TestPrefsSchema = v.strictObject({
  theme: v.optional(v.picklist(['', 'midnight', 'ocean', 'forest']), ''),
  mode: v.optional(v.picklist(['light', 'dark', 'system']), 'system'),
  sidebarOpen: v.optional(v.boolean(), true),
  appName: v.optional(v.string(), 'TestApp'),
  fontSize: v.optional(v.number(), 14),
});

const TestDebugSchema = v.strictObject({
  enabled: v.optional(v.boolean(), false),
  logLevel: v.optional(v.picklist(['trace', 'debug', 'info', 'warn', 'error']), 'info'),
});

// Cast entries for parameterized API
const flagEntries = TestFlagsSchema.entries as unknown as Record<string, Record<string, unknown>>;
const prefEntries = TestPrefsSchema.entries as unknown as Record<string, Record<string, unknown>>;
const debugEntries = TestDebugSchema.entries as unknown as Record<string, Record<string, unknown>>;

// =============================================================================
// introspectEntry
// =============================================================================

describe('introspectEntry', () => {
  it('detects v.optional(v.boolean(), false) as boolean', () => {
    const result = introspectEntry(flagEntries.darkMode!);
    expect(result.type).toBe('boolean');
    expect(result.default).toBe(false);
  });

  it('detects v.optional(v.picklist(...)) as picklist with options', () => {
    const result = introspectEntry(prefEntries.theme!);
    expect(result.type).toBe('picklist');
    expect(result.options).toContain('midnight');
    expect(result.options).toContain('ocean');
    expect(result.default).toBe('');
  });

  it('detects v.optional(v.string()) as string', () => {
    const result = introspectEntry(prefEntries.appName!);
    expect(result.type).toBe('string');
    expect(result.default).toBe('TestApp');
  });

  it('detects v.optional(v.number()) as number', () => {
    const result = introspectEntry(prefEntries.fontSize!);
    expect(result.type).toBe('number');
    expect(result.default).toBe(14);
  });

  it('detects v.pipe(v.string(), ...) as string', () => {
    // Simulate a pipe schema entry
    const pipeEntry = {
      type: 'optional',
      default: 'hello',
      wrapped: {
        type: 'pipe',
        pipe: [{ type: 'string' }, { type: 'minLength' }],
      },
    };
    const result = introspectEntry(pipeEntry as Record<string, unknown>);
    expect(result.type).toBe('string');
  });
});

// =============================================================================
// discoverFeatureFlags
// =============================================================================

describe('discoverFeatureFlags', () => {
  it('returns descriptors from schema entries', () => {
    const flags = discoverFeatureFlags(flagEntries);
    expect(flags).toHaveLength(3);
    const keys = flags.map((f) => f.key);
    expect(keys).toContain('sidebar');
    expect(keys).toContain('toolbar');
    expect(keys).toContain('darkMode');
  });

  it('extracts correct defaults', () => {
    const flags = discoverFeatureFlags(flagEntries);
    const darkMode = flags.find((f) => f.key === 'darkMode');
    expect(darkMode?.default).toBe(false);
    const sidebar = flags.find((f) => f.key === 'sidebar');
    expect(sidebar?.default).toBe(true);
  });
});

// =============================================================================
// discoverAppPreferences
// =============================================================================

describe('discoverAppPreferences', () => {
  it('returns typed field descriptors', () => {
    const prefs = discoverAppPreferences(prefEntries);
    expect(prefs).toHaveLength(5);
  });

  it('detects theme as picklist with options', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const theme = prefs.find((p) => p.key === 'theme');
    expect(theme?.type).toBe('picklist');
    expect(theme?.options).toContain('midnight');
    expect(theme?.options).toContain('ocean');
  });

  it('detects sidebarOpen as boolean', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const sidebar = prefs.find((p) => p.key === 'sidebarOpen');
    expect(sidebar?.type).toBe('boolean');
    expect(sidebar?.default).toBe(true);
  });

  it('detects appName as string', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const appName = prefs.find((p) => p.key === 'appName');
    expect(appName?.type).toBe('string');
  });

  it('detects fontSize as number', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const fontSize = prefs.find((p) => p.key === 'fontSize');
    expect(fontSize?.type).toBe('number');
    expect(fontSize?.default).toBe(14);
  });
});

// =============================================================================
// discoverDebugFields
// =============================================================================

describe('discoverDebugFields', () => {
  it('returns entries for debug schema', () => {
    const fields = discoverDebugFields(debugEntries);
    expect(fields).toHaveLength(2);
  });

  it('detects enabled as boolean', () => {
    const fields = discoverDebugFields(debugEntries);
    const enabled = fields.find((f) => f.key === 'enabled');
    expect(enabled?.type).toBe('boolean');
    expect(enabled?.default).toBe(false);
  });

  it('detects logLevel as picklist', () => {
    const fields = discoverDebugFields(debugEntries);
    const logLevel = fields.find((f) => f.key === 'logLevel');
    expect(logLevel?.type).toBe('picklist');
    expect(logLevel?.options).toContain('trace');
    expect(logLevel?.options).toContain('error');
  });
});

// =============================================================================
// humanizeKey
// =============================================================================

describe('humanizeKey', () => {
  it('converts single word to title case', () => {
    expect(humanizeKey('settings')).toBe('Settings');
  });

  it('splits camelCase into separate words', () => {
    expect(humanizeKey('sceneList')).toBe('Scene List');
  });

  it('handles multiple camelCase segments', () => {
    expect(humanizeKey('projectDropdownSettings')).toBe('Project Dropdown Settings');
  });

  it('handles single character keys', () => {
    expect(humanizeKey('a')).toBe('A');
  });
});

// =============================================================================
// humanizeOption
// =============================================================================

describe('humanizeOption', () => {
  it('returns known label for locale codes', () => {
    expect(humanizeOption('locale', 'ja')).toBe('Japanese');
    expect(humanizeOption('locale', 'en')).toBe('English');
  });

  it('returns Default for empty theme value', () => {
    expect(humanizeOption('theme', '')).toBe('Default');
  });

  it('falls back to capitalization for unknown values', () => {
    expect(humanizeOption('mode', 'dark')).toBe('Dark');
    expect(humanizeOption('mode', 'light')).toBe('Light');
  });

  it('returns known subscription plan labels', () => {
    expect(humanizeOption('subscriptionPlan', 'free')).toBe('Free');
    expect(humanizeOption('subscriptionPlan', 'pro')).toBe('Pro');
    expect(humanizeOption('subscriptionPlan', 'enterprise')).toBe('Enterprise');
  });
});

describe('generateDebugUrl', () => {
  const mockAppStore = {
    app: { theme: 'midnight', mode: 'dark' },
    features: { sidebar: true, darkMode: false },
    setFeature: () => {},
  };
  const mockDebugStore = {
    debug: { enabled: true, logLevel: 'trace' as const },
    urlOverrides: {},
    setEnabled: () => ({ ok: true as const, data: undefined, error: null }),
    setLogLevel: () => ({ ok: true as const, data: undefined, error: null }),
  };
  const mockConfig: DevtoolsConfig = {
    appName: 'TestApp',
    urlParamPrefix: 'ta.',
    appPreferencesSchema: TestPrefsSchema.entries,
    featureFlagsSchema: TestFlagsSchema.entries,
    debugStateSchema: TestDebugSchema.entries,
    goto: async () => {},
    isValidAppKey: (key: string) => key in TestPrefsSchema.entries,
    isValidFeatureFlag: (key: string) => key in TestPrefsSchema.entries,
  } as unknown as DevtoolsConfig;

  it('produces URL with debug and app preference params', () => {
    const url = generateDebugUrl(
      mockAppStore,
      mockDebugStore,
      mockConfig,
      'http://localhost:5173/editor',
    );
    expect(url).toContain('ta.debug=true');
    expect(url).toContain('ta.logLevel=trace');
    expect(url).toContain('ta.theme=midnight');
    expect(url).toContain('http://localhost:5173/editor?');
  });

  it('only includes non-default feature flags', () => {
    const url = generateDebugUrl(mockAppStore, mockDebugStore, mockConfig, 'http://localhost:5173');
    // darkMode is false but default is false → omitted
    // sidebar is true and default is true → omitted
    expect(url).not.toContain('ff.sidebar');
    expect(url).not.toContain('ff.darkMode');
  });
});
