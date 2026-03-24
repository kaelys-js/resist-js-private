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
import { StrSchema, type Str } from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

/** Schema for a single OG locale string (e.g., `'en_US'`). */
export const OgLocaleSchema = v.pipe(v.string(), v.regex(/^[a-z]{2}_[A-Z]{2}$/));

/** Schema for maximized locale data extracted from Intl.Locale. */
const MaximizedLocaleDataSchema = v.strictObject({
  /** BCP 47 language subtag (e.g., `'en'`, `'ja'`). */
  language: StrSchema,
  /** Region subtag if resolvable (e.g., `'US'`, `'JP'`). */
  region: v.optional(StrSchema),
});

/** Maximized locale data. See {@link MaximizedLocaleDataSchema}. */
type MaximizedLocaleData = v.InferOutput<typeof MaximizedLocaleDataSchema>;

/**
 * Converts a BCP 47 language code to Open Graph locale format.
 *
 * Uses `Intl.Locale.maximize()` to resolve the most likely region subtag,
 * then formats as `xx_YY` (lowercase language, underscore, uppercase region).
 *
 * If the input already includes a region (e.g., `'en-GB'`), that region is
 * used directly instead of the maximized default.
 *
 * @param {Str} locale - A BCP 47 language code (e.g., `'en'`, `'ja'`, `'en-GB'`)
 * @returns {Result<Str>} Result containing the OG locale string (e.g., `'en_US'`, `'ja_JP'`)
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
  const localeResult: Result<Str> = safeParse(StrSchema, locale);
  if (!localeResult.ok) return localeResult;

  try {
    const intlLocale: Intl.Locale = new Intl.Locale(localeResult.data);
    const maximized: Intl.Locale = intlLocale.maximize();
    const localeDataResult: Result<MaximizedLocaleData> = safeParse(MaximizedLocaleDataSchema, {
      language: maximized.language,
      region: maximized.region,
    });
    if (!localeDataResult.ok) return localeDataResult;
    const { language, region }: MaximizedLocaleData = localeDataResult.data;
    if (!region) {
      return err(ERRORS.LOCALE.INVALID_LOCALE, `Cannot resolve region for locale: ${locale}`);
    }
    return ok(OgLocaleSchema, `${language}_${region}`);
  } catch (error: unknown) {
    // Intl.Locale constructor threw — convert to typed error
    return err(ERRORS.LOCALE.INVALID_LOCALE, {
      meta: { locale: localeResult.data },
      cause: fromUnknownError(error),
    });
  }
}
