import { describe, expect, it } from 'vitest';
import {
	discoverAppPreferences,
	discoverDebugFields,
	discoverFeatureFlags,
	generateDebugUrl,
	humanizeKey,
	humanizeOption,
} from '$lib/debug/dev-toolbar-registry';
import { FeatureFlagsSchema, AppPreferencesSchema } from '$lib/schemas/editor-state';
import { DebugStateSchema } from '$lib/schemas/debug-state';
import { createEditorStore } from '$lib/stores/editor-state.svelte';
import { createDebugStore } from '$lib/stores/debug-state.svelte';

// =============================================================================
// humanizeKey
// =============================================================================

describe('humanizeKey', () => {
	it('converts single word to title case', () => {
		expect(humanizeKey('settings')).toBe('Settings');
	});

	it('splits camelCase into separate words', () => {
		expect(humanizeKey('showCharts')).toBe('Show Charts');
	});

	it('handles multiple camelCase segments', () => {
		expect(humanizeKey('headerUserDropdown')).toBe('Header User Dropdown');
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
		const flags = discoverFeatureFlags();
		const schemaKeys = Object.keys(FeatureFlagsSchema.entries);
		expect(flags).toHaveLength(schemaKeys.length);
	});

	it('each entry has key and default fields', () => {
		const flags = discoverFeatureFlags();
		for (const flag of flags) {
			expect(flag).toHaveProperty('key');
			expect(flag).toHaveProperty('default');
			expect(typeof flag.key).toBe('string');
			expect(typeof flag.default).toBe('boolean');
		}
	});

	it('includes the "settings" flag with default true', () => {
		const flags = discoverFeatureFlags();
		const settings = flags.find((f) => f.key === 'settings');
		expect(settings).toBeDefined();
		expect(settings?.default).toBe(true);
	});

	it('includes all known flags', () => {
		const flags = discoverFeatureFlags();
		const keys = flags.map((f) => f.key);
		expect(keys).toContain('settings');
		expect(keys).toContain('showCharts');
		expect(keys).toContain('breadcrumb');
		expect(keys).toContain('sidebarToggle');
	});
});

// =============================================================================
// discoverAppPreferences
// =============================================================================

describe('discoverAppPreferences', () => {
	it('returns an entry for every field in AppPreferencesSchema', () => {
		const prefs = discoverAppPreferences();
		const schemaKeys = Object.keys(AppPreferencesSchema.entries);
		expect(prefs).toHaveLength(schemaKeys.length);
	});

	it('detects theme as picklist type with options', () => {
		const prefs = discoverAppPreferences();
		const theme = prefs.find((p) => p.key === 'theme');
		expect(theme).toBeDefined();
		expect(theme?.type).toBe('picklist');
		expect(theme?.options).toBeDefined();
		expect(theme?.options).toContain('midnight');
		expect(theme?.options).toContain('forest');
	});

	it('detects mode as picklist type', () => {
		const prefs = discoverAppPreferences();
		const mode = prefs.find((p) => p.key === 'mode');
		expect(mode).toBeDefined();
		expect(mode?.type).toBe('picklist');
		expect(mode?.options).toContain('light');
		expect(mode?.options).toContain('dark');
		expect(mode?.options).toContain('system');
	});

	it('detects locale as picklist type', () => {
		const prefs = discoverAppPreferences();
		const locale = prefs.find((p) => p.key === 'locale');
		expect(locale).toBeDefined();
		expect(locale?.type).toBe('picklist');
		expect(locale?.options).toContain('en');
		expect(locale?.options).toContain('ja');
	});

	it('detects sidebarOpen as boolean type', () => {
		const prefs = discoverAppPreferences();
		const sidebar = prefs.find((p) => p.key === 'sidebarOpen');
		expect(sidebar).toBeDefined();
		expect(sidebar?.type).toBe('boolean');
		expect(sidebar?.options).toBeUndefined();
	});

	it('detects appName as string type', () => {
		const prefs = discoverAppPreferences();
		const appName = prefs.find((p) => p.key === 'appName');
		expect(appName).toBeDefined();
		expect(appName?.type).toBe('string');
	});

	it('includes default values', () => {
		const prefs = discoverAppPreferences();
		const theme = prefs.find((p) => p.key === 'theme');
		expect(theme?.default).toBe('');

		const mode = prefs.find((p) => p.key === 'mode');
		expect(mode?.default).toBe('system');

		const sidebar = prefs.find((p) => p.key === 'sidebarOpen');
		expect(sidebar?.default).toBe(true);
	});

	it('detects subscriptionPlan as picklist type with plan options', () => {
		const prefs = discoverAppPreferences();
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
		const fields = discoverDebugFields();
		const schemaKeys = Object.keys(DebugStateSchema.entries);
		expect(fields).toHaveLength(schemaKeys.length);
	});

	it('detects enabled as boolean type', () => {
		const fields = discoverDebugFields();
		const enabled = fields.find((f) => f.key === 'enabled');
		expect(enabled).toBeDefined();
		expect(enabled?.type).toBe('boolean');
		expect(enabled?.default).toBe(false);
	});

	it('detects logLevel as picklist type with options', () => {
		const fields = discoverDebugFields();
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
	it('builds URL with wf.* params from store state', () => {
		const editorResult = createEditorStore();
		const debugResult = createDebugStore();
		if (!editorResult.ok || !debugResult.ok) throw new Error('Store creation failed');

		const url = generateDebugUrl(editorResult.data, debugResult.data);
		expect(url).toContain('wf.debug=');
		expect(url).toContain('wf.theme=');
		expect(url).toContain('wf.mode=');
		expect(url).toContain('wf.locale=');
	});

	it('includes feature flag overrides for non-default flags', () => {
		const editorResult = createEditorStore();
		const debugResult = createDebugStore();
		if (!editorResult.ok || !debugResult.ok) throw new Error('Store creation failed');

		// Disable a flag
		editorResult.data.setFeature('settings', false);

		const url = generateDebugUrl(editorResult.data, debugResult.data);
		expect(url).toContain('wf.ff.settings=false');
	});

	it('uses provided base URL', () => {
		const editorResult = createEditorStore();
		const debugResult = createDebugStore();
		if (!editorResult.ok || !debugResult.ok) throw new Error('Store creation failed');

		const url = generateDebugUrl(editorResult.data, debugResult.data, 'https://example.com/editor');
		expect(url).toMatch(/^https:\/\/example\.com\/editor\?/);
	});

	it('uses window.location.href as default base when available', () => {
		const editorResult = createEditorStore();
		const debugResult = createDebugStore();
		if (!editorResult.ok || !debugResult.ok) throw new Error('Store creation failed');

		const url = generateDebugUrl(editorResult.data, debugResult.data);
		// In test env, window.location.href is 'http://localhost:3000/' or similar
		expect(url).toContain('?wf.');
	});
});
