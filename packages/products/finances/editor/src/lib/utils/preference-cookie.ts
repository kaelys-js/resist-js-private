/**
 * Preference cookie utility for SSR hydration flash prevention.
 *
 * Reads and writes small preference cookies (sidebar width, theme) so that
 * `hooks.server.ts` can inject correct values into the HTML via
 * `transformPageChunk` — preventing layout shift and theme flash during
 * Svelte hydration.
 *
 * All cookie values are sanitized before use to prevent XSS injection via
 * HTML attribute interpolation.
 *
 * @module
 */

import type { Str, Num, Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';
import { SUPPORTED_THEMES } from '$lib/schemas/editor-state';
import { STORAGE_PREFIX } from '$lib/config/app-meta';

/** Cookie max-age: 1 year in seconds. */
const MAX_AGE: Num = 31_536_000;

/** Minimum valid sidebar width in pixels. */
const SIDEBAR_MIN_PX: Num = 100;

/** Maximum valid sidebar width in pixels. */
const SIDEBAR_MAX_PX: Num = 1000;

/**
 * Sets a namespaced preference cookie.
 *
 * The cookie is set with `max-age=1y`, `path=/`, and `SameSite=Lax` to
 * ensure it's sent with every SSR request and persists across sessions.
 *
 * @param name - Cookie suffix (e.g. `'sidebar-px'` → `'finances:sidebar-px'`)
 * @param value - Cookie value (must be pre-sanitized by caller)
 * @returns Result indicating success
 *
 * @example
 * setPreferenceCookie('sidebar-px', '350');
 * // Sets: finances:sidebar-px=350; max-age=31536000; path=/; SameSite=Lax
 */
export function setPreferenceCookie(name: Str, value: Str): Result<Void> {
	const cookieName: Str = `${STORAGE_PREFIX}:${name}`;
	// oxlint-disable-next-line unicorn/no-document-cookie -- Cookie Store API is async and lacks SSR/Safari support; synchronous set needed
	document.cookie = `${cookieName}=${value}; max-age=${String(MAX_AGE)}; path=/; SameSite=Lax`;
	return okUnchecked<Void>(undefined);
}

/**
 * Reads a namespaced preference cookie value.
 *
 * @param name - Cookie suffix (e.g. `'sidebar-px'` → looks for `'finances:sidebar-px'`)
 * @returns The cookie value, or `null` if not found
 *
 * @example
 * const width = getPreferenceCookie('sidebar-px'); // '350' | null
 */
export function getPreferenceCookie(name: Str): Str | null {
	const cookieName: Str = `${STORAGE_PREFIX}:${name}=`;
	// oxlint-disable-next-line unicorn/no-document-cookie -- Cookie Store API is async and lacks SSR/Safari support; synchronous read needed
	const cookies: Str = document.cookie;
	if (!cookies) return null;

	const parts: Str[] = cookies.split(';');
	for (const part of parts) {
		const trimmed: Str = part.trim();
		if (trimmed.startsWith(cookieName)) {
			return trimmed.slice(cookieName.length).trim();
		}
	}
	return null;
}

/**
 * Sanitizes a raw sidebar width cookie value.
 *
 * Validates that the value is a finite number within the allowed range
 * [100, 1000]. Returns `null` for any invalid input (non-numeric, out of
 * range, NaN, Infinity, XSS attempts).
 *
 * @param raw - Raw cookie string value, or `null`
 * @returns Sanitized pixel width as integer, or `null` if invalid
 *
 * @example
 * sanitizeSidebarWidth('350')      // 350
 * sanitizeSidebarWidth('50')       // null (below min)
 * sanitizeSidebarWidth('"><script>') // null (non-numeric)
 */
export function sanitizeSidebarWidth(raw: Str | null): Num | null {
	if (raw === null || raw === '') return null;
	const parsed: Num = Number(raw);
	if (!Number.isFinite(parsed)) return null;
	const rounded: Num = Math.round(parsed);
	if (rounded < SIDEBAR_MIN_PX || rounded > SIDEBAR_MAX_PX) return null;
	return rounded;
}

/**
 * Sanitizes a raw sidebar open/closed state cookie value.
 *
 * Accepts only `'true'` or `'false'` strings. Returns `null` for any
 * invalid or missing input so the caller can fall back to the store default.
 *
 * @param raw - Raw cookie string value, or `null`
 * @returns `true` (expanded), `false` (collapsed), or `null` (unknown/invalid)
 *
 * @example
 * sanitizeSidebarOpen('true')         // true
 * sanitizeSidebarOpen('false')        // false
 * sanitizeSidebarOpen('"><script>')   // null (XSS attempt)
 */
export function sanitizeSidebarOpen(raw: Str | null): boolean | null {
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	return null;
}

/**
 * Sanitizes a raw theme cookie value.
 *
 * Validates against the `SUPPORTED_THEMES` picklist. Returns empty string
 * (default theme) for any invalid or unsupported value.
 *
 * @param raw - Raw cookie string value, or `null`
 * @returns Valid theme identifier, or `''` (default) if invalid
 *
 * @example
 * sanitizeTheme('midnight')       // 'midnight'
 * sanitizeTheme('neon')           // '' (unsupported)
 * sanitizeTheme('"><script>')     // '' (XSS attempt)
 */
export function sanitizeTheme(raw: Str | null): Str {
	if (raw === null) return '';
	// SUPPORTED_THEMES includes '' (default), so this check covers all valid values
	if ((SUPPORTED_THEMES as readonly Str[]).includes(raw)) return raw;
	return '';
}
