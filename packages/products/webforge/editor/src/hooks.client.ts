import type { HandleClientError } from '@sveltejs/kit';
import { ERRORS, err, type AppError } from '@/schemas/result/result';
import { setupLogging } from '@/utils/core/logger';
import { setupGlobalErrorHandling } from '@/utils/core/signal';
import { fromUnknownError } from '@/utils/result/safe';

setupLogging({ service: 'editor-client', initFromEnv: true });
setupGlobalErrorHandling({
	onError: (captured) => {
		logErrorToConsole('Uncaught', captured.error, captured.error);
	},
});

/** Parsed source location: display-friendly path + original URL (if from browser). */
type SourceLocation = {
	display: string;
	url: string | undefined;
};

/**
 * Extracts the first application-level source location from an AppError stack trace.
 *
 * Handles both Node.js filesystem paths and browser HTTP URLs (Vite dev server).
 * Skips internal frames (node_modules, node:internal, packages/shared/) and returns
 * the first frame that points to application source code.
 *
 * @param stack - The stack trace string from an AppError
 * @returns Display path + original clickable URL (if browser), or `'unknown'` if no app frame found
 */
function extractSource(stack: string): SourceLocation {
	const lines: string[] = stack.split('\n');
	for (const line of lines) {
		const trimmed: string = line.trim();
		if (!trimmed.startsWith('at ')) continue;
		// Skip internal frames — we want the application call site, not library internals
		if (trimmed.includes('node_modules') || trimmed.includes('node:internal')) continue;
		if (trimmed.includes('packages/shared/')) continue;

		// Browser URL (any format): http://host/path?query:line:col
		const urlMatch: RegExpMatchArray | null = trimmed.match(
			/(https?:\/\/[^/\s]+\/)(.+):(\d+):(\d+)/,
		);
		if (urlMatch) {
			const [, origin, rawUrlPath, lineNo, colNo] = urlMatch;
			// Strip query string (e.g., ?t=1772535466719)
			const qIdx: number = rawUrlPath.indexOf('?');
			const urlPath: string = qIdx >= 0 ? rawUrlPath.slice(0, qIdx) : rawUrlPath;
			// Build clickable URL (strip query string but keep origin + path + line:col)
			const clickableUrl = `${origin}${urlPath}:${lineNo}:${colNo}`;
			// Strip Vite @fs/ prefix to get filesystem path
			const fsPath: string = urlPath.startsWith('@fs/') ? urlPath.slice(4) : urlPath;
			// Extract project-relative path from packages/ onward
			const pkgIdx: number = fsPath.indexOf('packages/');
			if (pkgIdx >= 0)
				return { display: `${fsPath.slice(pkgIdx)}:${lineNo}:${colNo}`, url: clickableUrl };
			if (urlPath.startsWith('src/'))
				return { display: `${urlPath}:${lineNo}:${colNo}`, url: clickableUrl };
			return { display: `${urlPath}:${lineNo}:${colNo}`, url: clickableUrl };
		}

		// Filesystem path (Node.js/SSR): /Users/.../packages/...:line:col
		const fsMatch: RegExpMatchArray | null = trimmed.match(/\(?(\/[^)]+):(\d+):(\d+)\)?$/);
		if (fsMatch) {
			const [, fullPath, lineNo, colNo] = fsMatch;
			const pkgIdx: number = fullPath.indexOf('packages/');
			const relativePath: string = pkgIdx >= 0 ? fullPath.slice(pkgIdx) : fullPath;
			return { display: `${relativePath}:${lineNo}:${colNo}`, url: undefined };
		}
	}
	return { display: 'unknown', url: undefined };
}

/**
 * Logs a structured AppError to the browser console with colored grouping,
 * context table, cause chain, and validation details.
 *
 * Used by both the global `onError` handler (uncaught errors) and SvelteKit's
 * `handleError` hook (client navigation errors).
 *
 * @param label - Group prefix label (e.g. 'Uncaught', 'Error')
 * @param appError - The structured AppError to log
 * @param rawError - The original thrown value (shown via console.error for stack expansion)
 */
