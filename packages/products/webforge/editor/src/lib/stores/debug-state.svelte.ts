/**
 * Debug State Store
 *
 * Centralized, reactive debug/developer mode state.
 * Module-level `$state` runes provide fine-grained reactivity.
 * All mutations return `Result<Void>` — no exceptions.
 * Persists to localStorage under `'app:debug-state'`.
 *
 * @module
 */

import * as v from 'valibot';
import type { Void } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import {
	DebugStateSchema,
	LogLevelSchema,
	type DebugState,
	type UrlOverrides,
} from '$lib/schemas/debug-state';
import { parseDebugParams } from '$lib/utils/url-params';

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for persisting debug state. */
export const STORAGE_KEY = 'app:debug-state';

// =============================================================================
// Defaults
// =============================================================================

const DEBUG_DEFAULTS: DebugState = {
	enabled: false,
	logLevel: 'info',
};

// =============================================================================
// Module-level reactive state
// =============================================================================

let _debug: DebugState = $state({ ...DEBUG_DEFAULTS });
let _urlOverrides: UrlOverrides = $state({});

// =============================================================================
// Store type
// =============================================================================

/**
 * The debug store interface.
 *
 * Provides reactive debug state and URL override tracking.
 * All mutations validate via Valibot and return `Result<Void>`.
 */
export type DebugStore = {
	/** Current debug state (reactive via `$state`). */
	readonly debug: DebugState;
	/** URL overrides parsed from query params (session-only, not persisted). */
	readonly urlOverrides: UrlOverrides;
	/** Enable or disable debug mode. */
	setEnabled(enabled: boolean): Result<Void>;
	/** Set the active log level. Must be a valid LogLevel. */
	setLogLevel(level: string): Result<Void>;
};

// =============================================================================
// Persistence helpers
// =============================================================================

/**
 * Serializes current debug state to localStorage.
 *
 * @returns `Result<Void>` — ok on success, error if write fails
 */
function save(): Result<Void> {
	if (typeof window === 'undefined') return okUnchecked<Void>(undefined);
	try {
		const data = { enabled: _debug.enabled, logLevel: _debug.logLevel };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		return okUnchecked<Void>(undefined);
	} catch {
		return err(ERRORS.IO.WRITE_FAILED, 'Failed to save debug state to localStorage');
	}
}

/**
 * Loads and validates debug state from localStorage.
 *
 * @returns `Result<Void>` — ok on success, error if validation fails
 */
function load(): Result<Void> {
	if (typeof window === 'undefined') return okUnchecked<Void>(undefined);
	try {
		const raw: string | null = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return okUnchecked<Void>(undefined);

		const parsed: unknown = JSON.parse(raw);
		const result = safeParse(DebugStateSchema, parsed);
		if (!result.ok) return result;

		_debug = { ...result.data };
		return okUnchecked<Void>(undefined);
	} catch {
		return err(ERRORS.IO.READ_FAILED, 'Failed to load debug state from localStorage');
	}
}

// =============================================================================
// Validated setters
// =============================================================================

/**
 * Enables or disables debug mode.
 *
 * @param enabled - Boolean flag
 * @returns `Result<Void>` — error if value is not boolean
 */
function setEnabled(enabled: boolean): Result<Void> {
	const result = safeParse(v.boolean(), enabled);
	if (!result.ok) return result;

	_debug = { ..._debug, enabled: result.data };
	return save();
}

/**
 * Sets the active log level.
 *
 * @param level - Must be one of LOG_LEVELS
 * @returns `Result<Void>` — error if level is invalid
 */
function setLogLevel(level: string): Result<Void> {
	const result = safeParse(LogLevelSchema, level);
	if (!result.ok) return result;

	_debug = { ..._debug, logLevel: result.data };
	return save();
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a new debug store, resetting module-level state to defaults
 * and loading any persisted state from localStorage.
 *
 * @param url - Optional URL to parse `wf.*` debug params from
 * @returns `Result<DebugStore>` — always ok
 *
 * @example
 * ```typescript
 * const result = createDebugStore(new URL('http://localhost?wf.debug=true'));
 * if (!result.ok) throw new Error('Store creation failed');
 * const store = result.data;
 * ```
 */
export function createDebugStore(url?: URL): Result<DebugStore> {
	// Reset to defaults
	_debug = { ...DEBUG_DEFAULTS };
	_urlOverrides = {};

	// Try loading from localStorage (failures are non-fatal)
	load();

	// Parse URL params if provided
	if (url) {
		const parseResult = parseDebugParams(url);
		if (parseResult.ok) {
			_urlOverrides = { ...parseResult.data };
		}
	}

	const store: DebugStore = {
		get debug(): DebugState {
			return _debug;
		},
		get urlOverrides(): UrlOverrides {
			return _urlOverrides;
		},
		setEnabled,
		setLogLevel,
	};

	return Object.freeze({
		ok: true as const,
		data: store,
		error: null,
	}) as Result<DebugStore>;
}

// =============================================================================
// Singleton management
// =============================================================================

let _singleton: DebugStore | null = null;

/**
 * Initializes the debug store singleton. Call once in `+layout.svelte`.
 *
 * @param url - Optional URL to parse debug params from
 * @returns The singleton DebugStore instance
 * @throws If `createDebugStore()` returns an error
 */
export function initDebugStore(url?: URL): DebugStore {
	const result = createDebugStore(url);
	if (!result.ok) throw new Error(`DebugStore creation failed: ${result.error.message}`);
	_singleton = result.data;
	return _singleton;
}

/**
 * Returns the debug store singleton. Must be called after `initDebugStore()`.
 *
 * @returns The singleton DebugStore instance
 * @throws If `initDebugStore()` has not been called yet
 */
export function useDebugStore(): DebugStore {
	if (_singleton === null) {
		throw new Error('DebugStore not initialized — call initDebugStore() first');
	}
	return _singleton;
}
