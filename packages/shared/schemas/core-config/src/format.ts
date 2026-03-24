/**
 * Format Schema
 *
 * Schema for code formatting configuration.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Schemas
// =============================================================================

/**
 * Valibot schema for global formatting settings.
 * Applies to the primary languages in the repo (JS/TS, JSON, YAML, HTML, CSS).
 * Maps directly to EditorConfig and Biome configuration values.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(FormatGlobalSchema, {
 *   indent_style: 'tab',
 *   tab_width: 2,
 *   line_length: 100,
 * });
 * ```
 */
export const FormatGlobalSchema = v.strictObject({
  /** Indent style: 'tab' or 'space' */
  indent_style: v.optional(v.picklist(['tab', 'space']), 'tab'),
  /** Number of spaces/tabs for indentation (1-8) */
  indent_size: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)), 2),
  /** Tab width in spaces (for display, 1-8) */
  tab_width: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)), 2),
  /** Maximum line length (40-200) */
  line_length: v.optional(v.pipe(v.number(), v.integer(), v.minValue(40), v.maxValue(200)), 100),
});

/** Inferred output type of {@link FormatGlobalSchema}. */
export type FormatGlobal = v.InferOutput<typeof FormatGlobalSchema>;

// =============================================================================
// Alternate Format Settings (for specific languages)
// =============================================================================

/**
 * Valibot schema for alternate formatting settings.
 * Applies to languages with different community conventions
 * (Python, Go, Rust, Makefiles) where wider indentation is standard.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(FormatAlternateSchema, {
 *   indent_style: 'tab',
 *   indent_size: 4,
 * });
 * ```
 */
export const FormatAlternateSchema = v.strictObject({
  /** Indent style for alternate languages (Go, Makefile) */
  indent_style: v.optional(v.picklist(['tab', 'space']), 'tab'),
  /** Indent size for alternate languages (Python: 4, Rust: 4, range 1-8) */
  indent_size: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)), 4),
});

/** Inferred output type of {@link FormatAlternateSchema}. */
export type FormatAlternate = v.InferOutput<typeof FormatAlternateSchema>;

// =============================================================================
// Format
// =============================================================================

/**
 * Valibot schema for the top-level `format` section of the root config.
 * Separates global settings (JS/TS) from alternate settings (Python, Go, Rust).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result';
 *
 * const result = safeParse(FormatSchema, {
 *   global: { indent_style: 'tab', line_length: 100 },
 *   alternate: { indent_style: 'tab', indent_size: 4 },
 * });
 * ```
 */
export const FormatSchema = v.strictObject({
  /** Global formatting settings (JS/TS, JSON, YAML, etc.) */
  global: v.optional(FormatGlobalSchema, {}),
  /** Alternate settings for specific languages (Python, Go, Rust) */
  alternate: v.optional(FormatAlternateSchema, {}),
});

/** Inferred output type of {@link FormatSchema}. */
export type Format = v.InferOutput<typeof FormatSchema>;
