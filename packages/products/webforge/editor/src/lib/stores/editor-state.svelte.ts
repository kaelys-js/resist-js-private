/**
 * Editor Global State Store
 *
 * Centralized, reactive, Valibot-validated editor state.
 * Module-level `$state` runes provide fine-grained reactivity.
 * All mutations return `Result<Void>` — no exceptions.
 * Persists to localStorage under `'app:editor-state'`.
 *
 * @module
 */

import * as v from 'valibot';
import type { Void } from '@/schemas/common';
import { ERRORS, err, type Result, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import {
	EditorStateSchema,
	SUPPORTED_LOCALES,
	SUPPORTED_MODES,
	SUPPORTED_THEMES,
	type AppPreferences,
	type FeatureFlags,
} from '$lib/schemas/editor-state';
import { APP_NAME } from '$lib/config/app-meta';

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for persisting editor state. */
export const STORAGE_KEY = 'app:editor-state';

// =============================================================================
// Defaults (derived from schema defaults via safeParse of empty object)
// =============================================================================

const APP_DEFAULTS: AppPreferences = {
	appName: APP_NAME,
	theme: '',
	mode: 'system',
	locale: 'en',
	sidebarOpen: true,
};

const FEATURE_DEFAULTS: FeatureFlags = {
	settings: true,
	themeSelection: true,
	languageSelection: true,
	modeToggle: true,
	sidebar: true,
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
};

/** All valid feature flag keys. */
const FEATURE_KEYS = new Set<string>(Object.keys(FEATURE_DEFAULTS));

// =============================================================================
// Module-level reactive state
// =============================================================================

let _app: AppPreferences = $state({ ...APP_DEFAULTS });
let _features: FeatureFlags = $state({ ...FEATURE_DEFAULTS });

// =============================================================================
// Store type
// =============================================================================

/**
 * The editor store interface.
 *
 * Irreducible TS type: contains getter properties and methods returning
 * `Result<Void>`. Valibot validates data shapes, not function signatures.
 */
export type EditorStore = {
	/** Current app preferences (reactive via `$state`). */
	readonly app: AppPreferences;
	/** Current feature flags (reactive via `$state`). */
	readonly features: FeatureFlags;
	/** Set the application display name. Must be non-empty. */
	setAppName(name: string): Result<Void>;
	/** Set the active theme. Must be a value in `SUPPORTED_THEMES`. */
	setTheme(theme: string): Result<Void>;
	/** Set the color mode. Must be `'light'`, `'dark'`, or `'system'`. */
	setMode(mode: string): Result<Void>;
	/** Set the active locale. Must be a value in `SUPPORTED_LOCALES`. */
	setLocale(locale: string): Result<Void>;
	/** Set whether the sidebar is open. */
	setSidebarOpen(open: boolean): Result<Void>;
	/** Toggle an individual feature flag. Flag key must exist. */
	setFeature(flag: string, enabled: boolean): Result<Void>;
	/** Persist current state to localStorage. */
	save(): Result<Void>;
	/** Load state from localStorage. Falls back to defaults on failure. */
	load(): Result<Void>;
};

// =============================================================================
// Persistence helpers
// =============================================================================

/**
 * Serializes current state to localStorage.
 *
 * @returns `Result<Void>` — ok on success, error if serialization or write fails
 */
function save(): Result<Void> {
	if (typeof window === 'undefined') return okUnchecked<Void>(undefined);
	try {
		const data = { app: { ..._app }, features: { ..._features } };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		return okUnchecked<Void>(undefined);
	} catch {
		return err(ERRORS.IO.WRITE_FAILED, 'Failed to save editor state to localStorage');
	}
}

/**
 * Loads and validates state from localStorage, hydrating module-level `$state`.
 *
 * @returns `Result<Void>` — ok on success or when no saved state exists,
 *   error if JSON parse or schema validation fails
 */
function load(): Result<Void> {
	if (typeof window === 'undefined') return okUnchecked<Void>(undefined);
	try {
		const raw: string | null = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return okUnchecked<Void>(undefined);

		const parsed: unknown = JSON.parse(raw);
		const result = safeParse(EditorStateSchema, parsed);
		if (!result.ok) return result;

		_app = { ...result.data.app };
		_features = { ...result.data.features };
		return okUnchecked<Void>(undefined);
	} catch {
		return err(ERRORS.IO.READ_FAILED, 'Failed to load editor state from localStorage');
	}
}

// =============================================================================
// Validated setters
// =============================================================================

/**
 * Sets the application display name.
 *
 * @param name - Non-empty string
 * @returns `Result<Void>` — error if name is empty
 */
function setAppName(name: string): Result<Void> {
	const nameSchema = v.pipe(v.string(), v.minLength(1));
	const result = safeParse(nameSchema, name);
	if (!result.ok) return result;

	_app = { ..._app, appName: result.data };
	return save();
}

/**
 * Sets the active theme.
 *
 * @param theme - Must be a value in `SUPPORTED_THEMES`
 * @returns `Result<Void>` — error if theme is not in the supported list
 */
function setTheme(theme: string): Result<Void> {
	const themeSchema = v.picklist([...SUPPORTED_THEMES]);
	const result = safeParse(themeSchema, theme);
	if (!result.ok) return result;

	_app = { ..._app, theme: result.data };
	return save();
}

/**
 * Sets the color mode.
 *
 * @param mode - Must be `'light'`, `'dark'`, or `'system'`
 * @returns `Result<Void>` — error if mode is not in the supported list
 */
function setMode(mode: string): Result<Void> {
	const modeSchema = v.picklist([...SUPPORTED_MODES]);
	const result = safeParse(modeSchema, mode);
	if (!result.ok) return result;

	_app = { ..._app, mode: result.data };
	return save();
}

/**
 * Sets the active locale.
 *
 * @param locale - Must be a value in `SUPPORTED_LOCALES`
 * @returns `Result<Void>` — error if locale is not in the supported list
 */
function setLocale(locale: string): Result<Void> {
	const localeSchema = v.picklist([...SUPPORTED_LOCALES]);
	const result = safeParse(localeSchema, locale);
	if (!result.ok) return result;

	_app = { ..._app, locale: result.data };
	return save();
}

/**
 * Sets whether the sidebar is open.
 *
 * @param open - Boolean
 * @returns `Result<Void>`
 */
function setSidebarOpen(open: boolean): Result<Void> {
	const result = safeParse(v.boolean(), open);
	if (!result.ok) return result;

	_app = { ..._app, sidebarOpen: result.data };
	return save();
}

/**
 * Toggles an individual feature flag.
 *
 * @param flag - Key name of the feature flag (must exist in FeatureFlags)
 * @param enabled - Whether the feature is enabled
 * @returns `Result<Void>` — error if the flag key does not exist
 */
function setFeature(flag: string, enabled: boolean): Result<Void> {
	if (!FEATURE_KEYS.has(flag)) {
		return err(ERRORS.VALIDATION.INVALID_FORMAT, `Unknown feature flag: ${flag}`);
	}

	const boolResult = safeParse(v.boolean(), enabled);
	if (!boolResult.ok) return boolResult;

	_features = { ..._features, [flag]: boolResult.data };
	return save();
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a new editor store, resetting module-level state to defaults
 * and loading any persisted state from localStorage.
 *
 * @returns `Result<EditorStore>` — always ok (load failures fall back to defaults)
 *
 * @example
 * ```typescript
 * const result = createEditorStore();
 * if (!result.ok) throw new Error('Store creation failed');
 * const store = result.data;
 * store.setTheme('midnight');
 * ```
 */
export function createEditorStore(): Result<EditorStore> {
	// Reset to defaults
	_app = { ...APP_DEFAULTS };
	_features = { ...FEATURE_DEFAULTS };

	// Try loading from localStorage (failures are non-fatal — use defaults)
	load();

	const store: EditorStore = {
		get app(): AppPreferences {
			return _app;
		},
		get features(): FeatureFlags {
			return _features;
		},
		setAppName,
		setTheme,
		setMode,
		setLocale,
		setSidebarOpen,
		setFeature,
		save,
		load,
	};

	// Shallow-freeze only the Result wrapper — the store contains $state proxies
	// that reject deep-freezing (Svelte's state_descriptors_fixed error).
	return Object.freeze({
		ok: true as const,
		data: store,
		error: null,
	}) as Result<EditorStore>;
}

// =============================================================================
// Singleton management
// =============================================================================

let _singleton: EditorStore | null = null;

/**
 * Initializes the editor store singleton. Call once in `+layout.svelte`.
 * Throws if store creation fails (should never happen with valid defaults).
 *
 * @returns The singleton EditorStore instance
 * @throws If `createEditorStore()` returns an error
 */
export function initEditorStore(): EditorStore {
	const result = createEditorStore();
	if (!result.ok) throw new Error(`EditorStore creation failed: ${result.error.message}`);
	_singleton = result.data;
	return _singleton;
}

/**
 * Returns the editor store singleton. Must be called after `initEditorStore()`.
 *
 * @returns The singleton EditorStore instance
 * @throws If `initEditorStore()` has not been called yet
 */
export function useEditorStore(): EditorStore {
	if (_singleton === null) {
		throw new Error('EditorStore not initialized — call initEditorStore() first');
	}
	return _singleton;
}
