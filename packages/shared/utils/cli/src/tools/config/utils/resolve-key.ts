/**
 * Config Key Resolution Utility
 *
 * Resolves dot-notation key paths against plain objects.
 * Also provides top-level key listing for the `list` action.
 *
 * @module
 */

import * as v from 'valibot';

import { StrSchema, type Bool, type Str } from '@/schemas/common';
import { ERRORS, type Result, err, okUnchecked } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Schemas
// =============================================================================

/** Valibot schema for a single key info entry. */
export const KeyInfoSchema = v.strictObject({
  /** Key name. */
  key: StrSchema,
  /** JavaScript typeof string. */
  type: StrSchema,
});

/** Inferred output type of {@link KeyInfoSchema}. */
export type KeyInfo = v.InferOutput<typeof KeyInfoSchema>;

/** Valibot schema for a record with string keys and unknown values. */
const RecordSchema = v.record(v.string(), v.unknown());

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve a dot-notation key path against a plain object.
 *
 * Walks the object tree, splitting on `.`, and returns the value
 * at the final segment. Returns `CONFIG.NOT_FOUND` if any segment
 * is missing or the traversal hits a non-object.
 *
 * Uses `safeParse(RecordSchema, ...)` at each level to safely index
 * into the object without `as` casts.
 *
 * @param obj - The source object to traverse (validated as record at each level).
 * @param keyPath - Dot-notation path (e.g. `"tooling.ci.enabled"`).
 * @returns `Result<unknown>` — the resolved value, or an error if not found.
 *
 * @example
 * ```typescript
 * const result = resolveKey({ a: { b: 42 } }, 'a.b');
 * if (result.ok) console.log(result.data); // 42
 * ```
 */
export function resolveKey(obj: unknown, keyPath: Str): Result<unknown> {
  const pathResult: Result<Str> = safeParse(StrSchema, keyPath);
  if (!pathResult.ok) return pathResult;

  const parts: readonly Str[] = pathResult.data.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return err(ERRORS.CONFIG.NOT_FOUND, {
        meta: { key: keyPath, segment: part },
      });
    }

    const recordResult: Result<Record<Str, unknown>> = safeParse(RecordSchema, current);
    if (!recordResult.ok) return recordResult;

    const hasKey: Bool = Object.prototype.hasOwnProperty.call(recordResult.data, part);
    if (!hasKey) {
      return err(ERRORS.CONFIG.NOT_FOUND, {
        meta: { key: keyPath, segment: part },
      });
    }

    current = recordResult.data[part];
  }

  return okUnchecked(current);
}

/**
 * List top-level keys of a plain object with their value types.
 *
 * @param obj - The source object (validated as record).
 * @returns `Result<readonly KeyInfo[]>` — array of key/type pairs,
 *          or a validation error if `obj` is not a record.
 *
 * @example
 * ```typescript
 * const result = listTopLevelKeys({ name: 'Acme', count: 3, active: true });
 * if (result.ok) {
 *   // [{ key: 'name', type: 'string' }, { key: 'count', type: 'number' }, ...]
 * }
 * ```
 */
export function listTopLevelKeys(obj: unknown): Result<readonly KeyInfo[]> {
  const recordResult: Result<Record<Str, unknown>> = safeParse(RecordSchema, obj);
  if (!recordResult.ok) return recordResult;

  const entries: readonly KeyInfo[] = Object.keys(recordResult.data).map(
    (key: Str): KeyInfo => ({
      key,
      type: typeof recordResult.data[key],
    }),
  );

  return okUnchecked(entries);
}
