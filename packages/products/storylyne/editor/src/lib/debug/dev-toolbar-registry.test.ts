import { describe, expect, it, vi } from 'vitest';
import {
  discoverAppPreferences,
  discoverDebugFields,
  discoverFeatureFlags,
  generateDebugUrl,
  humanizeKey,
  humanizeOption,
} from '@/utils/devtools/dev-toolbar-registry';
import { FeatureFlagsSchema, AppPreferencesSchema } from '$lib/schemas/editor-state';
import { DebugStateSchema } from '@/utils/devtools/debug-state-schema';
import { APP_NAME, URL_PARAM_PREFIX } from '$lib/config/app-meta';
import { createEditorStore } from '$lib/stores/editor-state.svelte';
import { createDebugStore } from '$lib/stores/debug-state.svelte';
import type { DevtoolsConfig } from '@/utils/devtools/types';

const flagEntries = FeatureFlagsSchema.entries as unknown as Record<
  string,
  Record<string, unknown>
>;
const prefEntries = AppPreferencesSchema.entries as unknown as Record<
  string,
  Record<string, unknown>
>;
const debugEntries = DebugStateSchema.entries as unknown as Record<string, Record<string, unknown>>;

const testConfig: DevtoolsConfig = {
  appName: APP_NAME,
  urlParamPrefix: URL_PARAM_PREFIX,
  appPreferencesSchema: prefEntries,
  featureFlagsSchema: flagEntries,
  debugStateSchema: debugEntries,
  goto: vi.fn(async () => {}),
  isValidAppKey: (key: string) => key in prefEntries,
  isValidFeatureFlag: (key: string) => key in flagEntries,
};

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

  it('handles consecutive uppercase letters', () => {
    expect(humanizeKey('appName')).toBe('App Name');
  });
});

// =============================================================================
// discoverFeatureFlags
// =============================================================================

describe('discoverFeatureFlags', () => {
  it('returns an entry for every flag in FeatureFlagsSchema', () => {
    const flags = discoverFeatureFlags(flagEntries);
    const schemaKeys = Object.keys(FeatureFlagsSchema.entries);
    expect(flags).toHaveLength(schemaKeys.length);
  });

  it('each entry has key and default fields', () => {
    const flags = discoverFeatureFlags(flagEntries);
    for (const flag of flags) {
      expect(flag).toHaveProperty('key');
      expect(flag).toHaveProperty('default');
      expect(typeof flag.key).toBe('string');
      expect(typeof flag.default).toBe('boolean');
    }
  });

  it('includes the "settings" flag with default true', () => {
    const flags = discoverFeatureFlags(flagEntries);
    const settings = flags.find((f) => f.key === 'settings');
    expect(settings).toBeDefined();
    expect(settings?.default).toBe(true);
  });

  it('includes all known flags', () => {
    const flags = discoverFeatureFlags(flagEntries);
    const keys = flags.map((f) => f.key);
    expect(keys).toContain('settings');
    expect(keys).toContain('sceneList');
    expect(keys).toContain('breadcrumb');
    expect(keys).toContain('sidebarToggle');
  });
});

// =============================================================================
// discoverAppPreferences
// =============================================================================

describe('discoverAppPreferences', () => {
  it('returns an entry for every field in AppPreferencesSchema', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const schemaKeys = Object.keys(AppPreferencesSchema.entries);
    expect(prefs).toHaveLength(schemaKeys.length);
  });

  it('detects theme as picklist type with options', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const theme = prefs.find((p) => p.key === 'theme');
    expect(theme).toBeDefined();
    expect(theme?.type).toBe('picklist');
    expect(theme?.options).toBeDefined();
    expect(theme?.options).toContain('midnight');
    expect(theme?.options).toContain('forest');
  });

  it('detects mode as picklist type', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const mode = prefs.find((p) => p.key === 'mode');
    expect(mode).toBeDefined();
    expect(mode?.type).toBe('picklist');
    expect(mode?.options).toContain('light');
    expect(mode?.options).toContain('dark');
    expect(mode?.options).toContain('system');
  });

  it('detects locale as picklist type', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const locale = prefs.find((p) => p.key === 'locale');
    expect(locale).toBeDefined();
    expect(locale?.type).toBe('picklist');
    expect(locale?.options).toContain('en');
    expect(locale?.options).toContain('ja');
  });

  it('detects sidebarOpen as boolean type', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const sidebar = prefs.find((p) => p.key === 'sidebarOpen');
    expect(sidebar).toBeDefined();
    expect(sidebar?.type).toBe('boolean');
    expect(sidebar?.options).toBeUndefined();
  });

  it('detects appName as string type', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const appName = prefs.find((p) => p.key === 'appName');
    expect(appName).toBeDefined();
    expect(appName?.type).toBe('string');
  });

  it('includes default values', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const theme = prefs.find((p) => p.key === 'theme');
    expect(theme?.default).toBe('');

    const mode = prefs.find((p) => p.key === 'mode');
    expect(mode?.default).toBe('system');

    const sidebar = prefs.find((p) => p.key === 'sidebarOpen');
    expect(sidebar?.default).toBe(true);
  });

  it('detects subscriptionPlan as picklist type with plan options', () => {
    const prefs = discoverAppPreferences(prefEntries);
    const plan = prefs.find((p) => p.key === 'subscriptionPlan');
    expect(plan).toBeDefined();
    expect(plan?.type).toBe('picklist');
    expect(plan?.options).toContain('free');
    expect(plan?.options).toContain('starter');
    expect(plan?.options).toContain('pro');
    expect(plan?.options).toContain('enterprise');
    expect(plan?.default).toBe('pro');
  });
});

