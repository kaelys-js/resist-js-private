/**
 * Devtools Window Global API
 *
 * Registers `window.__STORYLYNE_DEVTOOLS__` when debug mode is enabled.
 * Provides state inspection, mutation, and an extension registry.
 *
 * Auto-discovers state fields — `.state` returns `$state.snapshot()` on each
 * access, so new schema fields appear automatically.
 *
 * @module
 */

import type { Str, Num, Bool, Void } from '@/schemas/common';
import { styles } from '$lib/debug/console-styles';
import { createWatcher, type WatcherCleanup } from '$lib/debug/state-logger.svelte';
import {
	AppPreferencesSchema,
	FeatureFlagsSchema,
	type AppPreferences,
	type FeatureFlags,
} from '$lib/schemas/editor-state';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';
import type { DebugState } from '$lib/schemas/debug-state';
import { APP_NAME } from '$lib/config/app-meta';
import { getBuildInfo } from '$lib/config/build-info';
import type { BuildInfo } from '$lib/schemas/build-info';
import {
	discoverAppPreferences,
	discoverFeatureFlags,
	generateDebugUrl,
} from '$lib/debug/dev-toolbar-registry';
import { goto } from '$app/navigation';
import { getVitalsPanelMetrics, type PanelMetric } from '$lib/perf/vitals-panel-store.svelte';
import { getBeaconStatus } from '$lib/perf/vitals-beacon';
import { getConnectionSnapshot, type ConnectionSnapshot } from '$lib/perf/connection.svelte';

// =============================================================================
// Constants
// =============================================================================

/** The window global key for the devtools API, derived from APP_NAME. */
export const DEVTOOLS_KEY: Str = `__${APP_NAME.toUpperCase()}_DEVTOOLS__`;

// =============================================================================
// Types
// =============================================================================

/** Beacon status snapshot returned by `perf.beacon()`. */
export type BeaconStatus = {
	/** Number of metrics currently queued. */
	readonly queued: Num;
	/** Summary of each queued metric. */
	readonly queuedItems: ReadonlyArray<{ name: Str; value: Num; rating: Str }>;
	/** ISO timestamp of last successful flush, or `null` if never flushed. */
	readonly lastFlushAt: Str | null;
	/** Random UUID for the current page session (not persisted). */
	readonly sessionId: Str;
	/** Maximum metrics before auto-flush. */
	readonly maxQueueSize: Num;
};

/**
 * Performance namespace on the devtools API.
 * Exposes Web Vitals, beacon queue, and device/connection data.
 */
export type DevtoolsPerf = {
	/** Returns the current list of collected Web Vitals metrics. */
	vitals(): PanelMetric[];
	/** Returns the beacon queue status (queued count, session ID, last sent). */
	beacon(): BeaconStatus;
	/** Returns a snapshot of device and connection info. */
	device(): ConnectionSnapshot;
	/** Pretty-prints current Web Vitals to the console. */
	logVitals(): Void;
	/** Pretty-prints device and connection info to the console. */
	logDevice(): Void;
};

/**
 * The devtools API surface exposed on the window object.
 * Provides state inspection, mutation, and extensibility.
 */
