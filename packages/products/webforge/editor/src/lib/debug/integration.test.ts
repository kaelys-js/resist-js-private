/**
 * Debug system integration tests.
 *
 * Full-flow tests that verify the debug store, URL param parsing,
 * devtools API, and orchestrator work together correctly.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { parseDebugParams, applyUrlOverrides } from '$lib/utils/url-params';
import { createDevtoolsAPI, type EditorDevtools } from './devtools-api.svelte';
import { activateDebugServices, syncDebugServices, type DebugServicesHandle } from './init.svelte';
import { diffSnapshot } from './console-styles';

// Mock state-logger to avoid $effect in tests
vi.mock('./state-logger.svelte', () => ({
	createStateLogger: vi.fn(() => ({ destroy: vi.fn() })),
}));

const okVoid = () => ({ ok: true as const, data: undefined, error: null });

const createMockEditorStore = () => ({
	app: {
		appName: 'WebForge' as const,
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
	},
	features: {
		settings: true,
		themeSelection: true,
		languageSelection: true,
		modeToggle: true,
		sidebar: true,
		sceneList: true,
		assetBrowser: true,
		resizableSidebar: true,
	},
	setAppName: vi.fn(okVoid),
	setTheme: vi.fn(okVoid),
	setMode: vi.fn(okVoid),
	setLocale: vi.fn(okVoid),
	setSidebarOpen: vi.fn(okVoid),
	setFeature: vi.fn(okVoid),
	save: vi.fn(okVoid),
	load: vi.fn(okVoid),
});

const createMockDebugStore = (enabled: boolean, logLevel = 'info') => ({
	debug: {
		enabled,
		logLevel: logLevel as 'trace' | 'debug' | 'info' | 'warn' | 'error',
	},
	urlOverrides: {},
	setEnabled: vi.fn(okVoid),
	setLogLevel: vi.fn(okVoid),
});

let editorStore: ReturnType<typeof createMockEditorStore>;
let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	editorStore = createMockEditorStore();
	consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'table').mockImplementation(() => {});
	vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
	vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
	delete window.__EDITOR_DEVTOOLS__;
});

afterEach(() => {
	vi.restoreAllMocks();
	delete window.__EDITOR_DEVTOOLS__;
});

// ── URL Parsing + Override Application ────────────────────────────────

describe('URL parsing → override application flow', () => {
	it('parses URL params and applies them to stores', () => {
		const url = new URL(
			'http://localhost?wf.debug=true&wf.logLevel=trace&wf.theme=midnight&wf.ff.settings=false',
		);
		const debugStore = createMockDebugStore(false);

		const parseResult = parseDebugParams(url);
		expect(parseResult.ok).toBe(true);
		if (!parseResult.ok) return;

		expect(parseResult.data).toEqual({
			debug: 'true',
			logLevel: 'trace',
			theme: 'midnight',
			'ff.settings': 'false',
		});

		const applyResult = applyUrlOverrides(editorStore, debugStore, parseResult.data);
		expect(applyResult.ok).toBe(true);

		expect(debugStore.setEnabled).toHaveBeenCalledWith(true);
		expect(debugStore.setLogLevel).toHaveBeenCalledWith('trace');
		expect(editorStore.setTheme).toHaveBeenCalledWith('midnight');
		expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);
	});

	it('ignores unknown URL params gracefully', () => {
		const url = new URL('http://localhost?wf.unknown=value&wf.ff.nonexistent=true');
		const debugStore = createMockDebugStore(false);

		const parseResult = parseDebugParams(url);
		expect(parseResult.ok).toBe(true);
		if (!parseResult.ok) return;

		const applyResult = applyUrlOverrides(editorStore, debugStore, parseResult.data);
		expect(applyResult.ok).toBe(true);

		expect(editorStore.setTheme).not.toHaveBeenCalled();
		expect(editorStore.setFeature).not.toHaveBeenCalled();
	});
});

// ── Devtools API Integration ──────────────────────────────────────────

describe('devtools API state inspection', () => {
	it('state reflects current store values', () => {
		const debugStore = createMockDebugStore(true, 'trace');
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		expect(devtools.state.app.theme).toBe('');
		expect(devtools.state.app.locale).toBe('en');
		expect(devtools.state.app.mode).toBe('system');
		expect(devtools.state.features.settings).toBe(true);
		expect(devtools.state.debug.enabled).toBe(true);
		expect(devtools.state.debug.logLevel).toBe('trace');

		api.destroy();
	});

	it('appName and version are accessible', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		expect(devtools.appName).toBe('WebForge');
		expect(typeof devtools.version).toBe('string');

		api.destroy();
	});
});

describe('devtools API mutations', () => {
	it('setTheme calls editor store', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		devtools.setTheme('midnight');
		expect(editorStore.setTheme).toHaveBeenCalledWith('midnight');

		api.destroy();
	});

	it('setFeature calls editor store', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		devtools.setFeature('settings', false);
		expect(editorStore.setFeature).toHaveBeenCalledWith('settings', false);

		api.destroy();
	});

	it('generic set works for app paths', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		devtools.set('app.theme', 'ocean');
		expect(editorStore.setTheme).toHaveBeenCalledWith('ocean');

		api.destroy();
	});

	it('generic set works for feature paths', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		devtools.set('features.sidebar', false);
		expect(editorStore.setFeature).toHaveBeenCalledWith('sidebar', false);

		api.destroy();
	});

	it('generic set works for debug paths', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		devtools.set('debug.logLevel', 'error');
		expect(debugStore.setLogLevel).toHaveBeenCalledWith('error');

		devtools.set('debug.enabled', false);
		expect(debugStore.setEnabled).toHaveBeenCalledWith(false);

		api.destroy();
	});
});

describe('devtools API extension registry', () => {
	it('register makes namespace accessible', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__! as EditorDevtools & Record<string, unknown>;

		devtools.register('test', { ping: () => 'pong' });

		const ext = devtools.test as Record<string, () => string>;
		expect(ext.ping()).toBe('pong');

		api.destroy();
	});

	it('unregister removes namespace', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__! as EditorDevtools & Record<string, unknown>;

		devtools.register('test', { ping: () => 'pong' });
		devtools.unregister('test');

		expect(devtools.test).toBeUndefined();

		api.destroy();
	});
});

describe('devtools API console output', () => {
	it('logState calls console.log', () => {
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		devtools.logState();
		expect(consoleSpy).toHaveBeenCalled();

		api.destroy();
	});

	it('logFeatures calls console.table', () => {
		const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
		const debugStore = createMockDebugStore(true);
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = window.__EDITOR_DEVTOOLS__!;

		devtools.logFeatures();
		expect(tableSpy).toHaveBeenCalled();

		api.destroy();
	});
});

// ── Orchestrator Integration ──────────────────────────────────────────

describe('orchestrator lifecycle', () => {
	it('activate → devtools available → destroy → devtools gone', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		expect(window.__EDITOR_DEVTOOLS__).toBeDefined();

		handle.destroy();

		expect(window.__EDITOR_DEVTOOLS__).toBeUndefined();
	});

	it('syncDebugServices enables and disables correctly', () => {
		const enabledStore = createMockDebugStore(true);
		const disabledStore = createMockDebugStore(false);

		// Start disabled
		let handle: DebugServicesHandle | null = syncDebugServices(editorStore, disabledStore, null);
		expect(handle).toBeNull();
		expect(window.__EDITOR_DEVTOOLS__).toBeUndefined();

		// Enable
		handle = syncDebugServices(editorStore, enabledStore, handle);
		expect(handle).not.toBeNull();
		expect(window.__EDITOR_DEVTOOLS__).toBeDefined();

		// Disable
		handle = syncDebugServices(editorStore, disabledStore, handle);
		expect(handle).toBeNull();
		expect(window.__EDITOR_DEVTOOLS__).toBeUndefined();

		// Re-enable
		handle = syncDebugServices(editorStore, enabledStore, handle);
		expect(handle).not.toBeNull();
		expect(window.__EDITOR_DEVTOOLS__).toBeDefined();

		handle?.destroy();
	});
});

// ── Snapshot Diffing ──────────────────────────────────────────────────

describe('snapshot diffing integration', () => {
	it('detects state changes for logging', () => {
		const before = { theme: '', mode: 'system', locale: 'en' };
		const after = { theme: 'midnight', mode: 'system', locale: 'ja' };

		const diffs = diffSnapshot(before, after);
		expect(diffs).toHaveLength(2);

		const themeChange = diffs.find((d) => d.key === 'theme');
		expect(themeChange?.old).toBe('');
		expect(themeChange?.new).toBe('midnight');

		const localeChange = diffs.find((d) => d.key === 'locale');
		expect(localeChange?.old).toBe('en');
		expect(localeChange?.new).toBe('ja');
	});

	it('returns empty array when nothing changed', () => {
		const state = { theme: 'midnight', mode: 'dark' };
		expect(diffSnapshot(state, { ...state })).toHaveLength(0);
	});
});
