/**
 * File System Schemas
 *
 * Valibot schemas and types for file system utility parameters.
 * Co-located with {@link module:fs} — imported by `fs.ts` and
 * available to any caller that needs to validate encodings or content.
 *
 * Path validation uses {@link PathSchema} from `@/schemas/common`.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Schemas
// =============================================================================

/**
 * Schema for file encoding.
 *
 * Accepts one of the supported Node.js `BufferEncoding` subsets:
 * `'utf-8'`, `'utf8'`, `'ascii'`, `'binary'`, `'latin1'`, `'base64'`, `'hex'`.
 */
export const FileEncodingSchema = v.picklist([
  'utf-8',
  'utf8',
  'ascii',
  'binary',
  'latin1',
  'base64',
  'hex',
]);

/**
 * Schema for string content to be written to a file.
 *
 * A plain `v.string()` — no minimum length, since empty files are valid.
 */
export const FileContentSchema = v.string();

// =============================================================================
// Types
// =============================================================================

/** Supported file encodings. Inferred from {@link FileEncodingSchema}. */
export type FileEncoding = v.InferOutput<typeof FileEncodingSchema>;

/**
 * Default file encoding: `'utf-8'`.
 *
 * Used as the default encoding for `readFile` and `writeFile`.
 *
 * @example
 * ```typescript
 * const encoding: FileEncoding = DEFAULT_FILE_ENCODING; // 'utf-8'
 * ```
 */
export const DEFAULT_FILE_ENCODING: FileEncoding = 'utf-8';

/** Inferred output type of {@link FileContentSchema}. A string of file content. */
export type FileContent = v.InferOutput<typeof FileContentSchema>;
