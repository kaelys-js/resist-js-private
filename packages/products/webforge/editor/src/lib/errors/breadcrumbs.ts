/**
 * Error Reporting Breadcrumbs
 *
 * Populates the global breadcrumb trail (from `@/utils/result/breadcrumbs`)
 * with navigation and fetch events. These breadcrumbs are automatically
 * included in `CapturedError` envelopes and sent via the error beacon.
 *
 * Two categories of breadcrumbs:
 *
 * 1. **Navigation** — route changes tracked via `addNavigationBreadcrumb()`,
 *    called from `+layout.svelte` which has access to SvelteKit lifecycle.
 *
 * 2. **Fetch** — HTTP requests tracked by wrapping `globalThis.fetch` via
 *    `initFetchBreadcrumbs()`, called once from `hooks.client.ts`.
 *
 * @module
 */

import type { Str, Void } from '@/schemas/common';
import type { BreadcrumbLevel } from '@/schemas/result/captured-error';
import { addBreadcrumb } from '@/utils/result/breadcrumbs';

/** Original fetch reference, saved for teardown. */
let _originalFetch: typeof globalThis.fetch | null = null;

/** Fetch endpoints to skip (avoids recursion with beacon endpoint). */
const SKIP_URLS: readonly string[] = ['/api/errors'];

// =============================================================================
// Navigation Breadcrumbs
// =============================================================================

/**
 * Adds a navigation breadcrumb to the global trail.
 *
 * Called from `+layout.svelte` on route changes (via `beforeNavigate`
 * or `afterNavigate`). `from` is null on initial page load.
 *
 * @param from - The URL path being navigated away from (null on initial load).
 * @param to - The URL path being navigated to.
 *
 * @example
 * ```typescript
 * import { addNavigationBreadcrumb } from '$lib/errors/breadcrumbs';
 *
 * afterNavigate(({ from, to }) => {
 *   addNavigationBreadcrumb(
 *     from?.url.pathname ?? null,
 *     to?.url.pathname ?? '/',
 *   );
 * });
 * ```
 */
export function addNavigationBreadcrumb(from: Str | null, to: Str): Void {
	const fromLabel: Str = (from ?? '(initial)') as Str;
	addBreadcrumb({
		type: 'navigation',
		category: 'route',
		message: `${fromLabel} → ${to}`,
		level: 'info',
	});
}

// =============================================================================
// Fetch Breadcrumbs
// =============================================================================

/**
 * Wraps `globalThis.fetch` to add HTTP breadcrumbs for every request.
 *
 * Records the method, URL, and status code (or error message) for each
 * fetch call. Skips breadcrumbs for the beacon endpoint (`/api/errors`)
 * to prevent recursion.
 *
 * Call once from `hooks.client.ts` during initialization. Call
 * `teardownFetchBreadcrumbs()` to restore the original `fetch`.
 *
 * @example
 * ```typescript
 * import { initFetchBreadcrumbs } from '$lib/errors/breadcrumbs';
 *
 * initFetchBreadcrumbs();
 * ```
 */
export function initFetchBreadcrumbs(): Void {
	// Already initialized — skip
	if (_originalFetch !== null) return;

	_originalFetch = globalThis.fetch;
	const original: typeof fetch = _originalFetch;

	globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url: Str = extractUrl(input);
		const method: Str = extractMethod(input, init);

		// Skip beacon endpoint to avoid infinite recursion
		if (SKIP_URLS.some((skip) => url.includes(skip))) {
			return original(input, init);
		}

		try {
			const response: Response = await original(input, init);
			const level: BreadcrumbLevel = response.ok ? 'info' : 'error';
			addBreadcrumb({
				type: 'http',
				category: 'fetch',
				message: `${method} ${url} → ${String(response.status)}`,
				level,
				data: { method, url, status_code: response.status },
			});
			return response;
		} catch (error: unknown) {
			const message: Str = (error instanceof Error ? error.message : 'Unknown error') as Str;
			addBreadcrumb({
				type: 'http',
				category: 'fetch',
				message: `${method} ${url} → ${message}`,
				level: 'warning',
				data: { method, url, error: message },
			});
			throw error;
		}
	};
}

/**
 * Restores the original `globalThis.fetch`, removing the breadcrumb wrapper.
 *
 * Safe to call multiple times — no-op if not initialized.
 */
export function teardownFetchBreadcrumbs(): Void {
	if (_originalFetch !== null) {
		globalThis.fetch = _originalFetch;
		_originalFetch = null;
	}
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extracts the URL string from a fetch input.
 *
 * @param input - The fetch input (string, URL, or Request).
 * @returns The URL as a string.
 */
function extractUrl(input: RequestInfo | URL): Str {
	if (typeof input === 'string') return input as Str;
	if (input instanceof URL) return input.pathname as Str;
	// oxlint-disable-next-line no-undef -- Request is a browser global
	if (input instanceof Request) return input.url as Str;
	return '(unknown)' as Str;
}

/**
 * Extracts the HTTP method from a fetch input.
 *
 * @param input - The fetch input.
 * @param init - The fetch init options.
 * @returns The HTTP method (defaults to 'GET').
 */
function extractMethod(input: RequestInfo | URL, init?: RequestInit): Str {
	if (init?.method) return init.method.toUpperCase() as Str;
	// oxlint-disable-next-line no-undef -- Request is a browser global
	if (input instanceof Request) return input.method.toUpperCase() as Str;
	return 'GET' as Str;
}
