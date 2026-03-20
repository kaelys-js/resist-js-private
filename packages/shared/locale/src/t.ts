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

import type { Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

/**
 * Convenience helper — calls a locale function and returns the string,
 * falling back to the provided default if the Result is an error.
 * Works around DeepReadonly type mangling on BuiltLocale function signatures.
 *
 * @param fn - Locale function from `localeStore.t.*.*`
 * @param fallback - Default string if the locale function returns an error
 * @returns The translated string, or the fallback
 *
 * @example
 * ```typescript
 * const label: Str = t(localeStore.t.common.settings, 'Settings');
 * ```
 */
export function t(
  fn:
    | (() => Result<Str>)
    | ((_args: object) => Result<Str>)
    | ((params: Record<string, never>) => Result<Str>),
  fallback: Str,
): Str {
  // DeepReadonly mangles locale function signatures — cast to callable form
  const result: Result<Str> = (fn as () => Result<Str>)();
  // UI boundary — t() is the designated fallback point; locale errors are non-fatal
  return result.ok ? result.data : fallback;
}
