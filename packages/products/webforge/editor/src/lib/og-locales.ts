/**
 * Open Graph locale mapping.
 *
 * Maps editor locale codes to BCP 47-style `xx_YY` format
 * used by `og:locale` meta tags. Keyed by {@link SUPPORTED_LOCALES} codes.
 *
 * When adding a new locale to `SUPPORTED_LOCALES`, add a corresponding
 * entry here — TypeScript will error if a locale code is missing.
 *
 * @module
 */

import * as v from 'valibot';
import type { SUPPORTED_LOCALES } from '$lib/schemas/editor-state';

/** Schema for a single OG locale string (e.g. `'en_US'`). */
export const OgLocaleSchema = v.string();

/** Schema for the full OG locale mapping record. */
export const OgLocalesSchema = v.record(v.string(), OgLocaleSchema);

/**
 * Maps supported locale codes to Open Graph locale format.
 * Typed against {@link SUPPORTED_LOCALES} so missing entries cause compile errors.
 */
export const OG_LOCALES: Readonly<Record<(typeof SUPPORTED_LOCALES)[number], string>> = {
	en: 'en_US',
	ja: 'ja_JP',
	zh: 'zh_CN',
	ko: 'ko_KR',
	fr: 'fr_FR',
	de: 'de_DE',
	es: 'es_ES',
};
