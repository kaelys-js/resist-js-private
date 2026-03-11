/**
 * Config Schema Introspection Utility
 *
 * Extracts structural info from Valibot strict-object schemas.
 * Uses `in` operator + `typeof` narrowing to navigate schema internals
 * without `as` casts.
 *
 * @module
 */

import * as v from 'valibot';

import { BoolSchema, StrSchema, type Bool, type Str } from '@/schemas/common';
import { ERRORS, type Result, err, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Valibot schema for a single schema entry. */
export const SchemaEntrySchema = v.strictObject({
  /** Key name in the parent object. */
  key: StrSchema,
  /** Valibot schema type name (e.g. `"string"`, `"strict_object"`, `"array"`). */
  type: StrSchema,
  /** Whether the field is required (not wrapped in `optional()`). */
  required: BoolSchema,
});

/** Inferred output type of {@link SchemaEntrySchema}. */
export type SchemaEntry = v.InferOutput<typeof SchemaEntrySchema>;

/** Valibot schema for a record with string keys and unknown values. */
const RecordSchema = v.record(v.string(), v.unknown());

// =============================================================================
// Public API
// =============================================================================

/**
 * Extract structural entries from a Valibot strict-object schema.
 *
 * Navigates the schema's `.entries` property and for each entry:
 * - Reads `.type` to determine the schema type name.
 * - Checks if `.type === 'optional'` to determine required/optional.
 * - For optional schemas, reads `.wrapped.type` for the inner type.
 *
 * All property access uses `in` operator + `typeof` narrowing.
 * No `as` casts.
 *
 * @param schema - A Valibot schema with `.entries` (strict_object, loose_object).
 * @returns `Result<readonly SchemaEntry[]>` — array of entries, or an error
 *          if the schema doesn't have `.entries`.
 *
 * @example
 * ```typescript
 * import { CoreConfigObjectSchema } from '@/schemas/core-config/config';
 *
 * const result = extractSchemaEntries(CoreConfigObjectSchema);
 * if (result.ok) {
 *   for (const entry of result.data) {
 *     console.log(`${entry.key} (${entry.type}) required=${entry.required}`);
 *   }
 * }
 * ```
 */
export function extractSchemaEntries(
  schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
): Result<readonly SchemaEntry[]> {
  if (!('entries' in schema) || typeof schema.entries !== 'object' || schema.entries === null) {
    return err(ERRORS.VALIDATION.INVALID_TYPE, {
      meta: { expected: 'schema with entries (strict_object or loose_object)' },
    });
  }

  const entriesRecord: Result<Record<Str, unknown>> = safeParse(RecordSchema, schema.entries);
  if (!entriesRecord.ok) return entriesRecord;

  const result: SchemaEntry[] = [];

  for (const [key, entrySchema] of Object.entries(entriesRecord.data)) {
    if (typeof entrySchema !== 'object' || entrySchema === null) continue;

    let typeName: Str = 'unknown';
    let isRequired: Bool = true;

    if ('type' in entrySchema && typeof entrySchema.type === 'string') {
      typeName = entrySchema.type;
    }

    if (typeName === 'optional') {
      isRequired = false;
      if (
        'wrapped' in entrySchema &&
        typeof entrySchema.wrapped === 'object' &&
        entrySchema.wrapped !== null &&
        'type' in entrySchema.wrapped &&
        typeof entrySchema.wrapped.type === 'string'
      ) {
        typeName = entrySchema.wrapped.type;
      }
    }

    result.push({ key, type: typeName, required: isRequired });
  }

  return okUnchecked(result);
}
