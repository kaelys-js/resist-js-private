/**
 * Generic schema factory for Valibot.
 *
 * Provides `generic()` — a thin wrapper that marks a schema factory function
 * as a generic schema, and `isGenericSchema()` — a type guard for detection.
 *
 * At runtime, `generic()` is essentially an identity function. The real value
 * is at the TypeScript type level — preserving generic inference through the
 * call chain so that `v.InferOutput` works on instantiated schemas.
 *
 * @module
 */

import type { GenericSchema, GenericSchemaFactory } from '@/schemas/generic/types';

// =============================================================================
// Generic Schema Factory
// =============================================================================

/**
 * Creates a generic schema factory — a function that takes type parameter
 * schemas and returns a concrete Valibot schema.
 *
 * This is the Valibot equivalent of TypeScript's generic interfaces/types.
 * Instead of `interface Foo<T> { bar: T }`, write:
 *
 * ```typescript
 * const FooSchema = generic(
 *   <T>(barSchema: v.GenericSchema<T>) =>
 *     v.object({ bar: barSchema }),
 * );
 * ```
 *
 * The factory function's generic parameters define the type parameters.
 * Constraints are expressed through TypeScript's `extends` on the params.
 * Defaults are expressed through JavaScript default parameter values.
 *
 * @typeParam TFactory - The schema factory function type. Inferred from
 *   the provided factory — do not specify manually.
 * @param {TFactory} factory - A function that takes schema arguments (representing type
 *   parameters) and returns a concrete Valibot schema. The function's generic
 *   type parameters become the schema's type parameters.
 * @returns {GenericSchema<TFactory>} The factory function with generic schema metadata attached.
 *   Callable exactly like the original factory, with full type inference.
 *
 * @example
 * ```typescript
 * // Single type parameter
 * const BoxSchema = generic(
 *   <T>(valueSchema: v.GenericSchema<T>) =>
 *     v.object({ value: valueSchema }),
 * );
 * const StringBox = BoxSchema(v.string());
 * type StringBox = v.InferOutput<typeof StringBox>;
 * // { value: string }
 * ```
 *
 * @example
 * ```typescript
 * // Multiple type parameters with constraints
 * const MapSchema = generic(
 *   <K extends string, V>(
 *     keySchema: v.GenericSchema<K>,
 *     valueSchema: v.GenericSchema<V>,
 *   ) => v.record(keySchema, valueSchema),
 * );
 * const StringToNumberMap = MapSchema(v.string(), v.number());
 * type StringToNumberMap = v.InferOutput<typeof StringToNumberMap>;
 * // Record<string, number>
 * ```
 *
 * @example
 * ```typescript
 * // With default type parameters
 * const ContextSchema = generic(
 *   <TFlags extends Record<string, unknown>>(
 *     flagsSchema: v.GenericSchema<TFlags> = v.record(v.string(), v.unknown()) as any,
 *   ) => v.object({ flags: flagsSchema }),
 * );
 * const DefaultContext = ContextSchema();        // uses default
 * const TypedContext = ContextSchema(MyFlags);   // uses specific type
 * ```
 *
 * @remarks
 * At runtime, `generic()` is essentially an identity function — the real
 * value is at the TypeScript type level. The factory function is called
 * each time you instantiate the generic, producing a new concrete schema.
 *
 * Type parameter constraints are enforced by TypeScript at compile time,
 * NOT by Valibot at runtime. If you bypass TypeScript (e.g., `as any`),
 * no runtime check prevents invalid instantiation.
 *
 * This function does NOT cache schema instances. Each call to the factory
 * produces a new schema. If you need caching, wrap the factory yourself.
 */
export function generic<TFactory extends GenericSchemaFactory>(
  factory: TFactory,
): GenericSchema<TFactory> {
  Object.defineProperty(factory, '__isGenericSchema', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  return _toGenericSchema(factory);
}

// =============================================================================
// Type Guard
// =============================================================================

/**
 * Checks whether a value is a generic schema factory created by `generic()`.
 *
 * @param {unknown} value - The value to check.
 * @returns {value is GenericSchema<GenericSchemaFactory>} `true` if the value was created by `generic()`.
 *
 * @example
 * ```typescript
 * const BoxSchema = generic(
 *   <T>(s: v.GenericSchema<T>) => v.object({ value: s }),
 * );
 *
 * isGenericSchema(BoxSchema);           // true
 * isGenericSchema((s) => v.object({})); // false
 * isGenericSchema(v.string());          // false
 * ```
 */
export function isGenericSchema(value: unknown): value is GenericSchema<GenericSchemaFactory> {
  return (
    typeof value === 'function' && '__isGenericSchema' in value && value.__isGenericSchema === true
  );
}
// =============================================================================
// Internal Cast Helper
// =============================================================================

/**
 * Casts a `GenericSchemaFactory` to `GenericSchema<TFactory>`.
 *
 * This is the **single centralized location** for the `as GenericSchema` cast
 * in the generic schema package. The `generic()` function attaches the
 * `__isGenericSchema` metadata via `Object.defineProperty`, but TypeScript
 * cannot track property additions, so a cast is unavoidable.
 *
 * @internal
 * @typeParam TFactory - The schema factory function type.
 * @param value - The factory function to cast. Caller is responsible for
 *   ensuring `__isGenericSchema` has been attached.
 * @returns The value typed as `GenericSchema<TFactory>`.
 */
function _toGenericSchema<TFactory extends GenericSchemaFactory>(
  value: TFactory,
): GenericSchema<TFactory> {
  return value as GenericSchema<TFactory>;
}
