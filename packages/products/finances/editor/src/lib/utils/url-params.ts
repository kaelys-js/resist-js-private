/**
 * URL parameter parsing and override application for the debug system.
 *
 * All debug-related URL params use the app-specific prefix to prevent collisions:
 * - `?fin.debug=true` — enable debug mode
 * - `?fin.logLevel=trace` — set log level
 * - `?fin.theme=midnight` — override editor theme
 * - `?fin.ff.settings=false` — override feature flag
 *
 * @module
 */

import type { Bool, Str, Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { AppPreferencesSchema, FeatureFlagsSchema } from '$lib/schemas/editor-state';
import { URL_PARAM_PREFIX, type UrlOverrides } from '$lib/schemas/debug-state';
import type { EditorStore } from '$lib/stores/editor-state.svelte';

/** Debug store interface expected by applyUrlOverrides. */
type DebugStoreLike = {
	setEnabled(enabled: Bool): Result<Void>;
	setLogLevel(level: Str): Result<Void>;
};

/** Valid app preference keys, derived from schema. */
const APP_KEYS = new Set<string>(Object.keys(AppPreferencesSchema.entries));

/** Valid feature flag keys, derived from schema. */
const FEATURE_FLAG_KEYS = new Set<string>(Object.keys(FeatureFlagsSchema.entries));

/** Feature flag override prefix within app-specific URL params. */
const FF_PREFIX = 'ff.';

/**
 * Checks whether a key is a valid app preference field.
 * Uses schema introspection — automatically includes new fields added to AppPreferencesSchema.
 *
 * @param key - The key to check
 * @returns True if the key exists in AppPreferencesSchema
 *
 * @example
 * ```typescript
 * isValidAppKey('theme'); // true
 * isValidAppKey('unknown'); // false
 * ```
 */
export function isValidAppKey(key: Str): Bool {
	return APP_KEYS.has(key);
}

/**
 * Checks whether a key is a valid feature flag.
 * Uses schema introspection — automatically includes new flags added to FeatureFlagsSchema.
 *
 * @param key - The key to check
 * @returns True if the key exists in FeatureFlagsSchema
 *
 * @example
 * ```typescript
 * isValidFeatureFlag('settings'); // true
 * isValidFeatureFlag('unknown'); // false
 * ```
 */
export function isValidFeatureFlag(key: Str): Bool {
	return FEATURE_FLAG_KEYS.has(key);
}

/**
 * Extracts all app-prefixed parameters from a URL.
 * Returns unprefixed keys mapped to raw string values.
 *
 * @param url - The URL to parse
 * @returns Result containing the extracted overrides map
 *
 * @example
 * ```typescript
 * const result = parseDebugParams(new URL('http://localhost?fin.debug=true&fin.theme=midnight'));
 * // result.data = { debug: 'true', theme: 'midnight' }
 * ```
 */
export function parseDebugParams(url: URL): Result<UrlOverrides> {
	const overrides: UrlOverrides = {};

	for (const [key, value] of url.searchParams) {
		if (key.startsWith(URL_PARAM_PREFIX)) {
			const unprefixed: Str = key.slice(URL_PARAM_PREFIX.length);
			overrides[unprefixed] = value;
		}
	}

	return okUnchecked(overrides);
}

/**
 * Setter method names on EditorStore, keyed by AppPreferencesSchema field name.
 * Maps 'theme' → 'setTheme', 'mode' → 'setMode', etc.
 */
const APP_SETTER_MAP: Record<string, keyof EditorStore> = {
	appName: 'setAppName',
	theme: 'setTheme',
	mode: 'setMode',
	locale: 'setLocale',
	sidebarOpen: 'setSidebarOpen',
	userName: 'setUserName',
	userEmail: 'setUserEmail',
	userAvatar: 'setUserAvatar',
	mockDataDelay: 'setMockDataDelay',
};

/**
 * Applies URL overrides to the editor and debug stores.
 *
 * Handles three categories of overrides:
 * 1. Debug params (`debug`, `logLevel`) → DebugStore setters
 * 2. App params (`theme`, `mode`, `locale`, `sidebarOpen`, `appName`) → EditorStore setters
 * 3. Feature flag params (`ff.*`) → EditorStore.setFeature()
 *
 * Unknown keys are silently ignored. Invalid values are passed to store setters
 * which validate via Valibot and return Result errors (not thrown).
 *
 * @param editorStore - The editor state store
 * @param debugStore - The debug state store
 * @param overrides - Unprefixed URL overrides from parseDebugParams
 * @returns Result<Void> — always ok (individual setter errors are non-fatal)
 *
 * @example
 * ```typescript
 * applyUrlOverrides(editorStore, debugStore, { debug: 'true', theme: 'midnight', 'ff.settings': 'false' });
 * ```
 */
export function applyUrlOverrides(
	editorStore: EditorStore,
	debugStore: DebugStoreLike,
	overrides: UrlOverrides,
): Result<Void> {
	for (const [key, value] of Object.entries(overrides)) {
		// Debug params
		if (key === 'debug') {
			debugStore.setEnabled(value === 'true');
			continue;
		}
		if (key === 'logLevel') {
			debugStore.setLogLevel(value);
			continue;
		}

		// Feature flag params: ff.* → setFeature
		if (key.startsWith(FF_PREFIX)) {
			const flagKey: Str = key.slice(FF_PREFIX.length);
			if (isValidFeatureFlag(flagKey)) {
				editorStore.setFeature(flagKey, value === 'true');
			}
			continue;
		}

		// App preference params
		if (isValidAppKey(key)) {
			const setterName = APP_SETTER_MAP[key];
			if (setterName) {
				const setter = editorStore[setterName] as (val: unknown) => Result<Void>;
				// sidebarOpen needs boolean conversion
				if (key === 'sidebarOpen') {
					setter(value === 'true');
				} else if (key === 'mockDataDelay') {
					setter(Number(value) || 0);
				} else {
					setter(value);
				}
			}
			continue;
		}

		// Unknown key — warn so typos are caught
		// eslint-disable-next-line no-console -- Intentional debug warning for bad URL params
		console.warn(
			`[Editor] Unknown URL override: ${URL_PARAM_PREFIX}${key}=${value} — valid: debug, logLevel, ${Object.keys(APP_SETTER_MAP).join(', ')}, ff.<flag>`,
		);
	}

	return okUnchecked<Void>(undefined);
}