export type EditorDevtools = {
	/** Live state snapshot — returns fresh copy on each access. */
	readonly state: {
		readonly app: AppPreferences;
		readonly features: FeatureFlags;
		readonly debug: DebugState;
	};

	/**
	 * Generic setter for any state path.
	 * Validates against schemas and calls the appropriate store setter.
	 *
	 * @param path - Dot-separated path (e.g., 'app.theme', 'features.settings', 'debug.logLevel')
	 * @param value - Value to set
	 */
	set(path: Str, value: unknown): Void;

	/** Set the active theme. */
	setTheme(theme: Str): Void;
	/** Set the color mode. */
	setMode(mode: Str): Void;
	/** Set the active locale. */
	setLocale(locale: Str): Void;
	/** Set whether the sidebar is open. */
	setSidebarOpen(open: Bool): Void;
	/** Toggle a feature flag. */
	setFeature(flag: Str, enabled: Bool): Void;
	/** Set the log level. */
	setLogLevel(level: Str): Void;

	/** Enable debug mode. */
	enable(): Void;
	/** Disable debug mode. */
	disable(): Void;

	/** Pretty-print full state to console. */
	logState(): Void;
	/** Pretty-print feature flags as a console table. */
	logFeatures(): Void;

	/**
	 * Register a reactive state watcher for change tracking.
	 * The getter is called inside a Svelte `$effect` — any reactive reads
	 * inside it will trigger re-evaluation and diff logging.
	 *
	 * @param name - Section name shown in console output (e.g., 'sidebar')
	 * @param getter - Function that returns a plain snapshot of reactive state
	 */
	registerWatcher(name: Str, getter: () => Record<Str, unknown>): Void;

	/**
	 * Remove a previously registered watcher by name.
	 *
	 * @param name - Section name used in `registerWatcher`
	 */
	unregisterWatcher(name: Str): Void;

	/**
	 * Register a custom namespace on the devtools API.
	 *
	 * @param namespace - Name for the extension (e.g., 'scene', 'audio')
	 * @param api - Object with methods/properties to expose
	 */
	register(namespace: Str, api: Record<Str, unknown>): Void;

	/**
	 * Remove a previously registered namespace.
	 *
	 * @param namespace - Name of the extension to remove
	 */
	unregister(namespace: Str): Void;

	/** Current app name from editor state. */
	readonly appName: Str;
	/** Build-time metadata (version, commit, branch, etc.). */
	readonly buildInfo: BuildInfo | null;

	/** Performance namespace — Web Vitals, beacon queue, and device/connection data. */
	readonly perf: DevtoolsPerf;

	/** Reset app preferences to their schema defaults. */
	resetToDefaults(): Void;
	/** Reset all state (app prefs + feature flags + debug) to defaults. */
	resetAllToDefaults(): Void;
	/** Copy a shareable debug URL to the clipboard. */
	copyDebugUrl(): Promise<Void>;

	/** Simulate login (removes ?wf.auth param). */
	login(): Void;
	/** Simulate logout (sets ?wf.auth=false). */
	logout(): Void;

	/** Print a formatted reference of all available API methods. */
	help(): Void;

	/** Returns a human-readable description for console display. */
	toString(): Str;
	/** Custom tag for Object.prototype.toString — shows `[object Storylyne Devtools]`. */
	readonly [Symbol.toStringTag]: Str;
};

// =============================================================================
// Setter Maps (auto-discovered from schemas)
// =============================================================================

/** Map of app preference keys to their setter method names on EditorStore. */
const APP_SETTER_MAP: Record<Str, Str> = {};
for (const key of Object.keys(AppPreferencesSchema.entries)) {
	const capitalized: Str = key.charAt(0).toUpperCase() + key.slice(1);
	APP_SETTER_MAP[key] = `set${capitalized}`;
}

/** Set of valid feature flag keys, derived from schema. */
const FEATURE_KEYS: Set<Str> = new Set<Str>(Object.keys(FeatureFlagsSchema.entries));

// =============================================================================
// Build info (cached at module level)
// =============================================================================

const buildInfoResult = getBuildInfo();
/** Cached build info — null if validation fails. */
const BUILD_INFO: BuildInfo | null = buildInfoResult.ok ? buildInfoResult.data : null;

// =============================================================================
// Help badge styles
// =============================================================================

const HELP_HEADER =
	'background:#2a1a3a;color:#c8f;padding:2px 8px;border-radius:3px;font-weight:bold;font-size:13px';
const HELP_SECTION = 'color:#8cf;font-weight:bold;font-size:11px;margin-top:4px';
const HELP_METHOD = 'color:#ccc;font-family:monospace;font-size:11px';
const HELP_DESC = 'color:#888;font-size:11px';

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates and registers the devtools API on the window object.
 *
 * @param editorStore - The editor state store
 * @param debugStore - The debug state store
 * @returns Object with `destroy()` method to unregister the global
 *
 * @example
 * ```typescript
 * const api = createDevtoolsAPI(editorStore, debugStore);
 * // window.__STORYLYNE_DEVTOOLS__ is now available
 * api.destroy(); // removes it
 * ```
 */
