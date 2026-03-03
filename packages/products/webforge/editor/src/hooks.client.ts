import type { HandleClientError } from '@sveltejs/kit';

/**
 * Handles unexpected client errors by generating a unique error ID and logging the error.
 *
 * @param params - Error event containing the error, status, and message
 * @param params.error - The thrown error object
 * @param params.status - HTTP status code
 * @param params.message - User-safe error message from SvelteKit
 * @returns App.Error with message and errorId for client display
 *
 * @example
 * // SvelteKit calls this automatically for unhandled client errors
 * // The returned object becomes `page.error` in +error.svelte
 */
export const handleError: HandleClientError = ({ error, status, message }) => {
	const errorId: string = crypto.randomUUID();
	// oxlint-disable-next-line no-console -- Intentional error logging for client diagnostics
	console.error(`[${errorId}] Unexpected client error (${status}):`, error);
	return { message, errorId };
};
