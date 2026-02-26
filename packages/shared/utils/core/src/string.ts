/**
 * String Utilities
 *
 * Pure string manipulation utilities with no terminal or CLI dependencies.
 * ANSI-aware operations for string measurement and truncation.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
	CamelCaseStringSchema,
	NonNegativeIntegerSchema,
	StrSchema,
	type CamelCaseString,
	type NonNegativeInteger,
	type Str,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// ANSI Utilities
// =============================================================================

/**
 * Strips ANSI escape codes from a string for accurate length calculation.
 *
 * @param str - String potentially containing ANSI escape codes.
 * @returns String with all ANSI escape codes removed.
 */
function stripAnsi(str: Str): Str {
	const ansiEscape = new RegExp(`${String.fromCodePoint(0x1b)}${String.raw`\[[0-9;]*m`}`, 'g');
	return str.replace(ansiEscape, '');
}

// =============================================================================
// Padding
// =============================================================================

/**
 * Right-pads a string with spaces to a given visible length.
 *
 * @param str - String to pad.
 * @param length - Target visible length (non-negative integer).
 * @returns `Result<Str>` — padded string, or a validation error.
 *
 * @example
 * ```typescript
 * padRight('hello', 10); // ok → 'hello     '
 * padRight('long text', 4); // ok → 'long text' (no truncation)
 * ```
 */
export function padRight(str: Str, length: NonNegativeInteger): Result<Str> {
	const strResult: Result<Str> = safeParse(StrSchema, str);
	if (!strResult.ok) return strResult;

	const lengthResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, length);
	if (!lengthResult.ok) return lengthResult;

	// Internal arithmetic — values provably non-negative from validated inputs
	const padding: number = Math.max(
		0,
		(lengthResult.data as unknown as number) - strResult.data.length,
	);
	return ok(StrSchema, strResult.data + ' '.repeat(padding));
}

// =============================================================================
// Truncation
// =============================================================================

/**
 * Truncates a line to fit within a given width.
 *
 * Accounts for ANSI escape codes (they don't take visual space).
 * Adds ellipsis if truncated.
 *
 * @param line - String to truncate (may contain ANSI codes).
 * @param maxWidth - Maximum visible character width (non-negative integer).
 * @returns `Result<Str>` — truncated string, or a validation error.
 *
 * @example
 * ```typescript
 * truncateLine('Hello, world!', 8); // ok → 'Hello, …'
 * truncateLine('short', 20); // ok → 'short' (no change)
 * ```
 */
export function truncateLine(line: Str, maxWidth: NonNegativeInteger): Result<Str> {
	const lineResult: Result<Str> = safeParse(StrSchema, line);
	if (!lineResult.ok) return lineResult;

	const widthResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, maxWidth);
	if (!widthResult.ok) return widthResult;

	// Internal arithmetic — values provably non-negative from validated inputs
	const visibleLength: number = stripAnsi(lineResult.data).length;

	if (visibleLength <= (widthResult.data as unknown as number)) {
		return ok(StrSchema, lineResult.data);
	}

	// Walk through the string tracking visible characters
	let visibleCount = 0;
	let i = 0;
	const targetLength: number = Math.max(0, (widthResult.data as unknown as number) - 1);

	while (i < lineResult.data.length && visibleCount < targetLength) {
		if (lineResult.data[i] === '\u001B' && lineResult.data[i + 1] === '[') {
			const end: number = lineResult.data.indexOf('m', i);
			if (end !== -1) {
				i = end + 1;
				continue;
			}
		}
		visibleCount += 1;
		i += 1;
	}

	// Include any trailing ANSI codes (like reset)
	while (i < lineResult.data.length && lineResult.data[i] === '\u001B') {
		const end: number = lineResult.data.indexOf('m', i);
		if (end === -1) {
			break;
		} else {
			i = end + 1;
		}
	}

	return ok(StrSchema, `${lineResult.data.slice(0, i)}…`);
}

// =============================================================================
// Case Conversion
// =============================================================================

/**
 * Converts a kebab-case string to camelCase.
 *
 * @param name - Kebab-case string (e.g., `'fail-fast'`).
 * @returns `Result<Str>` — camelCase equivalent (e.g., `'failFast'`), or a validation error.
 *
 * @example
 * ```typescript
 * toCamelCase('fail-fast'); // ok → 'failFast'
 * toCamelCase('no-color'); // ok → 'noColor'
 * toCamelCase('simple'); // ok → 'simple'
 * ```
 */
export function toCamelCase(name: Str): Result<CamelCaseString> {
	const input: Result<Str> = safeParse(StrSchema, name);
	if (!input.ok) return input;
	return ok(
		CamelCaseStringSchema,
		input.data.replaceAll(/-([a-z])/g, (_, c: Str) => c.toUpperCase()),
	);
}
