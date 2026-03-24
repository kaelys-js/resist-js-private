/**
 * Locale translation helper.
 *
 * Pure convenience function that calls a locale function and returns the
 * translated string, falling back to a default on error. Works with any
 * product's locale store — no editor-specific dependencies.
 *
 * Separated from `svelte.svelte.ts` to avoid pulling `$state` runes
 * into non-Svelte type-checking contexts.
 *
 * @module
 */

import { StrSchema, type Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

/**
 * Convenience helper — calls a locale function and returns the string,
 * falling back to the provided default if the Result is an error.
 * Works around DeepReadonly type mangling on BuiltLocale function signatures.
 *
 * @param {() => Result<Str>} fn - Locale function from `localeStore.t.*.*`
 * @param {Str} fallback - Default string if the locale function returns an error
 * @returns {Str} The translated string, or the fallback
 *
 * @example
 * ```typescript
 * const label: Str = t(localeStore.t.common.settings, 'Settings');
 * ```
 */
export function t(fn: () => Result<Str>, fallback: Str): Str {
  const fallbackResult: Result<Str> = safeParse(StrSchema, fallback);

  if (!fallbackResult.ok) {
    // integration boundary: fallback string validation failed — return raw fallback
    return fallback;
  }

  // DeepReadonly mangles locale function signatures — cast to callable form
  const result: Result<Str> = fn();

  if (!result.ok) {
    // integration boundary: t() is the designated error-to-string fallback point
    // Locale errors are non-fatal in UI — the fallback string is returned
    return fallbackResult.data;
  }

  return result.data;
}
