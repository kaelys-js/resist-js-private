/**
 * Debug State Store — Editor-specific wrapper
 *
 * Thin wrapper around the shared `@/utils/devtools/debug-state-store`
 * that provides Storylyne-specific storage key and URL param prefix,
 * plus singleton management for the editor app.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import {
  createDebugStore as createSharedDebugStore,
  type DebugStore,
} from '@/utils/devtools/debug-state-store.svelte';
import { storageKey, URL_PARAM_PREFIX } from '$lib/config/app-meta';

export type { DebugStore } from '@/utils/devtools/debug-state-store.svelte';

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for persisting debug state. */
export const STORAGE_KEY: Str = storageKey('debug-state');

// =============================================================================
// Factory (delegates to shared)
// =============================================================================

/**
 * Creates a new debug store with Storylyne-specific storage key and URL prefix.
 *
 * @param url - Optional URL to parse debug params from
 * @returns `Result<DebugStore>` — always ok
 */
export function createDebugStore(url?: URL): Result<DebugStore> {
  return createSharedDebugStore({
    url,
    storageKey: STORAGE_KEY,
    urlParamPrefix: URL_PARAM_PREFIX,
  });
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
