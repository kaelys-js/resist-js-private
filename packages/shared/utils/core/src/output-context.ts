/**
 * Output Context
 *
 * Global output format state. Set once during CLI initialization,
 * read by log methods and views to adapt output.
 *
 * Mirrors how `logger.ts` owns log level state.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
	BoolSchema,
	DEFAULT_OUTPUT_FORMAT,
	OutputFormatSchema,
	VoidSchema,
	type Bool,
	type OutputFormat,
	type Void,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Output Format State
// =============================================================================

/** Current output format. */
let currentOutputFormat: OutputFormat = DEFAULT_OUTPUT_FORMAT;

/**
 * Set the global output format.
 *
 * @param format - Output format to set.
 * @returns `Result<Void>` — success, or a validation error.
 *
 * @example
 * ```typescript
 * setOutputFormat('json');
 * ```
 */
export function setOutputFormat(format: OutputFormat): Result<Void> {
	const input: Result<OutputFormat> = safeParse(OutputFormatSchema, format);
	if (!input.ok) return input;
	currentOutputFormat = input.data;
	return ok(VoidSchema, undefined);
}

/**
 * Get the current output format.
 *
 * @returns `Result<OutputFormat>` — the current output format.
 *
 * @example
 * ```typescript
 * const formatResult = getOutputFormat();
 * if (!formatResult.ok) return formatResult;
 * const format: OutputFormat = formatResult.data; // 'pretty'
 * ```
 */
export function getOutputFormat(): Result<OutputFormat> {
	return ok(OutputFormatSchema, currentOutputFormat);
}

/**
 * Check if current format is machine-readable (json, junit, github).
 *
 * @returns `Result<Bool>` — `true` if machine-readable.
 *
 * @example
 * ```typescript
 * const result = isMachineReadable();
 * if (result.ok && result.data) { // skip visual output }
 * ```
 */
export function isMachineReadable(): Result<Bool> {
	const machineFormats: OutputFormat[] = ['json', 'junit', 'github'];
	return ok(BoolSchema, machineFormats.includes(currentOutputFormat));
}
