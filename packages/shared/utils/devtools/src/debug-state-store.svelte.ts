/**
 * Debug State Store
 *
 * Centralized, reactive debug/developer mode state.
 * Module-level `$state` runes provide fine-grained reactivity.
 * All mutations return `Result<Void>` — no exceptions.
 *
 * Product-agnostic — the product provides a storage key and URL param prefix.
 *
 * @module
 */

import * as v from 'valibot';
import type { Bool, Str, Void } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { parsePrefixedParams, type UrlOverrides } from '@/utils/core/url-params';
import {
  DebugStateSchema,
  LogLevelSchema,
  type DebugState,
} from './debug-state-schema';

// =============================================================================
// Types
// =============================================================================

/** Options for creating a debug store. */
export type CreateDebugStoreOptions = {
  /** URL to parse debug params from (optional). */
  url?: URL;
  /** localStorage key for persistence (e.g., 'storylyne.debug-state'). */
  storageKey?: Str;
  /** URL param prefix (e.g., 'sto.'). */
  urlParamPrefix?: Str;
};

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
  setEnabled(enabled: Bool): Result<Void>;
  /** Set the active log level. Must be a valid LogLevel. */
  setLogLevel(level: Str): Result<Void>;
};

// =============================================================================
// Persistence helpers
// =============================================================================

/** Current storage key — set by createDebugStore. */
let _storageKey: Str = '';

/**
 * Serializes current debug state to localStorage.
 *
 * @returns `Result<Void>` — ok on success, error if write fails
 */
function save(): Result<Void> {
  if (typeof window === 'undefined' || !_storageKey) return okUnchecked<Void>(undefined);
  try {
    // Only persist logLevel — `enabled` is session-only (set via URL param or keyboard shortcut)
    const data = { logLevel: _debug.logLevel };
    localStorage.setItem(_storageKey, JSON.stringify(data));
    return okUnchecked<Void>(undefined);
  } catch {
    return err(
      ERRORS.IO.WRITE_FAILED,
      `Failed to save debug state to localStorage key "${_storageKey}" (logLevel: ${_debug.logLevel})`,
    );
  }
}

/**
 * Loads and validates debug state from localStorage.
 *
 * @returns `Result<Void>` — ok on success, error if validation fails
 */
function load(): Result<Void> {
  if (typeof window === 'undefined' || !_storageKey) return okUnchecked<Void>(undefined);
  try {
    const raw: Str | null = localStorage.getItem(_storageKey);
    if (raw === null) return okUnchecked<Void>(undefined);

    const parsed: unknown = JSON.parse(raw);
    const result = safeParse(DebugStateSchema, parsed);
    if (!result.ok) return result;

    _debug = { ...result.data };
    return okUnchecked<Void>(undefined);
  } catch {
    return err(
      ERRORS.IO.READ_FAILED,
      `Failed to load debug state from localStorage key "${_storageKey}" — data may be corrupted`,
    );
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
function setEnabled(enabled: Bool): Result<Void> {
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
function setLogLevel(level: Str): Result<Void> {
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
 * @param opts - Storage key, URL param prefix, and optional URL for param parsing
 * @returns `Result<DebugStore>` — always ok
 *
 * @example
 * ```typescript
 * const result = createDebugStore({
 *   url: new URL(window.location.href),
 *   storageKey: 'storylyne.debug-state',
 *   urlParamPrefix: 'sto.',
 * });
 * if (!result.ok) throw new Error('Store creation failed');
 * const store = result.data;
 * ```
 */
export function createDebugStore(opts?: CreateDebugStoreOptions): Result<DebugStore> {
  // Reset to defaults
  _debug = { ...DEBUG_DEFAULTS };
  _urlOverrides = {};
  _storageKey = opts?.storageKey ?? '';

  // Try loading from localStorage (failures are non-fatal)
  load();

  // Parse URL params if provided
  if (opts?.url && opts.urlParamPrefix) {
    const parseResult = parsePrefixedParams(opts.url, opts.urlParamPrefix);
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
    // Cast required: Object.freeze literal doesn't narrow to Result<T> discriminant
  }) as Result<DebugStore>;
}
