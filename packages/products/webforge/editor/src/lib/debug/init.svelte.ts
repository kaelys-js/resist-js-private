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

// TODO: Can localize everything?

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

// ── Badge styles (inline — each section has a unique color) ───────────
const BADGE_STATE =
	'background:#1a3a4a;color:#8cf;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_FLAGS =
	'background:#1a3a2a;color:#8f8;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_OVERRIDES =
	'background:#3a3a1a;color:#fc8;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_API =
	'background:#2a1a3a;color:#c8f;padding:1px 6px;border-radius:3px;font-weight:bold';

/**
 * Builds a single formatted log string from key-value pairs.
 * All pairs are joined with newlines so the browser renders one console entry.
 *
 * @param entries - Array of `[key, value]` pairs
 * @param pad - Padding width for the key column
 * @returns Tuple of `[formatString, ...styleArgs]` for `console.log`
 */
function buildKVBlock(entries: Array<[string, string]>, pad = 14): [string, ...string[]] {
	const parts: string[] = [];
	const styleArgs: string[] = [];
	for (const [key, value] of entries) {
		parts.push(`  %c${key.padEnd(pad)}%c ${value}`);
		styleArgs.push(styles.keyLabel, styles.valueText);
	}
	return [parts.join('\n'), ...styleArgs];
}

function logWelcomeBanner(editorStore: EditorStore, debugStore: DebugStore): void {
	const globalName = `window.${DEVTOOLS_KEY}`;
	const { logLevel } = debugStore.debug;
	const { app, features } = editorStore;
	const overrides: Record<string, string> = debugStore.urlOverrides;
	const overrideKeys: string[] = Object.keys(overrides);

	/* eslint-disable no-console -- Intentional welcome banner output */

	// ── Header ────────────────────────────────────────────────────
	console.log(
		'%c[Debug] %c%s — debug mode enabled', // T
		'color:#8cf;font-weight:bold',
		'color:#aaa',
		app.appName,
	);

	// ── Current State (teal badge) ────────────────────────────────
	console.groupCollapsed('%c Current State ', BADGE_STATE); // T
	const stateBlock = buildKVBlock([
		['theme', app.theme || '(system default)'],
		['mode', app.mode],
		['locale', app.locale],
		['sidebarOpen', String(app.sidebarOpen)],
		['logLevel', logLevel],
	]);
	console.log(...stateBlock);
	console.groupEnd();

	// ── Feature Flags (green badge) ───────────────────────────────
	console.groupCollapsed('%c Feature Flags ', BADGE_FLAGS); // T
	const flagEntries: Array<[string, string]> = Object.entries(features).map(([key, val]) => [
		key,
		String(val),
	]);
	const flagsBlock = buildKVBlock(flagEntries, 20);
	console.log(...flagsBlock);
	console.groupEnd();

	// ── URL Overrides (amber badge) ───────────────────────────────
	if (overrideKeys.length > 0) {
		const validKeys: string[] = [];
		const unknownKeys: string[] = [];
		for (const key of overrideKeys) {
			if (isRecognizedOverrideKey(key)) {
				validKeys.push(key);
			} else {
				unknownKeys.push(key);
			}
		}

		const suffix = `${validKeys.length} applied${unknownKeys.length > 0 ? `, ${unknownKeys.length} unknown` : ''}`;
		console.groupCollapsed(`%c URL Overrides %c ${suffix}`, BADGE_OVERRIDES, 'color:#aaa');
		if (validKeys.length > 0) {
			const validEntries: Array<[string, string]> = validKeys.map((key) => [
				`wf.${key}`,
				overrides[key] ?? '',
			]);
			const validBlock = buildKVBlock(validEntries, 20);
			console.log(...validBlock);
		}
		for (const key of unknownKeys) {
			console.warn(`  ✗ wf.${key} = ${overrides[key]}  (unknown — ignored)`);
		}
		console.groupEnd();
	}

	// ── Devtools API (purple badge) ───────────────────────────────
	console.groupCollapsed(`%c Devtools API %c ${globalName}`, BADGE_API, 'color:#aaa');
	const apiBlock = buildKVBlock(
		[
			['.state', 'Full state snapshot (app, features, debug)'],
			['.set(path, value)', 'Generic setter — e.g. .set("app.theme", "midnight")'],
			['.setTheme(t)', 'Change editor theme'],
			['.setMode(m)', 'Set color mode (light / dark / system)'],
			['.setLocale(l)', 'Set locale (en, ja, zh, ko, fr, de, es)'],
			['.setSidebarOpen(b)', 'Toggle sidebar (true / false)'],
			['.setFeature(f, b)', 'Toggle feature flag'],
			['.setLogLevel(l)', 'Set log level (trace / debug / info / warn / error)'],
			['.enable() / .disable()', 'Toggle debug mode on/off'],
			['.logState()', 'Pretty-print full state to console'],
			['.logFeatures()', 'Print feature flags as console table'],
			['.register(ns, api)', 'Add custom extension namespace'],
		],
		22,
	);
	console.log(...apiBlock);
	console.log(
		'  %cURL params%c ?wf.debug=true&wf.theme=midnight&wf.logLevel=debug&wf.ff.settings=false',
		styles.keyLabel,
		styles.valueText,
	);
	console.groupEnd();

	// ── State Logger Hint ──────────────────────────────────────────
	if (logLevel !== 'trace' && logLevel !== 'debug') {
		console.log(
			'%c[Tip] %cState change logging requires logLevel "debug" or "trace". Currently: "%s". Set via: %s.setLogLevel("debug")',
			'color:#fa0;font-weight:bold',
			'color:#aaa',
			logLevel,
			globalName,
		);
	} else {
		console.log(
			'%c[Logger] %cState change logging active — store mutations will be logged below',
			'color:#4f4;font-weight:bold',
			'color:#aaa',
		);
	}

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
