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
 * Locale function shape accepted by {@link t}.
 *
 * The locale-registry type pipeline emits two callable forms depending on
 * whether the source string has interpolation placeholders:
 * - parameter-less keys → `() => Result<Str>`
 * - keys with placeholders → `(params: { …namedFields }) => Result<Str>`
 * - DeepReadonly normalisation can also collapse parameter-less keys to
 *   `(params: { [x: string]: never }) => Result<Str>`
 *
 * Accepting all three lets call sites pass any locale function without casts.
 */
type LocaleFn = (() => Result<Str>) | ((params: Record<string, never>) => Result<Str>);

/**
 * Convenience helper — calls a locale function and returns the string,
 * falling back to the provided default if the Result is an error.
 * Works around DeepReadonly type mangling on BuiltLocale function signatures.
 *
 * @param {LocaleFn} fn - Locale function from `localeStore.t.*.*`
 * @param {Str} fallback - Default string if the locale function returns an error
 * @returns {Str} The translated string, or the fallback
 *
 * @example
 * ```typescript
 * const label: Str = t(localeStore.t.common.settings, 'Settings');
 * ```
 */
export function t(fn: LocaleFn, fallback: Str): Str {
  const fallbackResult: Result<Str> = safeParse(StrSchema, fallback);

  if (!fallbackResult.ok) {
    // integration boundary: fallback string validation failed — return raw fallback
    return fallback;
  }

  // DeepReadonly mangles locale function signatures — cast to callable form.
  // Both LocaleFn variants accept zero args at runtime; the never-keyed param
  // shape can never be satisfied with any concrete value, so passing nothing
  // is the only legal call form.
  const result: Result<Str> = (fn as () => Result<Str>)();

  if (!result.ok) {
    // integration boundary: t() is the designated error-to-string fallback point
    // Locale errors are non-fatal in UI — the fallback string is returned
    return fallbackResult.data;
  }

  return result.data;
}
