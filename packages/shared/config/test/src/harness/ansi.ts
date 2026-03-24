/**
 * ANSI escape code utilities for test assertions.
 *
 * Use these when testing CLI output that includes colors, bold, dim, etc.
 * Strip ANSI codes to assert on visible text content without worrying about
 * terminal formatting.
 *
 * @example
 * ```typescript
 * import { stripAnsi, ANSI_REGEX } from '@/test-presets/harness/ansi';
 *
 * const colored: Str = '\x1b[31mError:\x1b[0m file not found';
 * expect(stripAnsi(colored)).toBe('Error: file not found');
 * ```
 *
 * @module
 */

import type { Str } from '@/schemas/common';

// =============================================================================
// Constants
// =============================================================================

/**
 * Regex matching all ANSI escape sequences (SGR parameters, cursor movement,
 * erase functions, and other CSI sequences).
 *
 * Covers:
 * - SGR (Select Graphic Rendition): `\x1b[0m`, `\x1b[31;1m`
 * - Cursor movement: `\x1b[2A`, `\x1b[10;20H`
 * - Erase: `\x1b[2J`, `\x1b[K`
 * - OSC sequences: `\x1b]0;title\x07`
 *
 * @example
 * ```typescript
 * const hasAnsi: boolean = ANSI_REGEX.test('\x1b[31mred\x1b[0m');
 * // true
 * ```
 */
export const ANSI_REGEX: RegExp = new RegExp(
  `[${String.fromCodePoint(0x1b)}${String.fromCodePoint(0x9b)}][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]`,
  'g',
);

// =============================================================================
// API
// =============================================================================

/**
 * Strip all ANSI escape codes from a string, returning plain visible text.
 *
 * @param {Str} text - String potentially containing ANSI escape sequences
 * @returns {Str} The input string with all ANSI sequences removed
 *
 * @example
 * ```typescript
 * import { stripAnsi } from '@/test-presets/harness/ansi';
 *
 * const result: Str = formatPath('/src/index.ts');
 * const visible: Str = stripAnsi(result);
 * expect(visible).toBe('/src/index.ts');
 * expect(visible.length).toBe(14);
 * ```
 */
export function stripAnsi(text: Str): Str {
  return text.replace(ANSI_REGEX, '');
}
