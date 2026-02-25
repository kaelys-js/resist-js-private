/**
 * Shared types for the function schema package.
 *
 * Defines option interfaces used by `functionSchema()`, `args()`,
 * `returns()`, `arity()`, and `implement()`.
 *
 * @module
 */

import * as v from 'valibot';

import { generic } from '@/schemas/generic/generic';
import type { GenericSchemaFactory } from '@/schemas/generic/types';

// =============================================================================
// Error Mode
// =============================================================================

/**
 * Controls how call-time validation failures are reported.
 *
 * - `'throw'` — Throws a `ValiError`-compatible error. Use for functions
 *   that do not return `Result<T>` (e.g., pure transforms, predicates).
 * - `'result'` — Returns an `err(...)` Result. Use for functions that
 *   return `Result<T>`, integrating seamlessly with the Result system.
 */
export const ErrorModeSchema = v.picklist(['throw', 'result']);

/** @see {@link ErrorModeSchema} */
export type ErrorMode = v.InferOutput<typeof ErrorModeSchema>;

// =============================================================================
// Function Schema Options
// =============================================================================

/**
 * Generic schema for function types.
 *
 * Runtime representation of `(...args: TArgs) => TReturn`. Uses `generic()`
 * to preserve type parameter inference through Valibot's schema system.
 *
 * Uses `v.custom()` directly instead of `functionSchema()` to avoid
 * a circular import (`types.ts` → `function.ts` → `wrapper-utils.ts` → `types.ts`).
 *
 * @example
 * ```typescript
 * // Validates any callable function
 * const AnyFn = FnTypeSchema();
 *
 * // Validates (but doesn't check params/returns at call-time)
 * const BinaryFn = FnTypeSchema(v.tuple([v.string(), v.number()]), v.boolean());
 * ```
 */
export const FnTypeSchema = generic(
	(<TArgs extends unknown[] = unknown[], TReturn = unknown>(
		_argsSchema: v.GenericSchema<TArgs> = v.array(v.unknown()) as unknown as v.GenericSchema<TArgs>,
		_returnSchema: v.GenericSchema<TReturn> = v.unknown() as unknown as v.GenericSchema<TReturn>,
	): v.GenericSchema<FnType<TArgs, TReturn>> =>
		v.custom<FnType<TArgs, TReturn>>(
			(val: unknown): boolean => typeof val === 'function',
			'Expected a callable function',
		)) as GenericSchemaFactory,
);

/**
 * Generic function type constructor.
 *
 * Compile-time type alias for `(...args: TArgs) => TReturn`. The runtime
 * schema equivalent is {@link FnTypeSchema}. Both are canonical — the schema
 * for validation, the type for annotations.
 *
 * @typeParam TArgs - Tuple of parameter types.
 * @typeParam TReturn - Return type.
 */
export type FnType<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
	...args: TArgs
) => TReturn;

// =============================================================================
// Arity Constraint
// =============================================================================

/**
 * Constraint for function arity validation.
 *
 * Either an exact number or a range with optional min/max bounds.
 * Used by the `arity()` pipe action.
 *
 * @example
 * ```typescript
 * // Exact: fn.length must be 2
 * arity(2)
 *
 * // Range: fn.length must be 1-3
 * arity({ min: 1, max: 3 })
 *
 * // Minimum only: fn.length must be >= 1
 * arity({ min: 1 })
 * ```
 */
export const ArityConstraintSchema = v.union([
	v.number(),
	v.strictObject({ min: v.optional(v.number()), max: v.optional(v.number()) }),
]);

/** Either an exact arity (number) or a range `{ min?, max? }`. */
export type ArityConstraint = v.InferOutput<typeof ArityConstraintSchema>;

// =============================================================================
// Call-Time Validation Options
// =============================================================================

/**
 * Schema for call-time parameter and return validation options.
 * Used by `args()` and `returns()` pipe actions.
 *
 * @example
 * ```typescript
 * const result = v.safeParse(CallTimeOptionsSchema, { onError: 'result' });
 * if (result.success) result.output.onError; // 'result'
 * ```
 */
export const CallTimeOptionsSchema = v.strictObject({
	/**
	 * Error behavior when validation fails at call time.
	 * - `'throw'` (default) — Throws a `ValiError`-compatible error.
	 * - `'result'` — Returns `err(...)` as the function's return value.
	 * @default 'throw'
	 */
	onError: v.optional(ErrorModeSchema),
});

/** Options for call-time parameter and return validation. @see {@link CallTimeOptionsSchema} */
export type CallTimeOptions = v.InferOutput<typeof CallTimeOptionsSchema>;

// =============================================================================
// Wrapper Metadata
// =============================================================================

/**
 * Schema for internal metadata attached to validated wrapper functions.
 *
 * Used to detect whether a function has already been wrapped,
 * preventing double-wrapping when both `args()` and `returns()`
 * are applied in the same pipe.
 *
 * Uses `v.custom()` for `__original` instead of `functionSchema()` to avoid
 * a circular import (`types.ts` → `function.ts` → `wrapper-utils.ts` → `types.ts`).
 */
export const WrapperMetaSchema = v.strictObject({
	/** The original unwrapped function. */
	__original: v.custom<FnType>(
		(val: unknown): boolean => typeof val === 'function',
		'Expected a callable function',
	),
	/** Schema used for argument validation (if any). */
	__argsSchema: v.optional(
		v.custom<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
			(val: unknown): boolean => typeof val === 'object' && val !== null && 'type' in val,
		),
	),
	/** Schema used for return validation (if any). */
	__returnsSchema: v.optional(
		v.custom<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
			(val: unknown): boolean => typeof val === 'object' && val !== null && 'type' in val,
		),
	),
	/** Error mode for this wrapper. */
	__onError: ErrorModeSchema,
});

/** Internal metadata attached to validated wrapper functions. @see {@link WrapperMetaSchema} */
export type WrapperMeta = v.InferOutput<typeof WrapperMetaSchema>;
