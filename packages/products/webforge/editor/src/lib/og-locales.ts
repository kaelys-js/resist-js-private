/**
 * Open Graph locale mapping.
 *
 * Maps editor locale codes to BCP 47-style `xx_YY` format
 * used by `og:locale` meta tags.
 *
 * @module
 */

/** Maps supported locale codes to Open Graph locale format. */
export const OG_LOCALES: Readonly<Record<string, string>> = {
	// TODO: Valibot Type + Should Be Dynamic Based On Available Locales
	en: 'en_US',
	ja: 'ja_JP',
	zh: 'zh_CN',
	ko: 'ko_KR',
	fr: 'fr_FR',
	de: 'de_DE',
	es: 'es_ES',
};
