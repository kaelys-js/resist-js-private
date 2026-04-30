/**
 * URL parameter utilities — Editor-specific wrapper
 *
 * Delegates to the shared `@/utils/devtools/url-params` with
 * Storylyne-specific schemas and prefix.
 *
 * @module
 */

import type { Bool, Str, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type { UrlOverrides } from '@/utils/core/url-params';
import {
  parseDebugParams as sharedParseDebugParams,
  applyUrlOverrides as sharedApplyUrlOverrides,
  isValidAppKey as sharedIsValidAppKey,
  isValidFeatureFlag as sharedIsValidFeatureFlag,
} from '@/utils/devtools/url-params';
import { AppPreferencesSchema, FeatureFlagsSchema } from '$lib/schemas/editor-state';
import { URL_PARAM_PREFIX } from '$lib/schemas/debug-state';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import { getDevtoolsConfig } from '$lib/config/devtools-config';

/** Schema entries casts for shared functions. */
const APP_ENTRIES = AppPreferencesSchema.entries as unknown as Record<Str, unknown>;
const FLAG_ENTRIES = FeatureFlagsSchema.entries as unknown as Record<Str, unknown>;

/**
 * Checks whether a key is a valid app preference field.
 *
 * @param {Str} key - The preference key to validate.
 * @returns {Bool} Whether the key exists in the app preferences schema.
 */
export function isValidAppKey(key: Str): Bool {
  return sharedIsValidAppKey(key, APP_ENTRIES);
}

/**
 * Checks whether a key is a valid feature flag.
 *
 * @param {Str} key - The feature flag key to validate.
 * @returns {Bool} Whether the key exists in the feature flags schema.
 */
export function isValidFeatureFlag(key: Str): Bool {
  return sharedIsValidFeatureFlag(key, FLAG_ENTRIES);
}

/**
 * Extracts all app-prefixed parameters from a URL.
 *
 * @param {URL} url - The URL to parse debug parameters from.
 * @returns {Result<UrlOverrides>} A Result containing the parsed URL overrides.
 */
export function parseDebugParams(url: URL): Result<UrlOverrides> {
  return sharedParseDebugParams(url, URL_PARAM_PREFIX);
}

/** Debug store interface expected by applyUrlOverrides. */
type DebugStoreLike = {
  setEnabled(enabled: Bool): Result<Void>;
  setLogLevel(level: Str): Result<Void>;
};

/**
 * Applies URL overrides to the editor and debug stores.
 *
 * @param {EditorStore} editorStore - The editor store to apply app preference overrides to.
 * @param {DebugStoreLike} debugStore - The debug store to apply debug state overrides to.
 * @param {UrlOverrides} overrides - The parsed URL overrides to apply.
 * @returns {Result<Void>} A Result indicating success or failure.
 */
export function applyUrlOverrides(
  editorStore: EditorStore,
  debugStore: DebugStoreLike,
  overrides: UrlOverrides,
): Result<Void> {
  const config = getDevtoolsConfig();
  return sharedApplyUrlOverrides(editorStore, debugStore, overrides, config);
}
