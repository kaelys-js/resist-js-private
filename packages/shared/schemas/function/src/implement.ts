/**
 * Implementation action for function schemas.
 *
 * Provides `implement()` — a Valibot pipe action that attaches a concrete
 * function implementation to a schema. When combined with `args()` and
 * `returns()`, the implementation is automatically wrapped with
 * input/output validation.
 *
 * This is the Valibot equivalent of Zod's `.implement()` method.
 *
 * @module
 */

import * as v from 'valibot';

import type { FnType, WrapperMeta } from '@/schemas/function/types';
import { createWrapper, getWrapperMeta } from '@/schemas/function/wrapper-utils';

// =============================================================================
// Implement Action
// =============================================================================

/**
 * Pipe action that attaches a concrete function implementation to a schema.
 *
 * The provided function becomes the schema's output value. When combined
 * with `args()` and `returns()` earlier in the pipe, the implementation
 * is automatically wrapped with input/output validation.
 *
 * This is the Valibot equivalent of Zod's `.implement()` method.
 *
 * @typeParam TArgs - Tuple type of function parameters (inferred from pipe).
 * @typeParam TReturn - Return type (inferred from pipe).
 * @param {FnType<TArgs, TReturn>} fn - The function implementation. Parameter and return types
 *   are inferred from preceding `args()` and `returns()` actions in the pipe.
 * @returns {v.TransformAction<FnType<TArgs, TReturn>, FnType<TArgs, TReturn>>} A pipe action that replaces the input with the implemented function.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const trimmedLength = v.pipe(
 *   functionSchema(),
 *   args(v.tuple([v.string()])),
 *   returns(v.number()),
 *   implement((input) => input.trim().length),
 * );
 *
 * // Parse with undefined — implementation is the output
 * const result = safeParse(trimmedLength, undefined);
 * if (result.ok) {
 *   result.data('sandwich');  // 8
 *   result.data(42);          // throws ValiError (arg validation)
 * }
 * ```
 *
 * @remarks
 * Most use cases pass an existing function through `safeParse(schema, existingFn)`
 * rather than using `implement()`. Use `implement()` when defining validated
 * functions inline, similar to Zod's function factory pattern.
 *
 * If `args()` or `returns()` are present earlier in the pipe, their schemas
 * are applied to the implementation via the shared wrapper mechanism.
 */
export function implement<TArgs extends unknown[], TReturn>(
  fn: FnType<TArgs, TReturn>,
): v.TransformAction<FnType<TArgs, TReturn>, FnType<TArgs, TReturn>> {
  return v.transform<FnType<TArgs, TReturn>, FnType<TArgs, TReturn>>(
    (pipeInput: FnType<TArgs, TReturn>): FnType<TArgs, TReturn> => {
      // If a wrapper was created by preceding args()/returns() actions,
      // re-create it with the new implementation
      const existingMeta: WrapperMeta | undefined = getWrapperMeta(pipeInput);

      if (existingMeta) {
        return createWrapper<TArgs, TReturn>(
          fn,
          existingMeta.__argsSchema,
          existingMeta.__returnsSchema,
          existingMeta.__onError,
        );
      }

      // No prior wrapper — return the implementation as-is
      return fn;
    },
  );
}
