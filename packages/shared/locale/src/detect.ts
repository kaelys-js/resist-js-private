/**
 * Locale Detection
 *
 * Detects the user's preferred locale from browser, URL, cookie, or
 * Accept-Language header. Runtime-agnostic — works in browsers, SvelteKit
 * server hooks, and Cloudflare Workers.
 *
 * Every function validates inputs via `safeParse` and returns `Result<T>`.
 * No function throws.
 *
 * @module
 */

import * as v from 'valibot';

import {
	NonNegativeIntegerSchema,
	NullableStrSchema,
	StrArraySchema,
	StrSchema,
	type NonNegativeInteger,
	type NullableStr,
	type Num,
	type Str,
	type StrArray,
} from '@/schemas/common';
import { type DeepReadonly, type Result, ok, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Valibot schema for navigator detection source. */
const NavigatorSourceSchema = v.strictObject({
	kind: v.literal('navigator'),
});

/** Valibot schema for URL path detection source. */
const UrlPathSourceSchema = v.strictObject({
	kind: v.literal('url-path'),
	index: NonNegativeIntegerSchema,
});

/** Valibot schema for URL query detection source. */
const UrlQuerySourceSchema = v.strictObject({
	kind: v.literal('url-query'),
	key: StrSchema,
});

/** Valibot schema for cookie detection source. */
const CookieSourceSchema = v.strictObject({
	kind: v.literal('cookie'),
	key: StrSchema,
});

/** Valibot schema for Accept-Language header detection source. */
const HeaderSourceSchema = v.strictObject({
	kind: v.literal('header'),
	value: StrSchema,
});

/** Valibot schema for localStorage detection source. */
const StorageSourceSchema = v.strictObject({
	kind: v.literal('storage'),
	key: StrSchema,
});

/** Valibot discriminated union schema for detection sources. */
const DetectionSourceSchema = v.variant('kind', [
	NavigatorSourceSchema,
	UrlPathSourceSchema,
	UrlQuerySourceSchema,
	CookieSourceSchema,
	HeaderSourceSchema,
	StorageSourceSchema,
]);

/** A detection source to try, in priority order. */
type _DetectionSource = v.InferOutput<typeof DetectionSourceSchema>;

/** Valibot schema for locale detection configuration. */
const DetectLocaleOptionsSchema = v.strictObject({
	/** Available locale codes to match against. */
	available: StrArraySchema,
	/** Fallback locale if no source matches. */
	fallback: StrSchema,
	/** Detection sources to try, in priority order. */
	sources: v.array(DetectionSourceSchema),
});

/** Configuration for locale detection. */
type DetectLocaleOptions = v.InferOutput<typeof DetectLocaleOptionsSchema>;

// =============================================================================
// BCP 47 Matching
// =============================================================================

/**
 * Matches a language tag against available locales with BCP 47 fallback.
 * Tries exact match first (e.g., `'en-US'`), then base language (`'en'`).
 *
 * @param tag - The BCP 47 language tag. Validated via `StrSchema`.
 * @param available - Available locale codes. Validated via `StrArraySchema`.
 * @returns `Result<NullableStr>` — matched locale or `null` if no match.
 *
 * @example
 * ```typescript
 * const result = matchLocale('en-US', ['en', 'es', 'de']);
 * // ok('en')
 * ```
 */
export function matchLocale(tag: Str, available: readonly Str[]): Result<NullableStr> {
	const tagResult: Result<Str> = safeParse(StrSchema, tag);
	if (!tagResult.ok) return tagResult;
	const availableResult: Result<StrArray> = safeParse(StrArraySchema, [...available]);
	if (!availableResult.ok) return availableResult;

	const normalized: Str = tagResult.data.toLowerCase();

	// Exact match
	for (const code of availableResult.data) {
		if (code.toLowerCase() === normalized) {
			return ok(NullableStrSchema, code);
		}
	}

	// Base language fallback (e.g., 'en-US' → 'en')
	const baseLang: Str = normalized.split('-')[0] ?? normalized;
	for (const code of availableResult.data) {
		if (code.toLowerCase() === baseLang) {
			return ok(NullableStrSchema, code);
		}
	}

	return ok(NullableStrSchema, null);
}

// =============================================================================
// Individual Detectors
// =============================================================================

/**
 * Detects locale from `navigator.language` / `navigator.languages`.
 * Walks the browser's language preference list and returns the first match.
 *
 * @param available - Available locale codes. Validated via `StrArraySchema`.
 * @returns `Result<NullableStr>` — detected locale or `null` if not in browser or no match.
 *
 * @example
 * ```typescript
 * // In browser with navigator.languages = ['en-US', 'fr']
 * const result = detectFromNavigator(['en', 'fr', 'de']);
 * // ok('en')
 * ```
 */
export function detectFromNavigator(available: readonly Str[]): Result<NullableStr> {
	const availableResult: Result<StrArray> = safeParse(StrArraySchema, [...available]);
	if (!availableResult.ok) return availableResult;

	if (globalThis.navigator === undefined) {
		return ok(NullableStrSchema, null);
	}

	const languages: readonly Str[] = globalThis.navigator.languages ?? [
		globalThis.navigator.language,
	];

	for (const lang of languages) {
		const matchResult: Result<NullableStr> = matchLocale(lang, availableResult.data);
		if (!matchResult.ok) return matchResult;
		if (matchResult.data !== null) return matchResult;
	}

	return ok(NullableStrSchema, null);
}

/**
 * Detects locale from an `Accept-Language` header value.
 * Parses quality values (e.g., `en-US,en;q=0.9,fr;q=0.8`) and returns
 * the best match sorted by quality descending.
 *
 * @param header - The `Accept-Language` header string. Validated via `StrSchema`.
 * @param available - Available locale codes. Validated via `StrArraySchema`.
 * @returns `Result<NullableStr>` — best matching locale or `null`.
 *
 * @example
 * ```typescript
 * const result = detectFromAcceptLanguage('en-US,en;q=0.9,fr;q=0.8', ['en', 'fr']);
 * // ok('en')
 * ```
 */
export function detectFromAcceptLanguage(
	header: Str,
	available: readonly Str[],
): Result<NullableStr> {
	const headerResult: Result<Str> = safeParse(StrSchema, header);
	if (!headerResult.ok) return headerResult;
	const availableResult: Result<StrArray> = safeParse(StrArraySchema, [...available]);
	if (!availableResult.ok) return availableResult;

	// Parse "lang;q=value" pairs and sort by quality descending
	const entries: Array<{ readonly lang: Str; readonly quality: Num }> = headerResult.data
		.split(',')
		.map((part: Str) => {
			const [lang, ...rest]: Str[] = part.trim().split(';');
			let quality: Num = 1;
			for (const param of rest) {
				const qMatch: Str | null = param.trim().match(/^q=(\d+(?:\.\d+)?)$/)?.[1] ?? null;
				if (qMatch !== null) quality = Number(qMatch);
			}
			return { lang: (lang ?? '').trim(), quality };
		})
		.filter((entry) => entry.lang.length > 0)
		.toSorted((a, b) => b.quality - a.quality);

	for (const entry of entries) {
		const matchResult: Result<NullableStr> = matchLocale(entry.lang, availableResult.data);
		if (!matchResult.ok) return matchResult;
		if (matchResult.data !== null) return matchResult;
	}

	return ok(NullableStrSchema, null);
}

/**
 * Detects locale from a URL path segment.
 *
 * @param url - The URL to parse. Validated via `StrSchema`.
 * @param segmentIndex - Path segment index (0-based) containing the locale. Validated via `NonNegativeIntegerSchema`.
 * @param available - Available locale codes. Validated via `StrArraySchema`.
 * @returns `Result<NullableStr>` — detected locale or `null`.
 *
 * @example
 * ```typescript
 * const result = detectFromUrlPath('https://example.com/en/about', 0, ['en', 'fr']);
 * // ok('en')
 * ```
 */
export function detectFromUrlPath(
	url: Str,
	segmentIndex: NonNegativeInteger,
	available: readonly Str[],
): Result<NullableStr> {
	const urlResult: Result<Str> = safeParse(StrSchema, url);
	if (!urlResult.ok) return urlResult;
	const indexResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, segmentIndex);
	if (!indexResult.ok) return indexResult;
	const availableResult: Result<StrArray> = safeParse(StrArraySchema, [...available]);
	if (!availableResult.ok) return availableResult;

	try {
		const parsed: URL = new URL(urlResult.data);
		const segments: Str[] = parsed.pathname.split('/').filter((s: Str) => s.length > 0);
		const segment: Str | undefined = segments[indexResult.data as unknown as number];
		if (!segment) return ok(NullableStrSchema, null);
		return matchLocale(segment, availableResult.data);
	} catch {
		return ok(NullableStrSchema, null);
	}
}

