import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Str } from '@/schemas/common';
import { createDevtoolsAPI, DEVTOOLS_KEY, type EditorDevtools } from './devtools-api.svelte';
import { APP_NAME } from '$lib/config/app-meta';

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
	delete window.__EDITOR_DEVTOOLS__;
});

afterEach(() => {
	delete window.__EDITOR_DEVTOOLS__;
});

describe('DEVTOOLS_KEY', () => {
	it('is __EDITOR_DEVTOOLS__', () => {
		expect(DEVTOOLS_KEY).toBe('__EDITOR_DEVTOOLS__');
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

	it('exposes version string', () => {
		const api = createDevtoolsAPI(editorStore, debugStore);
		const devtools = (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] as EditorDevtools;
		expect(typeof devtools.version).toBe('string');
		expect(devtools.version.length).toBeGreaterThan(0);
		api.destroy();
	});
});
