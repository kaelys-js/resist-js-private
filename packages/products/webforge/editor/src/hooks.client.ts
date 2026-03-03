import type { HandleClientError } from '@sveltejs/kit';
import type { CapturedError } from '@/schemas/result/captured-error';
import type { Bool } from '@/schemas/common';
import { ERRORS, err, type AppError } from '@/schemas/result/result';
import { setupLogging } from '@/utils/core/logger';
import { reportError, setupGlobalErrorHandling } from '@/utils/core/signal';
import { fromUnknownError } from '@/utils/result/safe';

setupLogging({ service: 'editor-client', initFromEnv: true });
setupGlobalErrorHandling({
	onError: (captured) => {
		// Async fire-and-forget — resolves source maps before logging.
		// logErrorToConsole never rejects (internal try-catch), safe to ignore promise.
		logErrorToConsole(captured); // eslint-disable-line no-void
	},
});

// =============================================================================
// Source Location Extraction
// =============================================================================

/** Parsed source location: display-friendly path, clickable URL, and raw position for source map resolution. */
type SourceLocation = {
	display: string;
	url: string | undefined;
	/** Raw file URL (no line:col) for fetching the source map. */
	fileUrl: string | undefined;
	/** Generated line number (1-based) from the stack trace. */
	genLine: number | undefined;
	/** Generated column number (1-based) from the stack trace. */
	genCol: number | undefined;
};

