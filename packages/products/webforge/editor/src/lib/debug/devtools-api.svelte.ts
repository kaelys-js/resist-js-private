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

import { styles } from '$lib/debug/console-styles';
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
export const DEVTOOLS_KEY = '__EDITOR_DEVTOOLS__';

/** App version exposed via devtools. */
const VERSION = '0.1.0';

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
	set(path: string, value: unknown): void;

	/** Set the active theme. */
	setTheme(theme: string): void;
	/** Set the color mode. */
	setMode(mode: string): void;
	/** Set the active locale. */
	setLocale(locale: string): void;
	/** Set whether the sidebar is open. */
	setSidebarOpen(open: boolean): void;
	/** Toggle a feature flag. */
	setFeature(flag: string, enabled: boolean): void;
	/** Set the log level. */
	setLogLevel(level: string): void;

	/** Enable debug mode. */
	enable(): void;
	/** Disable debug mode. */
	disable(): void;

	/** Pretty-print full state to console. */
	logState(): void;
	/** Pretty-print feature flags as a console table. */
	logFeatures(): void;

	/**
	 * Register a custom namespace on the devtools API.
	 *
	 * @param namespace - Name for the extension (e.g., 'scene', 'audio')
	 * @param api - Object with methods/properties to expose
	 */
	register(namespace: string, api: Record<string, unknown>): void;

	/**
	 * Remove a previously registered namespace.
	 *
	 * @param namespace - Name of the extension to remove
	 */
	unregister(namespace: string): void;

	/** Current app name from editor state. */
	readonly appName: string;
	/** Devtools API version. */
	readonly version: string;
};

// =============================================================================
// Setter Maps (auto-discovered from schemas)
// =============================================================================

/** Map of app preference keys to their setter method names on EditorStore. */
const APP_SETTER_MAP: Record<string, string> = {};
for (const key of Object.keys(AppPreferencesSchema.entries)) {
	const capitalized: string = key.charAt(0).toUpperCase() + key.slice(1);
	APP_SETTER_MAP[key] = `set${capitalized}`;
}

/** Set of valid feature flag keys, derived from schema. */
const FEATURE_KEYS = new Set<string>(Object.keys(FeatureFlagsSchema.entries));

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
): { destroy(): void } {
	const extensions = new Map<string, Record<string, unknown>>();

	const devtools: EditorDevtools = {
		get state() {
			return {
				app: { ...editorStore.app },
				features: { ...editorStore.features },
				debug: { ...debugStore.debug },
			};
		},

		set(path: string, value: unknown): void {
			const [section, key] = path.split('.');
			if (!section || !key) return;

			if (section === 'app') {
				const setterName: string | undefined = APP_SETTER_MAP[key];
				if (setterName) {
					const setter = (editorStore as Record<string, unknown>)[setterName];
					if (typeof setter === 'function') {
						(setter as (v: unknown) => void)(value);
					}
				}
			} else if (section === 'features') {
				if (FEATURE_KEYS.has(key)) {
					editorStore.setFeature(key, value as boolean);
				}
			} else if (section === 'debug') {
				if (key === 'enabled') {
					debugStore.setEnabled(value as boolean);
				} else if (key === 'logLevel') {
					debugStore.setLogLevel(value as string);
				}
			}
		},

		setTheme(theme: string): void {
			editorStore.setTheme(theme);
		},
		setMode(mode: string): void {
			editorStore.setMode(mode);
		},
		setLocale(locale: string): void {
			editorStore.setLocale(locale);
		},
		setSidebarOpen(open: boolean): void {
			editorStore.setSidebarOpen(open);
		},
		setFeature(flag: string, enabled: boolean): void {
			editorStore.setFeature(flag, enabled);
		},
		setLogLevel(level: string): void {
			debugStore.setLogLevel(level);
		},

		enable(): void {
			debugStore.setEnabled(true);
		},
		disable(): void {
			debugStore.setEnabled(false);
		},

		logState(): void {
			const snapshot = devtools.state;
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

		logFeatures(): void {
			// eslint-disable-next-line no-console -- Intentional devtools output
			console.table(devtools.state.features);
		},

		register(namespace: string, api: Record<string, unknown>): void {
			extensions.set(namespace, api);
			Object.defineProperty(devtools, namespace, {
				value: api,
				configurable: true,
				enumerable: true,
			});
		},

		unregister(namespace: string): void {
			extensions.delete(namespace);
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Intentional extension cleanup
			delete (devtools as Record<string, unknown>)[namespace];
		},

		get appName(): string {
			return editorStore.app.appName;
		},

		get version(): string {
			return VERSION;
		},
	};

	// Register on window
	(window as unknown as Record<string, unknown>)[DEVTOOLS_KEY] = devtools;

	return {
		destroy(): void {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Intentional global cleanup
			delete (window as unknown as Record<string, unknown>)[DEVTOOLS_KEY];
		},
	};
}