export function createDevtoolsAPI(
	editorStore: EditorStore,
	debugStore: DebugStore,
): { destroy(): Void } {
	const extensions: Map<Str, Record<Str, unknown>> = new Map<Str, Record<Str, unknown>>();
	const watchers: Map<Str, WatcherCleanup> = new Map<Str, WatcherCleanup>();

	const devtools: EditorDevtools = {
		get state() {
			return {
				app: { ...editorStore.app },
				features: { ...editorStore.features },
				debug: { ...debugStore.debug },
			};
		},

		set(path: Str, value: unknown): Void {
			const [section, key] = path.split('.');
			if (!section || !key) return;

			if (section === 'app') {
				const setterName: Str | undefined = APP_SETTER_MAP[key];
				if (setterName) {
					// Dynamic setter access — store type doesn't expose string-indexed setters
					const setter = (editorStore as Record<Str, unknown>)[setterName];
					if (typeof setter === 'function') {
						(setter as (v: unknown) => Void)(value);
					}
				}
			} else if (section === 'features') {
				if (FEATURE_KEYS.has(key)) {
					// Value must be boolean for feature flags
					editorStore.setFeature(key, value as Bool);
				}
			} else if (section === 'debug') {
				if (key === 'enabled') {
					debugStore.setEnabled(value as Bool);
				} else if (key === 'logLevel') {
					debugStore.setLogLevel(value as Str);
				}
			}
		},

		setTheme(theme: Str): Void {
			editorStore.setTheme(theme);
		},
		setMode(mode: Str): Void {
			editorStore.setMode(mode);
		},
		setLocale(locale: Str): Void {
			editorStore.setLocale(locale);
		},
		setSidebarOpen(open: Bool): Void {
			editorStore.setSidebarOpen(open);
		},
		setFeature(flag: Str, enabled: Bool): Void {
			editorStore.setFeature(flag, enabled);
		},
		setLogLevel(level: Str): Void {
			debugStore.setLogLevel(level);
		},

		enable(): Void {
			debugStore.setEnabled(true);
		},
		disable(): Void {
			debugStore.setEnabled(false);
		},

		logState(): Void {
			const snapshot: EditorDevtools['state'] = devtools.state;
			console.log('%c Editor State %c', styles.storeBadge, styles.reset);
			for (const [key, val] of Object.entries(snapshot.app)) {
				console.log(`  %capp.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
			}
			for (const [key, val] of Object.entries(snapshot.features)) {
				console.log(`  %cfeatures.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
			}
			for (const [key, val] of Object.entries(snapshot.debug)) {
				console.log(`  %cdebug.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
			}
		},

		logFeatures(): Void {
			console.table(devtools.state.features);
		},

		registerWatcher(name: Str, getter: () => Record<Str, unknown>): Void {
			// Unregister existing watcher with same name to avoid duplicates
			const existing: WatcherCleanup | undefined = watchers.get(name);
			if (existing) existing();
			watchers.set(name, createWatcher(name, getter, debugStore));
		},

		unregisterWatcher(name: Str): Void {
			const cleanup: WatcherCleanup | undefined = watchers.get(name);
			if (cleanup) {
				cleanup();
				watchers.delete(name);
			}
		},

		register(namespace: Str, api: Record<Str, unknown>): Void {
			extensions.set(namespace, api);
			Object.defineProperty(devtools, namespace, {
				value: api,
				configurable: true,
				enumerable: true,
			});
		},

		unregister(namespace: Str): Void {
			extensions.delete(namespace);
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Intentional extension unregistration
			delete (devtools as Record<Str, unknown>)[namespace];
		},

		get appName(): Str {
			return editorStore.app.appName;
		},

		get buildInfo(): BuildInfo | null {
			return BUILD_INFO;
		},

		perf: {
			vitals(): PanelMetric[] {
				return getVitalsPanelMetrics();
			},

			beacon(): BeaconStatus {
				return getBeaconStatus();
			},

			device(): ConnectionSnapshot {
				return getConnectionSnapshot();
			},

			logVitals(): Void {
				const metrics: PanelMetric[] = getVitalsPanelMetrics();
				if (metrics.length === 0) {
					console.log(
						'%c[Perf] %cNo Web Vitals collected yet',
						'color:#8cf;font-weight:bold',
						'color:#aaa',
					);
					return;
				}
				// eslint-disable-next-line unicorn/no-console-spaces -- Intentional badge padding for %c styled output
				console.log('%c Web Vitals ', HELP_HEADER);
				for (const m of metrics) {
					const isTimingMetric: Bool =
						m.name !== 'CLS' && m.name !== 'navigationTiming' && m.name !== 'networkInformation';
					const formatted: Str = isTimingMetric
						? `${Math.round(m.value)}ms`
						: String(Math.round(m.value * 10_000) / 10_000);
					let ratingColor: Str = 'color:#f44';
					if (m.rating === 'good') ratingColor = 'color:#4f4';
					else if (m.rating === 'needsImprovement') ratingColor = 'color:#fa0';
					console.log(
						`  %c${m.name.padEnd(6)}%c ${formatted.padEnd(10)} %c${m.rating}`,
						'color:#8cf;font-weight:bold',
						'color:#ccc',
						ratingColor,
					);
				}
			},

			logDevice(): Void {
				const snap: ConnectionSnapshot = getConnectionSnapshot();
				// eslint-disable-next-line unicorn/no-console-spaces -- Intentional badge padding for %c styled output
				console.log('%c Device & Connection ', HELP_HEADER);
				const entries: Array<[Str, Str]> = [
					['Quality', snap.quality],
					['Effective Type', snap.effectiveType || '—'],
					['RTT', `${String(snap.rtt)}ms`],
					['Downlink', `${String(snap.downlink)} Mbps`],
					['Data Saver', snap.saveData ? 'Yes' : 'No'],
					['Device Memory', snap.deviceMemory > 0 ? `${String(snap.deviceMemory)} GB` : '—'],
					['CPU Cores', snap.hardwareConcurrency > 0 ? String(snap.hardwareConcurrency) : '—'],
					['Low-End Device', snap.isLowEndDevice ? 'Yes' : 'No'],
					['Low-End Experience', snap.isLowEndExperience ? 'Yes' : 'No'],
				];
				for (const [key, val] of entries) {
					console.log(`  %c${key.padEnd(18)}%c ${val}`, styles.keyLabel, styles.valueText);
				}
			},
		},

		resetToDefaults(): Void {
			const prefs = discoverAppPreferences();
			for (const pref of prefs) {
				const setterName: Str = `set${pref.key.charAt(0).toUpperCase()}${pref.key.slice(1)}`;
				// Dynamic setter access — store type doesn't expose string-indexed setters
				const setter = (editorStore as unknown as Record<Str, (v: unknown) => unknown>)[setterName];
				if (typeof setter === 'function') {
					setter(pref.default);
				}
			}
			console.log(
				'%c[Reset] %cApp preferences reset to defaults',
				'color:#fa0;font-weight:bold',
				'color:#aaa',
			);
		},

		resetAllToDefaults(): Void {
			// Reset app preferences
			devtools.resetToDefaults();

			// Reset feature flags
			const flags = discoverFeatureFlags();
			for (const flag of flags) {
				editorStore.setFeature(flag.key, flag.default);
			}

			// Reset debug log level
			debugStore.setLogLevel('info');

			console.log(
				'%c[Reset] %cAll state reset to defaults (preferences, features, debug)',
				'color:#fa0;font-weight:bold',
				'color:#aaa',
			);
		},

		async copyDebugUrl(): Promise<Void> {
			try {
				const url: Str = generateDebugUrl(editorStore, debugStore);
				await navigator.clipboard.writeText(url);
				console.log('%c[Copied] %c%s', 'color:#4f4;font-weight:bold', 'color:#aaa', url);
			} catch {
				/* clipboard API unavailable — log URL instead */
				const url: Str = generateDebugUrl(editorStore, debugStore);
				console.log('%c[Debug URL] %c%s', 'color:#fa0;font-weight:bold', 'color:#aaa', url);
			}
		},

		login(): Void {
			const url: URL = new URL(window.location.href);
			url.searchParams.delete('wf.auth');
			goto(url.toString(), { invalidateAll: true });
		},

		logout(): Void {
			const url: URL = new URL(window.location.href);
			url.searchParams.set('wf.auth', 'false');
			goto(url.toString(), { invalidateAll: true });
		},

		toString(): Str {
			const version: Str = BUILD_INFO ? BUILD_INFO.version : 'unknown';
			return `[${APP_NAME} Devtools v${version}] — type .help() for API reference`;
		},

		get [Symbol.toStringTag](): Str {
			return `${APP_NAME} Devtools`;
		},

		help(): Void {
			const globalName = `window.${DEVTOOLS_KEY}`;

			// eslint-disable-next-line unicorn/no-console-spaces -- Intentional badge padding for %c styled output
			console.log(`%c ${APP_NAME} Devtools `, HELP_HEADER);
			console.log(`%cAccess via: %c${globalName}`, HELP_DESC, HELP_METHOD);
			console.log('');

			// ── State Inspection
			console.log('%c📋 State Inspection', HELP_SECTION);
			console.log(
				'  %c.state            %c Live snapshot of all state (app, features, debug)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.buildInfo         %c Build metadata (version, commit, branch, dirty)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('  %c.appName           %c Current app display name', HELP_METHOD, HELP_DESC);
			console.log(
				'  %c.logState()        %c Pretty-print full state to console',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.logFeatures()     %c Print feature flags as a table',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('');

			// ── State Mutation
			console.log('%c🔧 State Mutation', HELP_SECTION);
			console.log(
				'  %c.set(path, value)  %c Generic setter — e.g. .set("app.theme", "midnight")',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('  %c.setTheme(t)       %c Change editor theme', HELP_METHOD, HELP_DESC);
			console.log(
				'  %c.setMode(m)        %c Set color mode (light / dark / system)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.setLocale(l)      %c Set locale (en, ja, zh, ko, fr, de, es)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.setSidebarOpen(b)  %c Toggle sidebar (true / false)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('  %c.setFeature(f, b)  %c Toggle feature flag', HELP_METHOD, HELP_DESC);
			console.log(
				'  %c.setLogLevel(l)    %c Set log level (trace / debug / info / warn / error)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('');

			// ── Actions
			console.log('%c⚡ Actions', HELP_SECTION);
			console.log('  %c.enable() / .disable()    %c Toggle debug mode', HELP_METHOD, HELP_DESC);
			console.log(
				'  %c.login() / .logout()      %c Simulate auth state via URL params',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.resetToDefaults()        %c Reset app preferences to schema defaults',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.resetAllToDefaults()     %c Reset all state (prefs + flags + debug)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.copyDebugUrl()           %c Copy shareable debug URL to clipboard',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('');

			// ── Performance
			console.log('%c📊 Performance (.perf)', HELP_SECTION);
			console.log(
				'  %c.perf.vitals()      %c Current Web Vitals (LCP, FCP, CLS, INP, …)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.perf.beacon()      %c Beacon queue status (queued, sessionId, lastSent)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.perf.device()      %c Device & connection info (memory, CPU, network)',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.perf.logVitals()   %c Pretty-print Web Vitals to console',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log(
				'  %c.perf.logDevice()   %c Pretty-print device & connection to console',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('');

			// ── Watchers & Extensions
			console.log('%c🔌 Watchers & Extensions', HELP_SECTION);
			console.log(
				'  %c.registerWatcher(name, fn) %c Watch reactive state changes',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('  %c.unregisterWatcher(name)   %c Remove a watcher', HELP_METHOD, HELP_DESC);
			console.log(
				'  %c.register(ns, api)         %c Add custom extension namespace',
				HELP_METHOD,
				HELP_DESC,
			);
			console.log('  %c.unregister(ns)            %c Remove an extension', HELP_METHOD, HELP_DESC);
			console.log('');

			console.log(
				'  %c.help()                    %c Show this reference again',
				HELP_METHOD,
				HELP_DESC,
			);

			/* eslint-enable no-console */
		},
	};

	// Register on window — cast required for global property assignment
	(window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY] = devtools;

	return {
		destroy(): Void {
			// Clean up all registered watchers
			for (const cleanup of watchers.values()) {
				cleanup();
			}
			watchers.clear();

			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Intentional global cleanup
			delete (window as unknown as Record<Str, unknown>)[DEVTOOLS_KEY];
		},
	};
}
