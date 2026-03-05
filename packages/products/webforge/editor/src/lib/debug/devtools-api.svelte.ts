/**
 * Devtools Window Global API
 *
 * Registers `window.__EDITOR_DEVTOOLS__` when debug mode is enabled.
 * Provides state inspection, mutation, and an extension registry.
 *
 * Auto-discovers state fields — `.state` returns `$state.snapshot()` on each
 * access, so new schema fields appear automatically.
 *
 * @module
 */

import type { Str, Bool, Void } from '@/schemas/common';
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

// =============================================================================
// Constants
// =============================================================================

/** The window global key for the devtools API. */
export const DEVTOOLS_KEY: Str = '__EDITOR_DEVTOOLS__';

/** App version exposed via devtools. */
const VERSION: Str = '0.1.0';

// =============================================================================
// Types
// =============================================================================

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
	/** Devtools API version. */
	readonly version: Str;
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
 * // window.__EDITOR_DEVTOOLS__ is now available
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
			// eslint-disable-next-line no-console -- Intentional devtools output
			console.log('%c Editor State %c', styles.storeBadge, styles.reset);
			for (const [key, val] of Object.entries(snapshot.app)) {
				// eslint-disable-next-line no-console -- Intentional devtools output
				console.log(`  %capp.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
			}
			for (const [key, val] of Object.entries(snapshot.features)) {
				// eslint-disable-next-line no-console -- Intentional devtools output
				console.log(`  %cfeatures.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
			}
			for (const [key, val] of Object.entries(snapshot.debug)) {
				// eslint-disable-next-line no-console -- Intentional devtools output
				console.log(`  %cdebug.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
			}
		},

		logFeatures(): Void {
			// eslint-disable-next-line no-console -- Intentional devtools output
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

		get version(): Str {
			return VERSION;
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