function logErrorToConsole(label: string, appError: AppError, rawError: unknown): void {
	const source: SourceLocation = extractSource(appError.stack);
	const pad = 12;
	const dim = 'color: #888';
	const bright = 'color: #eee';

	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.groupCollapsed(
		`%c[${label}] %c${appError.code} %cat ${source.display} %c— ${appError.message}`,
		'color: #f44; font-weight: bold',
		'color: #fa0',
		'color: #8cf',
		'color: #aaa',
	);

	const entries: Array<[string, string]> = [
		['Code', appError.code],
		['Source', source.url ?? source.display],
		['Message', appError.message],
		['Error ID', appError.id],
		['Severity', appError.severity ?? 'error'],
		['URL', globalThis.location?.href ?? 'unknown'],
		['Timestamp', appError.timestamp],
	];
	if (appError.httpStatus !== undefined) {
		entries.splice(5, 0, ['HTTP', String(appError.httpStatus)]);
	}
	const fmt: string = entries.map(([k]) => `%c  ${k.padEnd(pad)}%c%s`).join('\n');
	const kvArgs: string[] = entries.flatMap(([, v]) => [dim, bright, v]);
	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.log(fmt, ...kvArgs);

	// Raw error object — after the pretty block so it doesn't push it down
	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.log('%cRaw error:', 'color: #666; font-style: italic');
	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.log(rawError);

	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.groupEnd();

	// Cause chain — top-level group so it can be expanded independently
	if (appError.cause) {
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.groupCollapsed('%cCause chain', 'color: #888; font-style: italic');
		let current: AppError | undefined = appError.cause;
		let depth = 0;
		while (current) {
			const indent: string = '  '.repeat(depth);
			// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
			console.log(
				`${indent}%c[${current.code}]%c ${current.message}`,
				'color: #fa0',
				'color: inherit',
			);
			current = current.cause;
			depth++;
		}
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.groupEnd();
	}

	// Validation details — top-level group, same key-value format as main entries + raw JSON
	if (appError.validation) {
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.groupCollapsed(
			`%cValidation issues %cat ${source.display} %c— ${appError.message}`,
			'color: #f44; font-weight: bold',
			'color: #8cf',
			'color: #aaa',
		);
		const issues = appError.validation.issues ?? [];
		if (issues.length > 0) {
			const issueEntries: Array<[string, string]> = issues.map((issue) => {
				const path: string =
					issue.path?.map((p: { key?: unknown }) => String(p.key ?? '?')).join('.') ?? '(root)';
				return [path, issue.message ?? 'Invalid'];
			});
			const issuePad: number = Math.max(pad, ...issueEntries.map(([k]) => k.length + 2));
			const issueFmt: string = issueEntries
				.map(([k]) => `%c  ${k.padEnd(issuePad)}%c%s`)
				.join('\n');
			const issueArgs: string[] = issueEntries.flatMap(([, v]) => [dim, bright, v]);
			// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
			console.log(issueFmt, ...issueArgs);
		}
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.log('%cRaw:', 'color: #666; font-style: italic');
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.log(appError.validation);
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.groupEnd();
	}
}

/**
 * Handles unexpected client errors by extracting or creating a structured AppError.
 *
 * If the thrown error is already an AppError (e.g., from a failed `safeParse` or `err()` call),
 * it is preserved as-is — its code, validation details, and cause chain remain intact.
 * Otherwise, the error is wrapped in a new `INTERNAL.UNEXPECTED` AppError.
 *
 * @param params - Error event containing the error, status, and message
 * @param params.error - The thrown error object (may be an AppError or a plain Error)
 * @param params.status - HTTP status code
 * @param params.message - User-safe error message from SvelteKit
 * @returns App.Error with message and errorId for client display
 *
 * @example
 * // SvelteKit calls this automatically for unhandled client errors
 * // The returned object becomes `page.error` in +error.svelte
 */
export const handleError: HandleClientError = ({ error, status, message }) => {
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
			`Unexpected client error (${status}): ${message}`,
			{
				cause: extracted,
				meta: { status, message },
			},
		);
		// err() always returns ok:false — narrow for type safety.
		if (result.ok) return { message, errorId: '' };
		appError = result.error;
	} else {
		appError = extracted;
	}

	logErrorToConsole('Error', appError, error);

	return { message, errorId: appError.id };
};
