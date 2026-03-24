/**
 * Text Direction Detection
 *
 * Determines text direction (LTR vs RTL) for a given locale.
 * Essential for RTL language support (Arabic, Hebrew, Urdu, etc.).
 *
 * Uses `Intl.Locale.prototype.getTextInfo()` where available (modern browsers,
 * Node 21+), with fallback to a static set of known RTL scripts and language codes.
 *
 * Every function validates inputs via `safeParse` and returns `Result<T>`.
 * No function throws.
 *
 * @module
 */

import * as v from 'valibot';

import { StrSchema, type Str, type OptionalStr } from '@/schemas/common';
import { type Result, ok } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Valibot schema for text direction values. */
export const TextDirectionSchema = v.picklist(['ltr', 'rtl']);

/** Text direction: `'ltr'` (left-to-right) or `'rtl'` (right-to-left). See {@link TextDirectionSchema}. */
export type TextDirection = v.InferOutput<typeof TextDirectionSchema>;

// =============================================================================
// RTL Language/Script Data
// =============================================================================

/**
 * Set of BCP 47 language subtags whose primary script is RTL.
 *
 * Conservative list — only languages with well-established RTL writing systems.
 * Sources: Unicode CLDR, ICU, W3C Internationalization.
 */
const RTL_LANGUAGES: ReadonlySet<Str> = new Set([
  'ar', // Arabic
  'arc', // Aramaic
  'dv', // Divehi/Maldivian
  'fa', // Persian (Farsi)
  'he', // Hebrew
  'khw', // Khowar
  'ks', // Kashmiri
  // Note: Kurdish (ku) is NOT included — Kurmanji uses Latin, Sorani uses Arabic.
  // Use ku-Arab for RTL Kurdish. The script subtag handles this via RTL_SCRIPTS.
  'ps', // Pashto
  'sd', // Sindhi
  'ur', // Urdu
  'yi', // Yiddish
]);

/**
 * Set of ISO 15924 script codes that are RTL.
 * Used when a locale has an explicit script subtag (e.g., `az-Arab`).
 */
const RTL_SCRIPTS: ReadonlySet<Str> = new Set([
  'adlm', // Adlam
  'arab', // Arabic
  'aran', // Arabic (Nastaliq)
  'hebr', // Hebrew
  'mand', // Mandaic
  'mend', // Mende Kikakui
  'nkoo', // N'Ko
  'samr', // Samaritan
  'syrc', // Syriac
  'thaa', // Thaana
]);

// =============================================================================
// Detection
// =============================================================================

/**
 * Determines the text direction for a locale.
 *
 * Uses a two-tier strategy:
 * 1. If `Intl.Locale.prototype.getTextInfo` is available (Node 21+, modern browsers),
 *    uses the platform's own text info data.
 * 2. Otherwise falls back to static sets of known RTL languages and scripts.
 *
 * @param {Str} locale - BCP 47 locale tag (e.g., `'ar'`, `'he-IL'`, `'en-US'`). Validated via `StrSchema`.
 * @returns {Result<TextDirection>} `'ltr'` or `'rtl'`.
 *
 * @example
 * ```typescript
 * getTextDirection('ar');     // ok('rtl')
 * getTextDirection('he-IL');  // ok('rtl')
 * getTextDirection('en-US');  // ok('ltr')
 * getTextDirection('fa');     // ok('rtl')
 * getTextDirection('de');     // ok('ltr')
 * ```
 */
export function getTextDirection(locale: Str): Result<TextDirection> {
  const localeResult: Result<Str> = safeParse(StrSchema, locale);
  if (!localeResult.ok) return localeResult;

  // Strategy 1: Use Intl.Locale.getTextInfo() if available
  try {
    const intlLocale: Intl.Locale = new Intl.Locale(localeResult.data);
    // getTextInfo() — Node 21+, Chrome 99+
    if (
      'getTextInfo' in intlLocale &&
      typeof (intlLocale as Record<Str, unknown>).getTextInfo === 'function' // cast safe: guarded by 'getTextInfo' in intlLocale
    ) {
      const textInfo: { direction: Str } = (
        intlLocale as Record<Str, unknown> & { getTextInfo: () => { direction: Str } } // cast safe: irreducible — getTextInfo not in all TS lib targets
      ).getTextInfo();
      if (textInfo.direction === 'rtl') return ok(TextDirectionSchema, 'rtl');
      return ok(TextDirectionSchema, 'ltr');
    }
    // textInfo property (Safari)
    if ('textInfo' in intlLocale) {
      const { textInfo }: { textInfo: { direction: Str } } = intlLocale as Record<Str, unknown> & {
        textInfo: { direction: Str };
      }; // cast safe: irreducible — textInfo property not in all TS lib targets
      if (textInfo?.direction === 'rtl') return ok(TextDirectionSchema, 'rtl');
      return ok(TextDirectionSchema, 'ltr');
    }
  } catch {
    // Intl.Locale constructor failed — fall through to static lookup
  }

  // Strategy 2: Static lookup
  const normalized: Str = localeResult.data.toLowerCase();
  const parts: Str[] = normalized.split('-');
  const lang: Str = parts[0] ?? '';
  const script: OptionalStr =
    parts.length >= 2 && (parts[1] ?? '').length === 4 ? parts[1] : undefined;

  // Check script subtag first (most specific)
  if (script && RTL_SCRIPTS.has(script)) {
    return ok(TextDirectionSchema, 'rtl');
  }

  // Check language subtag
  if (RTL_LANGUAGES.has(lang)) {
    return ok(TextDirectionSchema, 'rtl');
  }

  return ok(TextDirectionSchema, 'ltr');
}
