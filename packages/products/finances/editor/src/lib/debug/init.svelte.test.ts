import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, Str, Void } from '@/schemas/common';
import { activateDebugServices, syncDebugServices, type DebugServicesHandle } from './init.svelte';
import { DEVTOOLS_KEY } from './devtools-api.svelte';
import { APP_NAME } from '$lib/config/app-meta';

// Mock the sub-modules to avoid $effect calls in state-logger
vi.mock('./state-logger.svelte', () => ({
	createStateLogger: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock('./devtools-api.svelte', async () => {
	const { APP_NAME: appName } = await import('$lib/config/app-meta');
	const key: Str = `__${appName.toUpperCase()}_DEVTOOLS__`;
	return {
		DEVTOOLS_KEY: key,
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
		subscriptionPlan: 'pro' as 'free' | 'starter' | 'pro' | 'enterprise',
		mockDataDelay: 0,
	},
	features: {
		showCharts: true,
		showInflation: true,
		showProjections: true,
		showNetPosition: true,
		settings: true,
		themeSelection: true,
		languageSelection: true,
		modeToggle: true,
		sidebar: true,
		resizableSidebar: true,
		breadcrumb: true,
		sidebarToggle: true,
		sidebarHelp: true,
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

const createMockDebugStore = (enabled: Bool) => ({
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
	(window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

afterEach(() => {
	consoleSpy.mockRestore();
	(window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = undefined;
});

describe('activateDebugServices', () => {
	it('registers devtools window global', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeDefined();
		handle.destroy();
	});

	it('logs welcome banner on activation', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		// Welcome banner header includes the app name in the format string
		const { calls } = consoleSpy.mock;
		const hasWelcome: Bool = calls.some(
			(args: unknown[]) => typeof args[0] === 'string' && args[0].includes(`[${APP_NAME}]`),
		);
		expect(hasWelcome).toBe(true);
		handle.destroy();
	});

	it('destroy removes devtools and logs deactivation', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

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
		const result = syncDebugServices(editorStore, debugStore, null);

		expect(result).toBeNull();
		expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeUndefined();
	});

	it('activates when debug is enabled and no handle', () => {
		const debugStore = createMockDebugStore(true);
		const result = syncDebugServices(editorStore, debugStore, null);

		expect(result).not.toBeNull();
		expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeDefined();
		result?.destroy();
	});

	it('deactivates when debug is disabled and handle exists', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		const disabledStore = createMockDebugStore(false);
		const result = syncDebugServices(editorStore, disabledStore, handle);

		expect(result).toBeNull();
		expect((window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY]).toBeUndefined();
	});

	it('returns existing handle when debug is enabled and handle exists', () => {
		const debugStore = createMockDebugStore(true);
		const handle: DebugServicesHandle = activateDebugServices(editorStore, debugStore);

		const result = syncDebugServices(editorStore, debugStore, handle);

		expect(result).toBe(handle);
		handle.destroy();
	});
});
