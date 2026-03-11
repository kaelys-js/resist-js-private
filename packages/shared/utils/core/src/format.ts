/**
 * Format Utilities
 *
 * Pure formatting functions for XML escaping, duration formatting,
 * and other data presentation. No terminal or CLI dependencies.
 *
 * All functions return `Result<Str>` — input is validated via
 * `safeParse`, output is wrapped with `ok()`.
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
  NonNegativeNumberSchema,
  StrSchema,
  type NonNegativeNumber,
  type Str,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// XML
// =============================================================================

/**
 * Escapes special characters for XML.
 *
 * @param str - String to escape.
 * @returns `Result<Str>` — XML-safe string, or a validation error.
 *
 * @example
 * ```typescript
 * const result = escapeXml('foo & "bar"');
 * if (result.ok) result.data; // 'foo &amp; &quot;bar&quot;'
 * ```
 */
export function escapeXml(str: Str): Result<Str> {
  const input: Result<Str> = safeParse(StrSchema, str);
  if (!input.ok) return input;

  return ok(
    StrSchema,
    input.data
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;'),
  );
}

// =============================================================================
// Duration
// =============================================================================

/**
 * Formats duration in human-readable form.
 *
 * @param ms - Duration in milliseconds (non-negative, may be fractional).
 * @returns `Result<Str>` — formatted string (e.g., `"<1ms"`, `"42ms"`,
 *          `"1.50s"`, `"2m 30.0s"`), or a validation error.
 *
 * @example
 * ```typescript
 * formatDuration(0);      // ok('<1ms')
 * formatDuration(42);     // ok('42ms')
 * formatDuration(1500);   // ok('1.50s')
 * formatDuration(90000);  // ok('1m 30.0s')
 * ```
 */
export function formatDuration(ms: NonNegativeNumber): Result<Str> {
  const input: Result<NonNegativeNumber> = safeParse(NonNegativeNumberSchema, ms);
  if (!input.ok) return input;

  const msValue: number = input.data as unknown as number;
  if (msValue < 1) return ok(StrSchema, '<1ms');
  if (msValue < 1000) return ok(StrSchema, `${Math.round(msValue)}ms`);
  if (msValue < 60_000) return ok(StrSchema, `${(msValue / 1000).toFixed(2)}s`);

  const minutes: number = Math.floor(msValue / 60_000);
  const seconds: Str = ((msValue % 60_000) / 1000).toFixed(1);
  return ok(StrSchema, `${minutes}m ${seconds}s`);
}