/**
 * Extracts the first application-level source location from an AppError stack trace.
 *
 * Handles both Node.js filesystem paths and browser HTTP URLs (Vite dev server).
 * Skips internal frames (node_modules, node:internal, packages/shared/) and returns
 * the first frame that points to application source code.
 *
 * @param stack - The stack trace string from an AppError
 * @returns Display path + original clickable URL + raw position for source map resolution
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
			// Full file URL for source map fetching (with query string for cache busting)
			const fileUrl = `${origin}${rawUrlPath.split(':')[0]}`;
			const genLine = Number(lineNo);
			const genCol = Number(colNo);
			// Strip Vite @fs/ prefix to get filesystem path
			const fsPath: string = urlPath.startsWith('@fs/') ? urlPath.slice(4) : urlPath;
			// Extract project-relative path from packages/ onward
			const pkgIdx: number = fsPath.indexOf('packages/');
			if (pkgIdx >= 0) {
				return {
					display: `${fsPath.slice(pkgIdx)}:${lineNo}:${colNo}`,
					url: clickableUrl,
					fileUrl,
					genLine,
					genCol,
				};
			}
			if (urlPath.startsWith('src/')) {
				return {
					display: `${urlPath}:${lineNo}:${colNo}`,
					url: clickableUrl,
					fileUrl,
					genLine,
					genCol,
				};
			}
			return {
				display: `${urlPath}:${lineNo}:${colNo}`,
				url: clickableUrl,
				fileUrl,
				genLine,
				genCol,
			};
		}

		// Filesystem path (Node.js/SSR): /Users/.../packages/...:line:col
		const fsMatch: RegExpMatchArray | null = trimmed.match(/\(?(\/[^)]+):(\d+):(\d+)\)?$/);
		if (fsMatch) {
			const [, fullPath, lineNo, colNo] = fsMatch;
			const pkgIdx: number = fullPath.indexOf('packages/');
			const relativePath: string = pkgIdx >= 0 ? fullPath.slice(pkgIdx) : fullPath;
			return {
				display: `${relativePath}:${lineNo}:${colNo}`,
				url: undefined,
				fileUrl: undefined,
				genLine: undefined,
				genCol: undefined,
			};
		}
	}
	return {
		display: 'unknown',
		url: undefined,
		fileUrl: undefined,
		genLine: undefined,
		genCol: undefined,
	};
}

// =============================================================================
// Source Map Resolution (VLQ Decoder)
// =============================================================================

/** Base64 character set used by VLQ encoding in source maps. */
const VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Regex to find the sourceMappingURL comment at the end of a JS file. */
const SOURCE_MAP_URL_RE = /\/\/[#@]\s*sourceMappingURL=(.+)$/m;

/** Minimal source map JSON shape (v3). */
type SourceMapV3 = {
	version: number;
	sources: string[];
	mappings: string;
};

/** Resolved original source position from a source map. */
type ResolvedPosition = {
	source: string;
	line: number;
	col: number;
};

/**
 * Decodes a Base64 VLQ-encoded string into an array of signed integers.
 *
 * Source maps encode each mapping segment as a sequence of VLQ values:
 * [generatedCol, sourceIdx, originalLine, originalCol, nameIdx?].
 * All values are delta-encoded relative to the previous segment.
 *
 * @param encoded - VLQ-encoded string (e.g., "AAAA", "gBACE")
 * @returns Array of decoded signed integers
 */
function decodeVLQ(encoded: string): number[] {
	const values: number[] = [];
	let shift = 0;
	let value = 0;
	for (const char of encoded) {
		const digit: number = VLQ_CHARS.indexOf(char);
		if (digit === -1) continue;
		const hasContinuation: boolean = (digit & 32) !== 0;
		value += (digit & 31) << shift;
		if (hasContinuation) {
			shift += 5;
		} else {
			const isNegative: boolean = (value & 1) !== 0;
			const decoded: number = value >> 1;
			values.push(isNegative ? -decoded : decoded);
			value = 0;
			shift = 0;
		}
	}
	return values;
}

/** Cache for fetched source maps to avoid re-fetching for multiple errors from same file. */
const _sourceMapCache = new Map<string, SourceMapV3 | null>();

/**
 * Fetches and parses the source map for a given file URL.
 *
 * Looks for a `//# sourceMappingURL=` comment in the fetched JS file.
 * Supports both inline data URLs (base64) and external `.map` file URLs.
 * Results are cached by file URL.
 *
 * @param fileUrl - The URL of the compiled JS file
 * @returns Parsed source map, or null if unavailable
 */
async function fetchSourceMap(fileUrl: string): Promise<SourceMapV3 | null> {
	if (_sourceMapCache.has(fileUrl)) return _sourceMapCache.get(fileUrl) ?? null;

	try {
		const response: Response = await fetch(fileUrl);
		if (!response.ok) {
			_sourceMapCache.set(fileUrl, null);
			return null;
		}
		const code: string = await response.text();

		const match: RegExpMatchArray | null = code.match(SOURCE_MAP_URL_RE);
		if (!match) {
			_sourceMapCache.set(fileUrl, null);
			return null;
		}
		const mapUrl: string = match[1].trim();

		let mapJson: string;
		if (mapUrl.startsWith('data:')) {
			// Inline source map: data:application/json;base64,...
			const base64: string = mapUrl.split(',')[1] ?? '';
			mapJson = atob(base64);
		} else {
			// External source map file
			const resolved: string = new URL(mapUrl, fileUrl).href;
			const mapResponse: Response = await fetch(resolved);
			if (!mapResponse.ok) {
				_sourceMapCache.set(fileUrl, null);
				return null;
			}
			mapJson = await mapResponse.text();
		}

		const map: SourceMapV3 = JSON.parse(mapJson) as SourceMapV3;
		if (map.version !== 3) {
			_sourceMapCache.set(fileUrl, null);
			return null;
		}

		_sourceMapCache.set(fileUrl, map);
		return map;
	} catch {
		_sourceMapCache.set(fileUrl, null);
		return null;
	}
}

/**
 * Resolves a generated position to the original source position using the source map.
 *
 * Decodes VLQ mappings line-by-line, maintaining delta state, then finds the segment
 * on the target line whose generated column is closest to (but not exceeding) the
 * target column.
 *
 * @param fileUrl - URL of the compiled JS file
 * @param genLine - Generated line number (1-based)
 * @param genCol - Generated column number (1-based)
 * @returns Original position with source file, line, and column; or null if unresolvable
 */
async function resolveSourcePosition(
	fileUrl: string,
	genLine: number,
	genCol: number,
): Promise<ResolvedPosition | null> {
	const map: SourceMapV3 | null = await fetchSourceMap(fileUrl);
	if (!map) return null;

	const mappingLines: string[] = map.mappings.split(';');
	if (genLine < 1 || genLine > mappingLines.length) return null;

	// Delta-encoded state that persists across all lines
	let sourceIndex = 0;
	let originalLine = 0;
	let originalCol = 0;

	// Process all lines before the target to maintain delta state
	for (let i = 0; i < genLine - 1; i++) {
		const lineMapping: string = mappingLines[i] ?? '';
		if (!lineMapping) continue;
		const segments: string[] = lineMapping.split(',');
		for (const segment of segments) {
			if (!segment) continue;
			const decoded: number[] = decodeVLQ(segment);
			// decoded[0] = generated column delta (resets per line, but we don't need it here)
			if (decoded.length >= 4) {
				sourceIndex += decoded[1] ?? 0;
				originalLine += decoded[2] ?? 0;
				originalCol += decoded[3] ?? 0;
			}
		}
	}

	// Process the target line to find the best matching segment
	const targetLineMapping: string = mappingLines[genLine - 1] ?? '';
	if (!targetLineMapping) return null;

	const targetSegments: string[] = targetLineMapping.split(',');
	let genColAccum = 0;
	let bestMatch: ResolvedPosition | null = null;

	for (const segment of targetSegments) {
		if (!segment) continue;
		const decoded: number[] = decodeVLQ(segment);
		genColAccum += decoded[0] ?? 0;
		if (decoded.length >= 4) {
			sourceIndex += decoded[1] ?? 0;
			originalLine += decoded[2] ?? 0;
			originalCol += decoded[3] ?? 0;
		}
		// Generated column is 0-based in source maps, genCol from stack is 1-based
		if (genColAccum <= genCol - 1) {
			bestMatch = {
				source: map.sources[sourceIndex] ?? 'unknown',
				line: originalLine + 1, // Convert 0-based to 1-based
				col: originalCol + 1,
			};
		}
	}

	return bestMatch;
}

// =============================================================================
// Console Error Logging
// =============================================================================

/**
 * Logs a CapturedError to the browser console with colored grouping,
 * context table, cause chain, and validation details.
 *
 * Resolves source map positions for correct line/col numbers before logging.
 * Falls back to raw (compiled) positions if source map resolution fails.
 *
 * Used by the global `onError` handler for both uncaught errors and
 * SvelteKit `handleError` errors (routed through `reportError()`).
 *
 * @param captured - The CapturedError envelope containing the AppError + context
 */
async function logErrorToConsole(captured: CapturedError): Promise<void> {
	const appError: AppError = captured.error;
	const label: string = captured.type === 'resultError' ? 'Error' : 'Uncaught';
	const source: SourceLocation = extractSource(appError.stack);

	// Try to resolve original source position via source map
	if (source.fileUrl && source.genLine && source.genCol) {
		const resolved: ResolvedPosition | null = await resolveSourcePosition(
			source.fileUrl,
			source.genLine,
			source.genCol,
		);
		if (resolved) {
			// Extract short display path from resolved source
			const pkgIdx: number = resolved.source.indexOf('packages/');
			const shortPath: string =
				pkgIdx >= 0
					? resolved.source.slice(pkgIdx)
					: resolved.source.replace(/^\.\.\//, '').replace(/^\.\//, '');
			source.display = `${shortPath}:${resolved.line}:${resolved.col}`;
		}
	}

	const pad = 14;
	const dim = 'color: #888';
	const bright = 'color: #eee';

	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.groupCollapsed(
		`%c[${label}] %c${appError.code} %cat ${source.url ?? source.display} %c— ${appError.message}`,
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
		['Capture ID', captured.id],
		['Type', captured.type],
		['Environment', captured.environment],
		['Fatal', String(captured.fatal)],
		['Severity', appError.severity ?? 'error'],
		['URL', globalThis.location?.href ?? 'unknown'],
		['Timestamp', appError.timestamp],
		['Captured At', captured.timestamp],
	];
	if (appError.httpStatus !== undefined) {
		entries.push(['HTTP', String(appError.httpStatus)]);
	}
	if (captured.fingerprint) {
		entries.push(['Fingerprint', captured.fingerprint.join(', ')]);
	}
	const fmt: string = entries.map(([k]) => `%c  ${k.padEnd(pad)}%c%s`).join('\n');
	const kvArgs: string[] = entries.flatMap(([, v]) => [dim, bright, v]);
	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.log(fmt, ...kvArgs);

	// Meta context (correlationId, log context, etc.)
	if (captured.meta && Object.keys(captured.meta).length > 0) {
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.log('%cMeta:', 'color: #666; font-style: italic');
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.log(captured.meta);
	}

	// Breadcrumbs
	if (captured.breadcrumbs && captured.breadcrumbs.length > 0) {
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.log('%cBreadcrumbs:', 'color: #666; font-style: italic');
		// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
		console.log(captured.breadcrumbs);
	}

	// Raw error object
	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.log('%cRaw error:', 'color: #666; font-style: italic');
	// eslint-disable-next-line no-console -- Intentional browser dev console output for error reporting
	console.log(captured.original);

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
			`%cValidation issues %cat ${source.url ?? source.display} %c— ${appError.message}`,
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

// =============================================================================
// SvelteKit Client Error Handler
// =============================================================================

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

	// Route through CapturedError pipeline — reportError() wraps the AppError
	// with breadcrumbs, fingerprint, environment, etc. and fires onError which
	// calls logErrorToConsole with the full CapturedError.
	reportError(appError, false as Bool);

	return { message, errorId: appError.id };
};