// =============================================================================
// humanizeOption — subscriptionPlan labels
// =============================================================================

describe('humanizeOption — subscriptionPlan', () => {
  it("returns 'Free' for subscriptionPlan 'free'", () => {
    expect(humanizeOption('subscriptionPlan', 'free')).toBe('Free');
  });

  it("returns 'Starter' for subscriptionPlan 'starter'", () => {
    expect(humanizeOption('subscriptionPlan', 'starter')).toBe('Starter');
  });

  it("returns 'Pro' for subscriptionPlan 'pro'", () => {
    expect(humanizeOption('subscriptionPlan', 'pro')).toBe('Pro');
  });

  it("returns 'Enterprise' for subscriptionPlan 'enterprise'", () => {
    expect(humanizeOption('subscriptionPlan', 'enterprise')).toBe('Enterprise');
  });
});

// =============================================================================
// discoverDebugFields
// =============================================================================

describe('discoverDebugFields', () => {
  it('returns an entry for every field in DebugStateSchema', () => {
    const fields = discoverDebugFields(debugEntries);
    const schemaKeys = Object.keys(DebugStateSchema.entries);
    expect(fields).toHaveLength(schemaKeys.length);
  });

  it('detects enabled as boolean type', () => {
    const fields = discoverDebugFields(debugEntries);
    const enabled = fields.find((f) => f.key === 'enabled');
    expect(enabled).toBeDefined();
    expect(enabled?.type).toBe('boolean');
    expect(enabled?.default).toBe(false);
  });

  it('detects logLevel as picklist type with options', () => {
    const fields = discoverDebugFields(debugEntries);
    const logLevel = fields.find((f) => f.key === 'logLevel');
    expect(logLevel).toBeDefined();
    expect(logLevel?.type).toBe('picklist');
    expect(logLevel?.options).toContain('trace');
    expect(logLevel?.options).toContain('error');
  });
});

// =============================================================================
// generateDebugUrl
// =============================================================================

describe('generateDebugUrl', () => {
  it('builds URL with app-prefixed params from store state', () => {
    const editorResult = createEditorStore();
    const debugResult = createDebugStore();
    if (!editorResult.ok || !debugResult.ok) throw new Error('Store creation failed');

    const url = generateDebugUrl(editorResult.data, debugResult.data, testConfig);
    expect(url).toContain(`${URL_PARAM_PREFIX}debug=`);
    expect(url).toContain(`${URL_PARAM_PREFIX}theme=`);
    expect(url).toContain(`${URL_PARAM_PREFIX}mode=`);
    expect(url).toContain(`${URL_PARAM_PREFIX}locale=`);
  });

  it('includes feature flag overrides for non-default flags', () => {
    const editorResult = createEditorStore();
    const debugResult = createDebugStore();
    if (!editorResult.ok || !debugResult.ok) throw new Error('Store creation failed');

    // Disable a flag
    editorResult.data.setFeature('settings', false);

    const url = generateDebugUrl(editorResult.data, debugResult.data, testConfig);
    expect(url).toContain(`${URL_PARAM_PREFIX}ff.settings=false`);
  });

  it('uses provided base URL', () => {
    const editorResult = createEditorStore();
    const debugResult = createDebugStore();
    if (!editorResult.ok || !debugResult.ok) throw new Error('Store creation failed');

    const url = generateDebugUrl(
      editorResult.data,
      debugResult.data,
      testConfig,
      'https://example.com/editor',
    );
    expect(url).toMatch(/^https:\/\/example\.com\/editor\?/);
  });

  it('uses window.location.href as default base when available', () => {
    const editorResult = createEditorStore();
    const debugResult = createDebugStore();
    if (!editorResult.ok || !debugResult.ok) throw new Error('Store creation failed');

    const url = generateDebugUrl(editorResult.data, debugResult.data, testConfig);
    // In test env, window.location.href is 'http://localhost:3000/' or similar
    expect(url).toContain(`?${URL_PARAM_PREFIX}`);
  });
});
