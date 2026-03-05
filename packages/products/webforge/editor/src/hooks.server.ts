import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building, dev } from '$app/environment';
import type { Bool } from '@/schemas/common';
import type { CapturedError } from '@/schemas/result/captured-error';
import { getTextDirection } from '@/locale/direction';
import { ERRORS, err, type AppError } from '@/schemas/result/result';
import { setupLogging, log } from '@/utils/core/logger';
import { reportError, setupGlobalErrorHandling } from '@/utils/core/signal';
import { fromUnknownError } from '@/utils/result/safe';
import { resolveLocale } from '$lib/server/locale-detection';
import type { ServerUser } from '$lib/server/data/types';
import { MOCK_USER } from '$lib/server/mock/data';
import { createDataService } from '$lib/server/data/index';

/** Security headers applied to every response (safe in both dev and prod). */
const BASE_HEADERS: ReadonlyArray<readonly [string, string]> = [
	['X-Frame-Options', 'DENY'],
	['X-Content-Type-Options', 'nosniff'],
	['Referrer-Policy', 'strict-origin-when-cross-origin'],
	['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()'],
	['Cross-Origin-Opener-Policy', 'same-origin-allow-popups'],
	['Cross-Origin-Resource-Policy', 'same-origin'],
	['Cross-Origin-Embedder-Policy', 'unsafe-none'],
	['X-DNS-Prefetch-Control', 'off'],
	['X-Permitted-Cross-Domain-Policies', 'none'],
	['X-XSS-Protection', '0'],
];

/** Headers only applied in production (would break or are irrelevant in dev). */
const PROD_HEADERS: ReadonlyArray<readonly [string, string]> = [
	['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
];

/**
 * Returns the full set of security headers for the current environment.
 *
 * In dev mode, prod-only headers (HSTS) are excluded to avoid breaking localhost.
 * Computed per-request so tests can mock `dev` from `$app/environment`.
 *
 * @returns Combined base + prod headers (or base-only in dev)
 */
function getSecurityHeaders(): ReadonlyArray<readonly [string, string]> {
	return dev ? BASE_HEADERS : [...BASE_HEADERS, ...PROD_HEADERS];
}

setupLogging({ service: 'editor-server', initFromEnv: true, format: 'json' });
setupGlobalErrorHandling({
	release: __APP_VERSION__,
	serverName: __GIT_COMMIT__,
	tags: { branch: __GIT_BRANCH__, side: 'server' },
	onError: (captured) => {
		logCapturedError(captured);
	},
});

/**
 * Extracts the first application-level source location from an AppError stack trace.
 *
 * Skips internal frames (node_modules, node:internal) and returns the first
 * frame that points to project source code — e.g. `+page.server.ts:14:53`.
 *
 * @param stack - The stack trace string from an AppError
 * @returns A short `file:line:col` string, or `'unknown'` if no app frame is found
 */
function extractSource(stack: string): string {
	const lines: string[] = stack.split('\n');
	for (const line of lines) {
		const trimmed: string = line.trim();
		if (!trimmed.startsWith('at ')) continue;
		// Skip internal frames — we want the application call site, not library internals
		if (trimmed.includes('node_modules') || trimmed.includes('node:internal')) continue;
		if (trimmed.includes('packages/shared/')) continue;
		const match: RegExpMatchArray | null = trimmed.match(/\(?(\/[^)]+):(\d+):(\d+)\)?$/);
		if (match) {
			const [, fullPath, lineNo, colNo] = match;
			// Strip everything up to and including 'packages/' for a project-relative path
			const pkgIdx: number = fullPath.indexOf('packages/');
			const relativePath: string = pkgIdx >= 0 ? fullPath.slice(pkgIdx) : fullPath;
			return `${relativePath}:${lineNo}:${colNo}`;
		}
	}
	return 'unknown';
}

/**
 * Collects the full AppError cause chain into a flat array for logging.
 *
 * @param root - The top-level AppError to walk
 * @returns Array of `{ code, message }` objects from root through all nested causes
 */
function collectCauseChain(root: AppError): Array<{ code: string; message: string }> {
	const chain: Array<{ code: string; message: string }> = [];
	let current: AppError | undefined = root.cause;
	while (current) {
		chain.push({ code: current.code, message: current.message });
		current = current.cause;
	}
	return chain;
}

/**
 * Logs a CapturedError with full structured context for server-side JSON logging.
 *
 * Used by the global `onError` handler for both uncaught errors and
 * SvelteKit `handleError` errors (routed through `reportError()`).
 *
 * @param captured - The CapturedError envelope containing the AppError + context
 */
function logCapturedError(captured: CapturedError): void {
	const appError: AppError = captured.error;
	const source: string = extractSource(appError.stack);
	const causeChain: Array<{ code: string; message: string }> = collectCauseChain(appError);

	const isSignal: boolean = captured.type === 'signal';
	const logFn: typeof log.error = isSignal ? log.info : log.error;
	logFn(`[${captured.type}] ${appError.code}: ${appError.message}`, {
		captureId: captured.id,
		errorId: appError.id,
		errorCode: appError.code,
		source,
		environment: captured.environment,
		fatal: captured.fatal,
		stack: appError.stack,
		...(appError.severity !== undefined && { severity: appError.severity }),
		...(appError.httpStatus !== undefined && { httpStatus: appError.httpStatus }),
		...(appError.meta && { errorMeta: appError.meta }),
		...(appError.validation && { validation: appError.validation }),
		...(appError.help && { help: appError.help }),
		...(appError.source && { errorSource: appError.source }),
		...(appError.related &&
			appError.related.length > 0 && {
				related: appError.related.map((e) => ({ code: e.code, message: e.message })),
			}),
		...(causeChain.length > 0 && { causeChain }),
		...(captured.meta && { meta: captured.meta }),
		...(captured.breadcrumbs &&
			captured.breadcrumbs.length > 0 && { breadcrumbs: captured.breadcrumbs }),
		...(captured.fingerprint && { fingerprint: captured.fingerprint }),
		...(captured.tags && { tags: captured.tags }),
		...(captured.user && { user: captured.user }),
		...(captured.contexts && { contexts: captured.contexts }),
		...(captured.release !== undefined && { release: captured.release }),
		...(captured.serverName !== undefined && { serverName: captured.serverName }),
	});
}