/**
 * Detects locale from a URL query parameter.
 *
 * @param url - The URL to parse. Validated via `StrSchema`.
 * @param paramName - The query parameter name. Validated via `StrSchema`.
 * @param available - Available locale codes. Validated via `StrArraySchema`.
 * @returns `Result<NullableStr>` — detected locale or `null`.
 *
 * @example
 * ```typescript
 * const result = detectFromUrlQuery('https://example.com?lang=fr', 'lang', ['en', 'fr']);
 * // ok('fr')
 * ```
 */
export function detectFromUrlQuery(
	url: Str,
	paramName: Str,
	available: readonly Str[],
): Result<NullableStr> {
	const urlResult: Result<Str> = safeParse(StrSchema, url);
	if (!urlResult.ok) return urlResult;
	const paramResult: Result<Str> = safeParse(StrSchema, paramName);
	if (!paramResult.ok) return paramResult;
	const availableResult: Result<StrArray> = safeParse(StrArraySchema, [...available]);
	if (!availableResult.ok) return availableResult;

	try {
		const parsed: URL = new URL(urlResult.data);
		const value: Str | null = parsed.searchParams.get(paramResult.data);
		if (!value) return ok(NullableStrSchema, null);
		return matchLocale(value, availableResult.data);
	} catch {
		return ok(NullableStrSchema, null);
	}
}

