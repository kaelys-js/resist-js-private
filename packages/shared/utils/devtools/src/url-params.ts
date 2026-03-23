/**
 * URL parameter parsing and override application for the devtools system.
 *
 * Product-agnostic — the product provides its URL param prefix, schemas,
 * and setter maps via {@link DevtoolsConfig}.
 *
 * @module
 */

import type { Bool, Str, Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { parsePrefixedParams, type UrlOverrides } from '@/utils/core/url-params';
import type { AppStoreContract, DevtoolsConfig } from './types';

/** Debug store interface expected by applyUrlOverrides. */
type DebugStoreLike = {
  setEnabled(enabled: Bool): unknown;
  setLogLevel(level: Str): unknown;
};

/** Feature flag override prefix within app-specific URL params. */
const FF_PREFIX = 'ff.';

/**
 * Checks whether a key is a valid app preference field.
 *
 * @param key - The key to check
 * @param schemaEntries - Valibot schema entries to check against
 * @returns True if the key exists in the schema
 */
export function isValidAppKey(key: Str, schemaEntries: Record<Str, unknown>): Bool {
  return key in schemaEntries;
}

/**
 * Checks whether a key is a valid feature flag.
 *
 * @param key - The key to check
 * @param schemaEntries - Valibot schema entries to check against
 * @returns True if the key exists in the schema
 */
export function isValidFeatureFlag(key: Str, schemaEntries: Record<Str, unknown>): Bool {
  return key in schemaEntries;
}

/**
 * Extracts all app-prefixed parameters from a URL.
 * Returns unprefixed keys mapped to raw string values.
 *
 * @param url - The URL to parse
 * @param urlParamPrefix - The URL param prefix (e.g., 'sto.')
 * @returns Result containing the extracted overrides map
 *
 * @example
 * ```typescript
 * const result = parseDebugParams(new URL('http://localhost?sto.debug=true'), 'sto.');
 * // result.data = { debug: 'true' }
 * ```
 */
export function parseDebugParams(url: URL, urlParamPrefix: Str): Result<UrlOverrides> {
  return parsePrefixedParams(url, urlParamPrefix);
}

/**
 * Builds a setter map from schema entries: 'theme' → 'setTheme', etc.
 *
 * @param schemaEntries - Valibot schema entries
 * @returns Map of field key → setter method name
 */
function buildSetterMap(schemaEntries: Record<Str, unknown>): Record<Str, Str> {
  const map: Record<Str, Str> = {};
  for (const key of Object.keys(schemaEntries)) {
    const capitalized: Str = key.charAt(0).toUpperCase() + key.slice(1);
    map[key] = `set${capitalized}`;
  }
  return map;
}

/**
 * Applies URL overrides to the app and debug stores.
 *
 * Handles three categories of overrides:
 * 1. Debug params (`debug`, `logLevel`) → debug store setters
 * 2. App params (from config schemas) → app store setters
 * 3. Feature flag params (`ff.*`) → appStore.setFeature()
 *
 * @param appStore - The app state store
 * @param debugStore - The debug state store
 * @param overrides - Unprefixed URL overrides from parseDebugParams
 * @param config - Devtools config for schema-driven validation
 * @returns Result<Void> — always ok (individual setter errors are non-fatal)
 */
export function applyUrlOverrides(
  appStore: AppStoreContract,
  debugStore: DebugStoreLike,
  overrides: UrlOverrides,
  config: DevtoolsConfig,
): Result<Void> {
  const setterMap: Record<Str, Str> = buildSetterMap(config.appPreferencesSchema);

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
      if (config.isValidFeatureFlag(flagKey)) {
        appStore.setFeature(flagKey, value === 'true');
      }
      continue;
    }

    // App preference params
    if (config.isValidAppKey(key)) {
      const setterName: Str | undefined = setterMap[key];
      if (setterName) {
        const setter = (appStore as Record<Str, unknown>)[setterName];
        if (typeof setter === 'function') {
          // Boolean fields need conversion from string
          if (key === 'sidebarOpen') {
            (setter as (v: unknown) => unknown)(value === 'true');
          } else if (key === 'mockDataDelay') {
            (setter as (v: unknown) => unknown)(Number(value) || 0);
          } else {
            (setter as (v: unknown) => unknown)(value);
          }
        }
      }
      continue;
    }

    // Unknown key — warn so typos are caught
    // eslint-disable-next-line no-console -- Intentional debug warning for bad URL params
    console.warn(
      `[Devtools] Unknown URL override: ${config.urlParamPrefix}${key}=${value} — valid: debug, logLevel, ${Object.keys(setterMap).join(', ')}, ff.<flag>`,
    );
  }

  return okUnchecked<Void>(undefined);
}
