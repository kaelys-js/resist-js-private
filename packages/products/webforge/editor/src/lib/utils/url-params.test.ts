import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	parseDebugParams,
	applyUrlOverrides,
	isValidAppKey,
	isValidFeatureFlag,
} from './url-params';
import { APP_NAME } from '$lib/config/app-meta';

const okVoid = () => ({ ok: true as const, data: undefined, error: null });

// ── parseDebugParams ────────────────────────────────────────────────────

describe('parseDebugParams', () => {
	it('returns empty overrides for URL with no wf.* params', () => {
		const result = parseDebugParams(new URL('http://localhost'));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual({});
	});

	it('extracts single wf.* param', () => {
		const result = parseDebugParams(new URL('http://localhost?wf.debug=true'));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual({ debug: 'true' });
	});

	it('extracts multiple wf.* params', () => {
		const result = parseDebugParams(
			new URL('http://localhost?wf.debug=true&wf.logLevel=trace&wf.theme=midnight'),
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toEqual({
				debug: 'true',
				logLevel: 'trace',
				theme: 'midnight',
			});
		}
	});

	it('ignores non-wf params', () => {
		const result = parseDebugParams(new URL('http://localhost?foo=bar&wf.debug=true&baz=qux'));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual({ debug: 'true' });
	});

	it('handles feature flag params with ff. prefix', () => {
		const result = parseDebugParams(new URL('http://localhost?wf.ff.settings=false'));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual({ 'ff.settings': 'false' });
	});

	it('handles empty value', () => {
		const result = parseDebugParams(new URL('http://localhost?wf.debug='));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual({ debug: '' });
	});

	it('handles URL with hash and path', () => {
		const result = parseDebugParams(new URL('http://localhost/editor?wf.debug=true#section'));
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual({ debug: 'true' });
	});
});

// ── isValidAppKey / isValidFeatureFlag ──────────────────────────────────

describe('isValidAppKey', () => {
	it.each([
		'appName',
		'theme',
		'mode',
		'locale',
		'sidebarOpen',
		'userName',
		'userEmail',
		'userAvatar',
	])('returns true for: %s', (key) => {
		expect(isValidAppKey(key)).toBe(true);
	});

	it('returns false for unknown key', () => {
		expect(isValidAppKey('unknown')).toBe(false);
	});

	it('returns false for feature flag key', () => {
		expect(isValidAppKey('settings')).toBe(false);
	});
});

describe('isValidFeatureFlag', () => {
	it.each([
		'settings',
		'themeSelection',
		'languageSelection',
		'modeToggle',
		'sidebar',
		'sceneList',
		'resizableSidebar',
		'breadcrumb',
		'sidebarToggle',
		'sidebarHelp',
		'projectDropdown',
		'projectDropdownSettings',
		'projectDropdownIcon',
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
	])('returns true for: %s', (key) => {
		expect(isValidFeatureFlag(key)).toBe(true);
	});

	it('returns false for unknown key', () => {
		expect(isValidFeatureFlag('unknown')).toBe(false);
	});

	it('returns false for app key', () => {
		expect(isValidFeatureFlag('theme')).toBe(false);
	});
});

// ── applyUrlOverrides ───────────────────────────────────────────────────

