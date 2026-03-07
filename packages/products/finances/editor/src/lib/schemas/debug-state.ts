/**
 * Debug state schemas — controls debug mode, log level, and URL overrides.
 *
 * Persisted under the app-specific localStorage key. URL overrides
 * use the app-specific prefix (e.g., `?fin.debug=true`, `?fin.theme=midnight`).
 *
 * @module
 */

import * as v from 'valibot';

export { URL_PARAM_PREFIX } from '$lib/config/app-meta';

/**
 * Supported log level values in ascending severity order.
 * `trace` is most verbose, `error` is least.
 */
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error'] as const;

/**
 * Schema for a log level value.
 *
 * @example
 * ```typescript
 * const result = safeParse(LogLevelSchema, 'debug');
 * if (result.ok) console.log(result.data); // 'debug'
 * ```
 */
export const LogLevelSchema = v.picklist(LOG_LEVELS);

/** Inferred log level type. */
export type LogLevel = v.InferOutput<typeof LogLevelSchema>;

/**
 * Schema for debug state. Persisted separately from editor state
 * under the app-specific localStorage key.
 *
 * @example
 * ```typescript
 * const result = safeParse(DebugStateSchema, { enabled: true, logLevel: 'trace' });
 * ```
 */
export const DebugStateSchema = v.strictObject({
	/** Whether debug mode is active. Defaults to `false`. */
	enabled: v.optional(v.boolean(), false),
	/** Current log verbosity level. Defaults to `'info'`. */
	logLevel: v.optional(LogLevelSchema, 'info'),
});

/** Inferred type for debug state. */
export type DebugState = v.InferOutput<typeof DebugStateSchema>;

/**
 * Schema for parsed URL overrides. Keys are unprefixed (e.g., `'theme'`, not `'fin.theme'`).
 * Values are raw strings — validated against target schemas when applied.
 *
 * @example
 * ```typescript
 * const result = safeParse(UrlOverridesSchema, { theme: 'midnight', locale: 'ja' });
 * ```
 */
export const UrlOverridesSchema = v.record(v.string(), v.string());

/** Inferred type for URL overrides map. */
export type UrlOverrides = v.InferOutput<typeof UrlOverridesSchema>;
