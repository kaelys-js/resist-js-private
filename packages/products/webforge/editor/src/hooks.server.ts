import type { Handle, HandleServerError } from '@sveltejs/kit';
import { getTextDirection } from '@/locale/direction';
import { resolveLocale } from '$lib/server/locale-detection';

/** Security headers applied to every response. */
const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
	['X-Frame-Options', 'DENY'],
	['X-Content-Type-Options', 'nosniff'],
	['Referrer-Policy', 'strict-origin-when-cross-origin'],
	['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
	['Cross-Origin-Opener-Policy', 'same-origin'],
];

export const handle: Handle = async ({ event, resolve }) => {
	const cookie: string = event.cookies.get('locale') ?? '';
	const header: string | null = event.request.headers.get('accept-language');
	const locale: string = resolveLocale(cookie, header);

	event.locals.locale = locale;
	const dirResult = getTextDirection(locale);
	const dir: string = dirResult.ok ? dirResult.data : 'ltr';

	const response: Response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale).replace('%dir%', dir),
	});

	for (const [name, value] of SECURITY_HEADERS) {
		response.headers.set(name, value);
	}

	return response;
};

/**
 * Handles unexpected server errors by generating a unique error ID and logging the error.
 *
 * @param params - Error event containing the error, status, and message
 * @param params.error - The thrown error object
 * @param params.event - The request event, used to set response headers
 * @param params.status - HTTP status code
 * @param params.message - User-safe error message from SvelteKit
 * @returns App.Error with message and errorId for client display
 *
 * @example
 * // SvelteKit calls this automatically for unhandled errors
 * // The returned object becomes `page.error` in +error.svelte
 */
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const errorId: string = crypto.randomUUID();
	// oxlint-disable-next-line no-console -- Intentional error logging for server diagnostics
	console.error(`[${errorId}] Unexpected server error (${status}):`, error);
	event.setHeaders({ 'x-error-id': errorId });
	return { message, errorId };
};