describe('applyUrlOverrides', () => {
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
		debug: { enabled: false, logLevel: 'info' as const },
		urlOverrides: {},
		setEnabled: vi.fn(() => ({ ok: true as const, data: undefined, error: null })),
		setLogLevel: vi.fn(() => ({ ok: true as const, data: undefined, error: null })),
	});

	let editorStore: ReturnType<typeof createMockEditorStore>;
	let debugStore: ReturnType<typeof createMockDebugStore>;
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		editorStore = createMockEditorStore();
		debugStore = createMockDebugStore();
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('returns ok for empty overrides', () => {
		const result = applyUrlOverrides(editorStore, debugStore, {});
		expect(result.ok).toBe(true);
	});

	it('applies debug=true to debug store', () => {
		applyUrlOverrides(editorStore, debugStore, { debug: 'true' });
		expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
	});

	it('applies debug=false to debug store', () => {
		applyUrlOverrides(editorStore, debugStore, { debug: 'false' });
		expect(debugStore.setEnabled).toHaveBeenCalledWith(false);
	});

	it('applies logLevel to debug store', () => {
		applyUrlOverrides(editorStore, debugStore, { logLevel: 'trace' });
		expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');
	});

	it('applies theme override to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { theme: 'midnight' });
		expect(editorStore.setTheme).toHaveBeenCalledWith('midnight');
	});

	it('applies mode override to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { mode: 'dark' });
		expect(editorStore.setMode).toHaveBeenCalledWith('dark');
	});

	it('applies locale override to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { locale: 'ja' });
		expect(editorStore.setLocale).toHaveBeenCalledWith('ja');
	});

	it('applies sidebarOpen override to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { sidebarOpen: 'false' });
		expect(editorStore.setSidebarOpen).toHaveBeenCalledWith(false);
	});

	it('applies feature flag override', () => {
		applyUrlOverrides(editorStore, debugStore, { 'ff.settings': 'false' });
		expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);
	});

	it('applies multiple feature flag overrides', () => {
		applyUrlOverrides(editorStore, debugStore, {
			'ff.settings': 'false',
			'ff.sidebar': 'true',
		});
		expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);
		expect(editorStore.setFeature).toHaveBeenCalledWith('sidebar', true);
	});

	it('warns about unknown keys in console', () => {
		const result = applyUrlOverrides(editorStore, debugStore, { unknownKey: 'value' });
		expect(result.ok).toBe(true);
		expect(editorStore.setTheme).not.toHaveBeenCalled();
		expect(editorStore.setFeature).not.toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Unknown URL override: wf.unknownKey=value'),
		);
	});

	it('warns about typo params like logLesel', () => {
		applyUrlOverrides(editorStore, debugStore, { logLesel: 'debug' });
		expect(debugStore.setLogLevel).not.toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Unknown URL override: wf.logLesel=debug'),
		);
	});

	it('does not warn for valid keys', () => {
		applyUrlOverrides(editorStore, debugStore, { debug: 'true', theme: 'midnight' });
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('silently ignores unknown feature flag keys', () => {
		const result = applyUrlOverrides(editorStore, debugStore, { 'ff.nonexistent': 'true' });
		expect(result.ok).toBe(true);
		expect(editorStore.setFeature).not.toHaveBeenCalled();
	});

	it('applies multiple overrides in one call', () => {
		applyUrlOverrides(editorStore, debugStore, {
			debug: 'true',
			logLevel: 'trace',
			theme: 'midnight',
			'ff.settings': 'false',
		});
		expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
		expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');
		expect(editorStore.setTheme).toHaveBeenCalledWith('midnight');
		expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);
	});

	it('applies appName override to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { appName: 'MyRPG' });
		expect(editorStore.setAppName).toHaveBeenCalledWith('MyRPG');
	});

	it('applies userName override to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { userName: 'Alice' });
		expect(editorStore.setUserName).toHaveBeenCalledWith('Alice');
	});

	it('applies userEmail override to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { userEmail: 'alice@example.com' });
		expect(editorStore.setUserEmail).toHaveBeenCalledWith('alice@example.com');
	});

	it('applies userAvatar override to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { userAvatar: 'https://example.com/avatar.png' });
		expect(editorStore.setUserAvatar).toHaveBeenCalledWith('https://example.com/avatar.png');
	});

	it('applies mockDataDelay as number to editor store', () => {
		applyUrlOverrides(editorStore, debugStore, { mockDataDelay: '2000' });
		expect(editorStore.setMockDataDelay).toHaveBeenCalledWith(2000);
	});

	it('applies mockDataDelay=0 for non-numeric string', () => {
		applyUrlOverrides(editorStore, debugStore, { mockDataDelay: 'abc' });
		expect(editorStore.setMockDataDelay).toHaveBeenCalledWith(0);
	});
});
