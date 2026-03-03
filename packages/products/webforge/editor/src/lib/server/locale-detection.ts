/**
 * SSR Locale Detection
 *
 * Pure functions for detecting user locale from HTTP headers and cookies.
 * Extracted from hooks.server.ts for testability.
 *
 * @module
 */

/** All locale codes the editor supports. */
export const SUPPORTED_LOCALE_CODES = new Set(['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es']);

/**
 * Detects the best matching locale from an Accept-Language header.
 *
 * @param acceptLanguage - The raw Accept-Language header value, or null
 * @returns The first supported locale code found, or empty string if none match
 *
 * @example
 * ```typescript
 * detectFromHeader('ja,en-US;q=0.9,en;q=0.8'); // 'ja'
 * detectFromHeader('pt-BR,pt;q=0.9');            // '' (unsupported)
 * detectFromHeader(null);                         // ''
 * ```
 */
export function detectFromHeader(acceptLanguage: string | null): string {
	if (!acceptLanguage) return '';
	const tags: readonly string[] = acceptLanguage
		.split(',')
		.map((s) => s.split(';')[0]?.trim() ?? '');
	for (const tag of tags) {
		const code: string = (tag.split('-')[0] ?? '').toLowerCase();
		if (SUPPORTED_LOCALE_CODES.has(code)) return code;
	}
	return '';
}

/**
 * Resolves the effective locale from cookie and Accept-Language header.
 *
 * Priority: cookie > Accept-Language > 'en' default.
 *
 * @param cookie - The locale cookie value (may be empty)
 * @param acceptLanguage - The Accept-Language header value, or null
 * @returns The resolved locale code (always a valid supported locale)
 *
 * @example
 * ```typescript
 * resolveLocale('ja', null);                       // 'ja' (cookie wins)
 * resolveLocale('', 'fr,en;q=0.9');                // 'fr' (header fallback)
 * resolveLocale('', null);                         // 'en' (default)
 * resolveLocale('invalid', 'ko');                  // 'ko' (invalid cookie, header fallback)
 * ```
 */
export function resolveLocale(cookie: string, acceptLanguage: string | null): string {
	if (SUPPORTED_LOCALE_CODES.has(cookie)) return cookie;
	const fromHeader: string = detectFromHeader(acceptLanguage);
	if (SUPPORTED_LOCALE_CODES.has(fromHeader)) return fromHeader;
	return 'en';
}
