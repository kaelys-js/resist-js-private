import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { activateDebugServices, syncDebugServices, type DebugServicesHandle } from './init.svelte';
import { DEVTOOLS_KEY } from './devtools-api.svelte';

// Mock the sub-modules to avoid $effect calls in state-logger
vi.mock('./state-logger.svelte', () => ({
	createStateLogger: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock('./devtools-api.svelte', () => ({
	DEVTOOLS_KEY: '__EDITOR_DEVTOOLS__',
	createDevtoolsAPI: vi.fn((): { destroy(): void } => {
		(window as unknown as Record<string, unknown>).__EDITOR_DEVTOOLS__ = { stub: true };
		return {
			destroy(): void {
				Object.defineProperty(window, '__EDITOR_DEVTOOLS__', {
					value: undefined,
					writable: true,
					configurable: true,
				});
			},
		};
	}),
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

const createMockDebugStore = (enabled: boolean) => ({
	debug: { enabled, logLevel: 'info' as const },
	urlOverrides: {},
	setEnabled: vi.fn(okVoid),
	setLogLevel: vi.fn(okVoid),
});

let editorStore: ReturnType<typeof createMockEditorStore>;
let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	editorStore = createMockEditorStore();
	consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
	delete window.__EDITOR_DEVTOOLS__;
});

afterEach(() => {
	consoleSpy.mockRestore();
	delete window.__EDITOR_DEVTOOLS__;
});

describe('activateDebugServices', () => {
	it('registers devtools window global', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		expect((window as unknown as Record<string, unknown>)[DEVTOOLS_KEY]).toBeDefined();
		handle.destroy();
	});

	it('logs welcome banner on activation', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		// Welcome banner includes the app name as a %s substitution arg
		const { calls } = consoleSpy.mock;
		const hasWelcome: boolean = calls.some(
			(args: unknown[]) =>
				typeof args[0] === 'string' &&
				args[0].includes('[Debug]') &&
				args.some((arg: unknown) => arg === 'WebForge'),
		);
		expect(hasWelcome).toBe(true);
		handle.destroy();
	});

	it('destroy removes devtools and logs deactivation', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		handle.destroy();

		expect((window as unknown as Record<string, unknown>)[DEVTOOLS_KEY]).toBeUndefined();
		expect(consoleSpy).toHaveBeenCalledWith(
			'%c DEBUG %c Debug mode disabled',
			expect.any(String),
			expect.any(String),
		);
	});
});

describe('syncDebugServices', () => {
	it('returns null when debug is disabled and no handle', () => {
		const debugStore = createMockDebugStore(false);
		const result = syncDebugServices(editorStore, debugStore, null);

		expect(result).toBeNull();
		expect((window as unknown as Record<string, unknown>)[DEVTOOLS_KEY]).toBeUndefined();
	});

	it('activates when debug is enabled and no handle', () => {
		const debugStore = createMockDebugStore(true);
		const result = syncDebugServices(editorStore, debugStore, null);

		expect(result).not.toBeNull();
		expect((window as unknown as Record<string, unknown>)[DEVTOOLS_KEY]).toBeDefined();
		result?.destroy();
	});

	it('deactivates when debug is disabled and handle exists', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		const disabledStore = createMockDebugStore(false);
		const result = syncDebugServices(editorStore, disabledStore, handle);

		expect(result).toBeNull();
		expect((window as unknown as Record<string, unknown>)[DEVTOOLS_KEY]).toBeUndefined();
	});

	it('returns existing handle when debug is enabled and handle exists', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		const result = syncDebugServices(editorStore, debugStore, handle);

		expect(result).toBe(handle);
		handle.destroy();
	});
});
