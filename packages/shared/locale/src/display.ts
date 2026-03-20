/**
 * Language display name utilities using the browser-native Intl.DisplayNames API.
 *
 * Generates endonym (native name) and exonym (name in current locale) pairs
 * for any language code. Used by language switchers to show dual display names.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { getLanguageDisplayName } from '@/locale/display';
 *
 * const result = getLanguageDisplayName('ja', 'en');
 * if (result.ok) {
 *   console.log(result.data.endonym); // '日本語'
 *   console.log(result.data.exonym);  // 'Japanese'
 * }
 * ```
 */

import * as v from 'valibot';
import type { Str } from '@/schemas/common';
import { ERRORS, err, type Result, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

/**
 * Schema for a language's display name information.
 */
export const LanguageDisplayInfoSchema = v.strictObject({
  /** BCP 47 language code (e.g., `'ja'`, `'fr'`). */
  code: v.string(),
  /** Native name of the language (e.g., `'日本語'` for Japanese). */
  endonym: v.string(),
  /** Name of the language in the current display locale (e.g., `'Japanese'`). */
  exonym: v.string(),
});

/** A language's native name (endonym) and name in the current locale (exonym). */
export type LanguageDisplayInfo = v.InferOutput<typeof LanguageDisplayInfoSchema>;

/**
 * Gets the endonym and exonym for a single language code.
 *
 * @param code - BCP 47 language code (e.g., 'ja', 'fr')
 * @param currentLocale - The locale to generate the exonym in (e.g., 'en')
 * @returns Result containing code, endonym, and exonym
 *
 * @example
 * ```typescript
 * import { getLanguageDisplayName } from '@/locale/display';
 *
 * const result = getLanguageDisplayName('ja', 'en');
 * if (result.ok) {
 *   console.log(result.data.endonym); // '日本語'
 *   console.log(result.data.exonym);  // 'Japanese'
 * }
 * ```
 */
export function getLanguageDisplayName(code: Str, currentLocale: Str): Result<LanguageDisplayInfo> {
  const codeResult = safeParse(v.pipe(v.string(), v.minLength(1)), code);
  if (!codeResult.ok) return err(ERRORS.LOCALE.INVALID_LOCALE, 'Language code must be non-empty');

  const localeResult = safeParse(v.pipe(v.string(), v.minLength(1)), currentLocale);
  if (!localeResult.ok)
    return err(ERRORS.LOCALE.INVALID_LOCALE, 'Current locale must be non-empty');

  const endonymDisplay = new Intl.DisplayNames([codeResult.data], { type: 'language' });
  const exonymDisplay = new Intl.DisplayNames([localeResult.data], { type: 'language' });

  const endonym: Str | undefined = endonymDisplay.of(codeResult.data);
  const exonym: Str | undefined = exonymDisplay.of(codeResult.data);

  if (!endonym || !exonym) {
    return err(
      ERRORS.LOCALE.INVALID_LOCALE,
      `Cannot resolve display name for language code: ${code}`,
    );
  }

  return okUnchecked<LanguageDisplayInfo>({ code: codeResult.data, endonym, exonym });
}

/**
 * Gets display name information for multiple language codes.
 *
 * @param codes - Array of BCP 47 language codes
 * @param currentLocale - The locale to generate exonyms in
 * @returns Result containing an array of LanguageDisplayInfo
 *
 * @example
 * ```typescript
 * import { getLanguageDisplayNames } from '@/locale/display';
 *
 * const result = getLanguageDisplayNames(['en', 'ja', 'fr'], 'en');
 * if (result.ok) {
 *   for (const lang of result.data) {
 *     console.log(`${lang.endonym} (${lang.exonym})`);
 *   }
 * }
 * ```
 */
export function getLanguageDisplayNames(
  codes: readonly Str[],
  currentLocale: Str,
): Result<LanguageDisplayInfo[]> {
  const results: LanguageDisplayInfo[] = [];
  for (const code of codes) {
    const result = getLanguageDisplayName(code, currentLocale);
    if (!result.ok) return result;
    results.push(result.data);
  }
  return okUnchecked<LanguageDisplayInfo[]>(results);
}
