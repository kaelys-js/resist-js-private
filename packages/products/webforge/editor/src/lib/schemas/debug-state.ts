import * as v from 'valibot';

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
 * URL parameter prefix to prevent collisions with other query params.
 * All debug-related params use this prefix: `?wf.debug=true`, `?wf.theme=midnight`.
 */
export const URL_PARAM_PREFIX = 'wf.' as const;

/**
 * Schema for debug state. Persisted separately from editor state
 * under `'webforge:debug-state'` localStorage key.
 *
 * @example
 * ```typescript
 * const result = safeParse(DebugStateSchema, { enabled: true, logLevel: 'trace' });
 * ```
 */
export const DebugStateSchema = v.strictObject({
	enabled: v.optional(v.boolean(), false),
	logLevel: v.optional(LogLevelSchema, 'info'),
});

/** Inferred type for debug state. */
export type DebugState = v.InferOutput<typeof DebugStateSchema>;

/**
 * Schema for parsed URL overrides. Keys are unprefixed (e.g., `'theme'`, not `'wf.theme'`).
 * Values are raw strings — validated against target schemas when applied.
 */
export const UrlOverridesSchema = v.record(v.string(), v.string());

/** Inferred type for URL overrides map. */
export type UrlOverrides = v.InferOutput<typeof UrlOverridesSchema>;
