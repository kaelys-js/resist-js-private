/**
 * resist-lint — Locale Registry
 *
 * Maps locale codes to string sets for runtime locale selection.
 * The `resolveLocale()` function resolves a requested locale code
 * to its corresponding `LintStrings` object, falling back to `en`
 * when no locale is specified.
 *
 * Bridge pattern: when @/lint migrates to @/cli, this registry
 * is replaced by @/cli's `resolveLocale()` — same interface,
 * different implementation.
 *
 * @module
 */

import { en } from '@/lint/locale/locales/en.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

// =============================================================================
// Locale Type & Registry
// =============================================================================

/** Supported locale codes. Extend this union to add new locales. */
export type Locale = 'en';

/** Maps locale codes to their corresponding string sets. */
const LOCALE_REGISTRY: Readonly<Record<Locale, LintStrings>> = { en };

// =============================================================================
// Lightweight Result (bridge to @/schemas/result when lint moves to @/cli)
// =============================================================================

/** Success result containing resolved locale strings. */
type LocaleOk = { readonly ok: true; readonly strings: LintStrings };

/** Error result for invalid locale codes. */
type LocaleErr = { readonly ok: false; readonly error: string };

/** Discriminated union — compatible with Result<LintStrings> shape. */
export type LocaleResult = LocaleOk | LocaleErr;

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve a locale code to its string set.
 *
 * - `undefined` → falls back to `en`
 * - Valid code → returns the matching `LintStrings`
 * - Invalid code → returns error with available locales
 *
 * @param {string} [requested] - Locale code from `--locale` flag
 * @returns {LocaleResult} Resolved strings or error
 */
export function resolveLocale(requested?: string): LocaleResult {
  if (requested === undefined) {
    return { ok: true, strings: en };
  }

  if (requested in LOCALE_REGISTRY) {
    return { ok: true, strings: LOCALE_REGISTRY[requested as Locale] };
  }

  const available: string = getAvailableLocales().join(', ');
  return {
    ok: false,
    error: `Unknown locale "${requested}". Available locales: ${available}`,
  };
}

/**
 * Get all available locale codes.
 *
 * @returns {readonly Locale[]} Available locale codes
 */
export function getAvailableLocales(): readonly Locale[] {
  return Object.keys(LOCALE_REGISTRY) as Locale[];
}