/**
 * Detects locale from a cookie value.
 *
 * @param cookieHeader - The `Cookie` header string (e.g., `"lang=en; theme=dark"`). Validated via `StrSchema`.
 * @param cookieName - The cookie name to read. Validated via `StrSchema`.
 * @param available - Available locale codes. Validated via `StrArraySchema`.
 * @returns `Result<NullableStr>` — detected locale or `null`.
 *
 * @example
 * ```typescript
 * const result = detectFromCookie('lang=fr; theme=dark', 'lang', ['en', 'fr']);
 * // ok('fr')
 * ```
 */
export function detectFromCookie(
	cookieHeader: Str,
	cookieName: Str,
	available: readonly Str[],
): Result<NullableStr> {
	const headerResult: Result<Str> = safeParse(StrSchema, cookieHeader);
	if (!headerResult.ok) return headerResult;
	const nameResult: Result<Str> = safeParse(StrSchema, cookieName);
	if (!nameResult.ok) return nameResult;
	const availableResult: Result<StrArray> = safeParse(StrArraySchema, [...available]);
	if (!availableResult.ok) return availableResult;

	const cookies: Str[] = headerResult.data.split(';').map((s: Str) => s.trim());
	for (const cookie of cookies) {
		const eqIndex: Num = cookie.indexOf('=');
		if (eqIndex === -1) continue;
		const name: Str = cookie.slice(0, eqIndex).trim();
		const value: Str = cookie.slice(eqIndex + 1).trim();
		if (name === nameResult.data) {
			return matchLocale(value, availableResult.data);
		}
	}

	return ok(NullableStrSchema, null);
}

// =============================================================================
// Main Detector
// =============================================================================

/**
 * Detects the user's preferred locale from configured sources.
 * Walks `sources` in order. Returns the first match against `available`,
 * or `fallback` if no source matches.
 *
 * @param options - Detection configuration (available locales, fallback, sources). Validated via `DetectLocaleOptionsSchema`.
 * @returns `Result<Str>` — the detected locale code.
 *
 * @example
 * ```typescript
 * const result = detectLocale({
 *   available: ['en', 'fr', 'de'],
 *   fallback: 'en',
 *   sources: [
 *     { kind: 'url-query', key: 'lang' },
 *     { kind: 'cookie', key: 'locale' },
 *     { kind: 'navigator' },
 *   ],
 * });
 * ```
 */
export function detectLocale(options: DetectLocaleOptions): Result<Str> {
	const optionsResult: Result<DetectLocaleOptions> = safeParse(DetectLocaleOptionsSchema, options);
	if (!optionsResult.ok) return optionsResult;

	const validated: DeepReadonly<DetectLocaleOptions> = optionsResult.data;

	for (const source of validated.sources) {
		let matchResult: Result<NullableStr>;

		switch (source.kind) {
			case 'navigator': {
				matchResult = detectFromNavigator(validated.available);
				break;
			}
			case 'url-path': {
				// url-path needs current URL — use globalThis.location if available
				if (globalThis.location === undefined) {
					continue;
				} else {
					matchResult = detectFromUrlPath(
						globalThis.location.href,
						source.index as unknown as NonNegativeInteger,
						validated.available,
					);
				}
				break;
			}
			case 'url-query': {
				if (globalThis.location === undefined) {
					continue;
				} else {
					matchResult = detectFromUrlQuery(
						globalThis.location.href,
						source.key,
						validated.available,
					);
				}
				break;
			}
			case 'cookie': {
				if (globalThis.document === undefined) {
					continue;
				} else {
					matchResult = detectFromCookie(
						globalThis.document.cookie,
						source.key,
						validated.available,
					);
				}
				break;
			}
			case 'header': {
				matchResult = detectFromAcceptLanguage(source.value, validated.available);
				break;
			}
			case 'storage': {
				if (globalThis.localStorage === undefined) {
					continue;
				} else {
					const stored: Str | null = globalThis.localStorage.getItem(source.key);
					if (stored) {
						matchResult = matchLocale(stored, validated.available);
					} else {
						continue;
					}
				}
				break;
			}
			default: {
				continue;
			}
		}

		if (!matchResult.ok) return matchResult;
		if (matchResult.data !== null) {
			return okUnchecked<Str>(matchResult.data);
		}
	}

	return ok(StrSchema, validated.fallback);
}
