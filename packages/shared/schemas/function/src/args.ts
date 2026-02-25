/**
 * Parameter validation action for function schemas.
 *
 * Provides `args()` — a Valibot pipe action that wraps a function with
 * per-call argument validation. The wrapper calls `v.safeParse()` on the
 * arguments tuple before each invocation.
 *
 * @module
 */

import * as v from 'valibot';

import type { CallTimeOptions, ErrorMode, FnType, WrapperMeta } from '@/schemas/function/types';
import { _toFnType, createWrapper, getWrapperMeta } from '@/schemas/function/wrapper-utils';

// =============================================================================
// Args Action
// =============================================================================

/**
 * Pipe action that validates function parameters at call time.
 *
 * Wraps the function in a validated proxy that calls `v.safeParse()`
 * on the arguments tuple before each invocation. If validation fails,
 * behavior depends on the error mode:
 * - `'throw'` (default): throws a `ValiError`-compatible error
 * - `'result'`: returns `err(ERRORS.FUNCTION.PARAM_VALIDATION_FAILED, ...)`
 *
 * @typeParam TArgs - Tuple type of function parameters.
 * @typeParam TReturn - Function return type (preserved through the transform).
 * @param schema - A tuple schema defining positional parameter types.
 *   Use `v.tuple([...])` for fixed params, `v.tupleWithRest([...], restSchema)` for rest params.
 * @param options - Optional configuration.
 * @param options.onError - Error behavior: `'throw'` (default) or `'result'`.
 * @returns A pipe action that transforms the function into a validated wrapper.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const Schema = v.pipe(
 *   functionSchema(),
 *   args(v.tuple([v.string(), v.number()])),
 * );
 *
 * const result = safeParse(Schema, (name: String, age: Number) => `${name} is ${age}`);
 * if (result.ok) {
 *   result.data('Alice', 30);  // OK
 *   result.data(42, 'bad');    // throws ValiError at call time
 * }
 * ```
 *
 * @remarks
 * This action transforms the function into a wrapper — the original function
 * is called internally. The wrapper preserves `this` binding and function name.
 * For async functions, parameter validation happens synchronously before the
 * async call.
 *
 * If both `args()` and `returns()` are in the same pipe, the wrapper is
 * shared — both validations happen in a single wrapper rather than nesting.
 */
export function args<TArgs extends unknown[], TReturn = unknown>(
	schema: v.GenericSchema<TArgs>,
	options?: CallTimeOptions,
): v.TransformAction<FnType<unknown[], TReturn>, FnType<TArgs, TReturn>> {
	const onError: ErrorMode = options?.onError ?? 'throw';

	return v.transform<FnType<unknown[], TReturn>, FnType<TArgs, TReturn>>(
		(fn: FnType<unknown[], TReturn>): FnType<TArgs, TReturn> => {
			// Check if already wrapped (by a prior returns() in the pipe)
			const existingMeta: WrapperMeta | undefined = getWrapperMeta(fn);
			if (existingMeta) {
				// Update the existing wrapper with args schema
				return createWrapper<TArgs, TReturn>(
					_toFnType<TArgs, TReturn>(existingMeta.__original),
					schema,
					existingMeta.__returnsSchema,
					onError,
				);
			}

			// Create a new wrapper with args validation only
			return createWrapper<TArgs, TReturn>(
				_toFnType<TArgs, TReturn>(fn),
				schema,
				undefined,
				onError,
			);
		},
	);
}
