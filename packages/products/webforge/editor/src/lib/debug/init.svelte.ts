/**
 * Debug Service Orchestrator
 *
 * Single entry point that conditionally starts/stops all debug services
 * based on `debugStore.debug.enabled`. Call once in `+layout.svelte`
 * after both stores are initialized.
 *
 * When `debug.enabled` transitions:
 *   - `false → true`:  create state logger + register window global devtools API
 *   - `true → false`:  destroy state logger + remove window global
 *
 * @module
 */

import { styles } from '$lib/debug/console-styles';
import { createStateLogger } from '$lib/debug/state-logger.svelte';
import { createDevtoolsAPI, DEVTOOLS_KEY } from '$lib/debug/devtools-api.svelte';
import { isValidAppKey, isValidFeatureFlag } from '$lib/utils/url-params';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';

// =============================================================================
// Types
// =============================================================================

/** Handle returned by `activateDebugServices` for cleanup. */
export type DebugServicesHandle = {
	/** Destroys all active debug services. */
	destroy(): void;
};

// =============================================================================
// Activation / Deactivation
// =============================================================================

/**
 * Activates debug services — creates state logger and devtools API.
 * Returns a handle to destroy all services.
 *
 * @param editorStore - The editor state store
 * @param debugStore - The debug state store
 * @returns Handle with `destroy()` method
 *
 * @example
 * ```typescript
 * const handle = activateDebugServices(editorStore, debugStore);
 * // window.__EDITOR_DEVTOOLS__ is now available
 * handle.destroy(); // removes everything
 * ```
 */
export function activateDebugServices(
	editorStore: EditorStore,
	debugStore: DebugStore,
): DebugServicesHandle {
	const loggerCleanup = createStateLogger(editorStore, debugStore);
	const devtoolsCleanup = createDevtoolsAPI(editorStore, debugStore);

	logWelcomeBanner(editorStore, debugStore);

	return {
		destroy(): void {
			loggerCleanup.destroy();
			devtoolsCleanup.destroy();

			// eslint-disable-next-line no-console -- Intentional debug deactivation log
			console.log('%c DEBUG %c Debug mode disabled', styles.debugBadge, styles.reset);
		},
	};
}

// =============================================================================
// Welcome Banner
// =============================================================================

/** Feature flag override prefix within wf.* params. */
const FF_PREFIX = 'ff.';

/**
 * Checks whether a URL override key is recognized by the system.
 * Recognized keys: `debug`, `logLevel`, valid app preference keys, `ff.<validFlag>`.
 *
 * @param key - Unprefixed override key (e.g., 'debug', 'theme', 'ff.settings')
 * @returns True if the key maps to a known store setter
 */
function isRecognizedOverrideKey(key: string): boolean {
	if (key === 'debug' || key === 'logLevel') return true;
	if (key.startsWith(FF_PREFIX)) {
		return isValidFeatureFlag(key.slice(FF_PREFIX.length));
	}
	return isValidAppKey(key);
}

/**
 * Logs a rich welcome banner to the console when debug mode activates.
 * Shows app info, current state summary, available commands, and URL param usage.
 *
 * @param editorStore - The editor state store (for current state info)
 * @param debugStore - The debug state store (for log level info)
 */
