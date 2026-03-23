/**
 * Debug state schemas — controls debug mode, log level, and URL overrides.
 *
 * Product-agnostic. Each product configures its own storage key prefix
 * and URL param prefix when creating its debug store.
 *
 * @module
 */

import * as v from 'valibot';

/** Supported log level values in ascending severity order. */
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
 * Schema for debug state. Persisted separately from app state
 * under the product-specific localStorage key.
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

export { UrlOverridesSchema, type UrlOverrides } from '@/utils/core/url-params';
