/**
 * Shared types for the generic schema package.
 *
 * Defines the metadata interface and type-level utilities used by `generic()`
 * and `isGenericSchema()`.
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Generic Schema Factory
// =============================================================================

/**
 * A function that takes schema arguments (representing type parameters)
 * and returns a concrete Valibot schema.
 *
 * This is the runtime representation of a generic type — a factory that
 * produces concrete schemas from schema arguments.
 *
 * **Why type alias (not schema):** Generic variadic function type. Runtime
 * validation of factories is handled by `generic()` + `isGenericSchema()`.
 * `functionSchema()` validates callability; this type defines the contract.
 *
 * @typeParam TArgs - Tuple of schema parameter types.
 * @typeParam TReturn - The concrete schema type returned by the factory.
 *
 * @example
 * ```typescript
 * // Single type parameter
 * const factory: GenericSchemaFactory = <T>(s: v.GenericSchema<T>) =>
 *   v.object({ value: s });
 *
 * // Multiple type parameters
 * const factory: GenericSchemaFactory = <K extends string, V>(
 *   k: v.GenericSchema<K>,
 *   val: v.GenericSchema<V>,
 * ) => v.record(k, val);
 * ```
 */
export type GenericSchemaFactory<
  TArgs extends v.GenericSchema[] = v.GenericSchema[],
  TReturn extends v.GenericSchema = v.GenericSchema,
> = (...args: TArgs) => TReturn;

// =============================================================================
// Generic Schema Metadata
// =============================================================================

/**
 * Schema for metadata attached to generic schema factories by `generic()`.
 * Used by `isGenericSchema()` to detect whether a function has been
 * marked as a generic schema factory.
 */
export const GenericSchemaMetaSchema = v.strictObject({
  /** Discriminant flag indicating this is a generic schema factory. */
  __isGenericSchema: v.literal(true),
});

/** Metadata attached to generic schema factories. @see {@link GenericSchemaMetaSchema} */
export type GenericSchemaMeta = v.InferOutput<typeof GenericSchemaMetaSchema>;

// =============================================================================
// Branded Generic Schema
// =============================================================================

/**
 * A generic schema factory with metadata attached.
 *
 * This is the return type of `generic()` — the original factory function
 * intersected with the metadata interface.
 *
 * **Why type alias (not schema):** Intersection of a function type with
 * metadata (`TFactory & GenericSchemaMeta`). `v.intersect` does not support
 * function-object intersections. Runtime detection via `isGenericSchema()`.
 *
 * @typeParam TFactory - The original factory function type.
 */
export type GenericSchema<TFactory extends GenericSchemaFactory> = TFactory & GenericSchemaMeta;
