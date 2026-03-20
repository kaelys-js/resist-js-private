/**
 * Open Graph locale conversion.
 *
 * Dynamically converts BCP 47 language codes (e.g., `'en'`, `'ja'`) to the
 * `xx_YY` format used by `og:locale` meta tags (e.g., `'en_US'`, `'ja_JP'`).
 *
 * Uses `Intl.Locale.maximize()` to resolve the most likely region for a
 * language code — no hardcoded mapping table required. Adding a new locale
 * to any product requires zero changes here.
 *
 * @module
 */

import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';

/** Schema for a single OG locale string (e.g., `'en_US'`). */
export const OgLocaleSchema = v.pipe(v.string(), v.regex(/^[a-z]{2}_[A-Z]{2}$/));

/**
 * Converts a BCP 47 language code to Open Graph locale format.
 *
 * Uses `Intl.Locale.maximize()` to resolve the most likely region subtag,
 * then formats as `xx_YY` (lowercase language, underscore, uppercase region).
 *
 * If the input already includes a region (e.g., `'en-GB'`), that region is
 * used directly instead of the maximized default.
 *
 * @param locale - A BCP 47 language code (e.g., `'en'`, `'ja'`, `'en-GB'`)
 * @returns Result containing the OG locale string (e.g., `'en_US'`, `'ja_JP'`)
 *
 * @example
 * ```typescript
 * const result = toOgLocale('en');
 * if (result.ok) console.log(result.data); // 'en_US'
 *
 * const gbResult = toOgLocale('en-GB');
 * if (gbResult.ok) console.log(gbResult.data); // 'en_GB'
 * ```
 */
export function toOgLocale(locale: Str): Result<Str> {
  try {
    const intlLocale = new Intl.Locale(locale);
    const maximized = intlLocale.maximize();
    const { language, region } = maximized;
    if (!region) {
      return err(ERRORS.LOCALE.INVALID_LOCALE, `Cannot resolve region for locale: ${locale}`);
    }
    return okUnchecked<Str>(`${language}_${region}`);
  } catch {
    return err(ERRORS.LOCALE.INVALID_LOCALE, `Invalid locale code: ${locale}`);
  }
}
