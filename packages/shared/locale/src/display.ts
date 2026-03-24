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

import {
  StrSchema,
  StrArraySchema,
  type Str,
  type OptionalStr,
  type StrArray,
} from '@/schemas/common';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for a language's display name information.
 */
export const LanguageDisplayInfoSchema = v.strictObject({
  /** BCP 47 language code (e.g., `'ja'`, `'fr'`). 2-11 chars, lowercase alpha + hyphens. */
  code: v.pipe(
    v.string(),
    v.minLength(2),
    v.maxLength(11),
    v.regex(/^[a-z]{2,3}(-[A-Za-z0-9]{1,8})*$/),
  ),
  /** Native name of the language (e.g., `'日本語'` for Japanese). 1-100 chars. */
  endonym: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  /** Name of the language in the current display locale (e.g., `'Japanese'`). 1-100 chars. */
  exonym: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
});

/** A language's native name (endonym) and name in the current locale (exonym). See {@link LanguageDisplayInfoSchema}. */
export type LanguageDisplayInfo = v.InferOutput<typeof LanguageDisplayInfoSchema>;

// =============================================================================
// API
// =============================================================================

/**
 * Gets the endonym and exonym for a single language code.
 *
 * @param {Str} code - BCP 47 language code (e.g., 'ja', 'fr')
 * @param {Str} currentLocale - The locale to generate the exonym in (e.g., 'en')
 * @returns {Result<LanguageDisplayInfo>} Result containing code, endonym, and exonym
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
  const codeResult: Result<Str> = safeParse(StrSchema, code);

  if (!codeResult.ok) {
    return err(ERRORS.LOCALE.INVALID_LOCALE, 'Language code must be a valid string');
  }

  if (codeResult.data.length === 0) {
    return err(ERRORS.LOCALE.INVALID_LOCALE, 'Language code must be non-empty');
  }

  const localeResult: Result<Str> = safeParse(StrSchema, currentLocale);

  if (!localeResult.ok) {
    return err(ERRORS.LOCALE.INVALID_LOCALE, 'Current locale must be a valid string');
  }
  if (localeResult.data.length === 0) {
    return err(ERRORS.LOCALE.INVALID_LOCALE, 'Current locale must be non-empty');
  }

  const endonymDisplay: Intl.DisplayNames = new Intl.DisplayNames([codeResult.data], {
    type: 'language',
  });
  const exonymDisplay: Intl.DisplayNames = new Intl.DisplayNames([localeResult.data], {
    type: 'language',
  });

  const endonym: OptionalStr = endonymDisplay.of(codeResult.data);
  const exonym: OptionalStr = exonymDisplay.of(codeResult.data);

  if (!endonym || !exonym) {
    return err(
      ERRORS.LOCALE.INVALID_LOCALE,
      `Cannot resolve display name for language code: ${code}`,
    );
  }

  return ok(LanguageDisplayInfoSchema, { code: codeResult.data, endonym, exonym });
}

/**
 * Gets display name information for multiple language codes.
 *
 * @param {readonly Str[]} codes - Array of BCP 47 language codes
 * @param {Str} currentLocale - The locale to generate exonyms in
 * @returns {Result<LanguageDisplayInfo[]>} Result containing an array of LanguageDisplayInfo
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
  const codesResult: Result<StrArray> = safeParse(StrArraySchema, [...codes]);

  if (!codesResult.ok) {
    return codesResult;
  }

  const localeResult: Result<Str> = safeParse(StrSchema, currentLocale);

  if (!localeResult.ok) {
    return localeResult;
  }

  const results: LanguageDisplayInfo[] = [];

  for (const code of codesResult.data) {
    const result: Result<LanguageDisplayInfo> = getLanguageDisplayName(code, localeResult.data);

    if (!result.ok) {
      return result;
    }
    results.push(result.data);
  }
  return ok(v.array(LanguageDisplayInfoSchema), results);
}