/**
 * Resolves the current user from the request URL.
 *
 * In dev mode, returns a mock user by default. The `?wf.auth=false` URL
 * parameter simulates a logged-out state for testing auth-gated UI.
 *
 * @param url - The request URL to check for auth overrides
 * @returns The resolved ServerUser, or null if auth is overridden to false
 */
function resolveAuth(url: URL): ServerUser | null {
	const authParam: string | null = url.searchParams.get('wf.auth');
	if (authParam === 'false') return null;
	return MOCK_USER;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Testing-only: simulate catastrophic handle failure for error.html fallback testing.
	if (event.url.pathname === '/test-error/catastrophic') {
		throw new Error('Simulated catastrophic failure — tests error.html fallback');
	}

	const cookie: string = event.cookies.get('locale') ?? '';
	const header: string | null = event.request.headers.get('accept-language');
	const locale: string = resolveLocale(cookie, header);

	event.locals.locale = locale;
	// During prerendering, url.searchParams is not accessible — use default mock user.
	event.locals.user = building ? MOCK_USER : resolveAuth(event.url);
	event.locals.db = createDataService(event.platform);
	const dirResult = getTextDirection(locale);
	const dir: string = dirResult.ok ? dirResult.data : 'ltr';

	const response: Response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale).replace('%dir%', dir),
	});

	for (const [name, value] of getSecurityHeaders()) {
		response.headers.set(name, value);
	}

	// Build info headers — useful for debugging deployed versions.
	response.headers.set('X-App-Version', __APP_VERSION__);
	response.headers.set('X-Git-Commit', __GIT_COMMIT__);

	// Prevent caching of HTML responses (skip SvelteKit immutable assets).
	const contentType: string = response.headers.get('content-type') ?? '';
	const isHtml: boolean = contentType.includes('text/html');
	const isImmutable: boolean = event.url.pathname.startsWith('/_app/immutable/');
	if (isHtml && !isImmutable) {
		response.headers.set('Cache-Control', 'private, no-cache');
	}

	return response;
};

/**
 * Handles unexpected server errors by creating or extracting a structured AppError.
 *
 * If the thrown error is already an AppError (e.g., from a failed `safeParse` or `err()` call),
 * it is preserved as-is — its code, validation details, and cause chain remain intact.
 * Otherwise, the error is wrapped in a new `INTERNAL.UNEXPECTED` AppError.
 *
 * Logs the full cause chain via `log.error()` for structured JSON output.
 *
 * @param params - Error event containing the error, status, and message
 * @param params.error - The thrown error object (may be an AppError or a plain Error)
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
	// Extract or wrap the thrown error into an AppError.
	// fromUnknownError returns the AppError as-is if it already is one,
	// otherwise wraps it in INTERNAL.UNEXPECTED.
	const extracted: AppError = fromUnknownError(error);

	// If the extracted error is a generic INTERNAL.UNEXPECTED, wrap it with request context.
	// Otherwise it's already a domain-specific AppError — use it directly.
	let appError: AppError;
	if (extracted.code === ERRORS.INTERNAL.UNEXPECTED) {
		const result = err(
			ERRORS.INTERNAL.UNEXPECTED,
			`Unexpected server error (${status}): ${message}`, // TODO: Clearer message
			{
				cause: extracted,
				meta: {
					status,
					message,
					url: event.url.pathname,
					method: event.request.method,
					route: event.route?.id ?? null,
					locale: event.locals.locale,
					userAgent: event.request.headers.get('user-agent'),
					referer: event.request.headers.get('referer'),
					searchParams: building ? {} : Object.fromEntries(event.url.searchParams),
					isDataRequest: event.isDataRequest,
				},
			},
		);
		// err() always returns ok:false — narrow for type safety.
		if (result.ok) return { message, errorId: '' };
		appError = result.error;
	} else {
		appError = extracted;
	}

	// Route through CapturedError pipeline — reportError() wraps the AppError
	// with breadcrumbs, fingerprint, environment, etc. and fires onError which
	// calls logCapturedError with the full CapturedError.
	reportError(appError, false as Bool);

	try {
		event.setHeaders({ 'x-error-id': appError.id });
	} catch {
		// setHeaders throws if the header was already set or if the response
		// is in a state that doesn't allow header modification (e.g., fatal errors
		// where the handle hook itself threw). Safe to ignore — errorId is also
		// embedded in the response body message.
	}
	// Embed errorId in message so error.html fallback can display it
	// (error.html only has %sveltekit.error.message% — no custom placeholders).
	// +error.svelte ignores this message (ErrorPage uses locale-based text + separate errorId prop).
	return { message: `${message} (Reference: ${appError.id})`, errorId: appError.id };
};