function logWelcomeBanner(editorStore: EditorStore, debugStore: DebugStore): void {
	const globalName = `window.${DEVTOOLS_KEY}`;
	const { logLevel } = debugStore.debug;
	const { app, features } = editorStore;
	const overrides: Record<string, string> = debugStore.urlOverrides;
	const overrideKeys: string[] = Object.keys(overrides);

	/* eslint-disable no-console -- Intentional welcome banner output */
	console.log(
		`%c 🛠️ ${app.appName} — Debug Mode Enabled %c`,
		'background: #1e293b; color: #38bdf8; font-size: 14px; font-weight: bold; padding: 8px 16px; border-radius: 6px;',
		'',
	);

	// ── Current State ──────────────────────────────────────────────
	console.groupCollapsed('%c Current State', styles.infoBadge);
	console.log(`  theme:       ${app.theme || '(system default)'}`);
	console.log(`  mode:        ${app.mode}`);
	console.log(`  locale:      ${app.locale}`);
	console.log(`  sidebarOpen: ${String(app.sidebarOpen)}`);
	console.log(`  logLevel:    ${logLevel}`);
	console.groupEnd();

	// ── Feature Flags ──────────────────────────────────────────────
	console.groupCollapsed('%c Feature Flags', styles.infoBadge);
	for (const [key, val] of Object.entries(features)) {
		const icon: string = val ? '✅' : '❌';
		console.log(`  ${icon} ${key}`);
	}
	console.groupEnd();

	// ── URL Overrides ──────────────────────────────────────────────
	if (overrideKeys.length > 0) {
		// Partition into recognized vs unknown keys
		const validKeys: string[] = [];
		const unknownKeys: string[] = [];
		for (const key of overrideKeys) {
			if (isRecognizedOverrideKey(key)) {
				validKeys.push(key);
			} else {
				unknownKeys.push(key);
			}
		}

		console.groupCollapsed(
			`%c URL Overrides %c ${validKeys.length} applied${unknownKeys.length > 0 ? `, ${unknownKeys.length} unknown` : ''}`,
			styles.warnBadge,
			styles.reset,
		);
		for (const key of validKeys) {
			console.log(`  ✓ wf.${key} = ${overrides[key]}`);
		}
		for (const key of unknownKeys) {
			console.warn(`  ✗ wf.${key} = ${overrides[key]}  (unknown — ignored)`);
		}
		console.groupEnd();
	}

	// ── Devtools API Help ──────────────────────────────────────────
	console.groupCollapsed(`%c Devtools API %c ${globalName}`, styles.debugBadge, styles.reset);
	console.table({
		'.state': { description: 'Full state snapshot (app, features, debug)' },
		'.set(path, value)': { description: 'Generic setter — e.g. .set("app.theme", "midnight")' },
		'.setTheme(t)': { description: 'Change editor theme' },
		'.setMode(m)': { description: 'Set color mode (light / dark / system)' },
		'.setLocale(l)': { description: 'Set locale (en, ja, zh, ko, fr, de, es)' },
		'.setSidebarOpen(b)': { description: 'Toggle sidebar (true / false)' },
		'.setFeature(f, b)': { description: 'Toggle feature flag' },
		'.setLogLevel(l)': { description: 'Set log level (trace / debug / info / warn / error)' },
		'.enable() / .disable()': { description: 'Toggle debug mode on/off' },
		'.logState()': { description: 'Pretty-print full state to console' },
		'.logFeatures()': { description: 'Print feature flags as console table' },
		'.register(ns, api)': { description: 'Add custom extension namespace' },
	});
	console.log(
		'%c URL params %c ?wf.debug=true&wf.theme=midnight&wf.logLevel=debug&wf.ff.settings=false',
		styles.propPath,
		styles.reset,
	);
	console.groupEnd();

	// ── State Logger Hint ──────────────────────────────────────────
	if (logLevel !== 'trace' && logLevel !== 'debug') {
		console.log(
			'%c Tip %c State change logging requires logLevel "debug" or "trace". Currently: "%s". Set via: %s.setLogLevel("debug")',
			styles.infoBadge,
			styles.reset,
			logLevel,
			globalName,
		);
	} else {
		console.log(
			'%c Logger %c State change logging active — all store mutations will be logged below',
			styles.debugBadge,
			styles.reset,
		);
	}

	console.log('');
	/* eslint-enable no-console */
}

// =============================================================================
// Orchestrator
// =============================================================================

/**
 * Initializes all debug services reactively. Call once in `+layout.svelte`
 * inside a `$effect` block to watch `debug.enabled` for transitions.
 *
 * When called, checks `debugStore.debug.enabled`:
 * - If enabled and no handle exists: activates services
 * - If disabled and handle exists: destroys services
 *
 * @param editorStore - The editor state store
 * @param debugStore - The debug state store
 * @param handle - Current active handle (or null if not active)
 * @returns Updated handle (or null if deactivated)
 *
 * @example
 * ```svelte
 * <script>
 * let debugHandle: DebugServicesHandle | null = null;
 * $effect(() => {
 *   debugHandle = syncDebugServices(store, debugStore, debugHandle);
 * });
 * </script>
 * ```
 */
export function syncDebugServices(
	editorStore: EditorStore,
	debugStore: DebugStore,
	handle: DebugServicesHandle | null,
): DebugServicesHandle | null {
	const { enabled } = debugStore.debug;

	if (enabled && !handle) {
		return activateDebugServices(editorStore, debugStore);
	}
	if (!enabled && handle) {
		handle.destroy();
		return null;
	}
	return handle;
}
