/**
 * Generic URL parameter parsing utilities.
 *
 * Extracts query parameters matching a given prefix from a URL,
 * returning unprefixed key-value pairs. Any product can use this
 * with its own prefix to implement URL-driven overrides.
 *
 * @module
 */

import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

/**
 * Schema for parsed URL overrides. Keys are unprefixed (e.g., `'theme'`, not `'app.theme'`).
 * Values are raw strings — validated against target schemas when applied.
 *
 * @example
 * ```typescript
 * const result = safeParse(UrlOverridesSchema, { theme: 'midnight', locale: 'ja' });
 * ```
 */
export const UrlOverridesSchema = v.record(v.string(), v.string());

/** Inferred type for URL overrides map. */
export type UrlOverrides = v.InferOutput<typeof UrlOverridesSchema>;

/**
 * Extracts all parameters matching a given prefix from a URL.
 * Returns unprefixed keys mapped to raw string values.
 *
 * @param {URL} url - The URL to parse
 * @param {Str} prefix - The parameter prefix to match and strip (e.g., `'app.'`, `'wf_'`)
 * @returns {Result<UrlOverrides>} Result containing the extracted overrides map
 *
 * @example
 * ```typescript
 * const result = parsePrefixedParams(new URL('http://localhost?app.debug=true&app.theme=midnight'), 'app.');
 * // result.data = { debug: 'true', theme: 'midnight' }
 * ```
 */
export function parsePrefixedParams(url: URL, prefix: Str): Result<UrlOverrides> {
  const overrides: UrlOverrides = {};

  for (const [key, value] of url.searchParams) {
    if (key.startsWith(prefix)) {
      const unprefixed: Str = key.slice(prefix.length);
      overrides[unprefixed] = value;
    }
  }

  return okUnchecked(overrides);
}
