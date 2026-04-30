/**
 * Return value validation action for function schemas.
 *
 * Provides `returns()` — a Valibot pipe action that wraps a function with
 * per-call return value validation. The wrapper calls `v.safeParse()` on
 * the return value after each invocation.
 *
 * @module
 */

import * as v from 'valibot';

import type { CallTimeOptions, ErrorMode, FnType, WrapperMeta } from '@/schemas/function/types';
import {
  _toBaseSchema,
  _toFnType,
  createWrapper,
  getWrapperMeta,
} from '@/schemas/function/wrapper-utils';

// =============================================================================
// Returns Action
// =============================================================================

/**
 * Pipe action that validates function return values at call time.
 *
 * Wraps the function in a validated proxy that calls `v.safeParse()`
 * on the return value after each invocation.
 *
 * **Result-aware**: If the function returns a `Result<T>`, validates
 * `.data` inside the Result rather than the Result wrapper itself.
 * Error Results (`ok: false`) pass through without validation.
 *
 * **Async-aware**: If the function returns a Promise, the wrapper
 * awaits it and validates the resolved value.
 *
 * @typeParam TArgs - Tuple type of function parameters (preserved through the transform).
 * @typeParam TReturn - The validated return type.
 * @param {v.GenericSchema<TReturn>} schema - Schema to validate the return value against.
 *   For Result-returning functions, this validates the `.data` field.
 * @param {CallTimeOptions} options - Optional configuration.
 * @param options.onError - Error behavior: `'throw'` (default) or `'result'`.
 * @returns {v.TransformAction<FnType<TArgs, unknown>, FnType<TArgs, TReturn>>} A pipe action that transforms the function into a validated wrapper.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const Schema = v.pipe(
 *   functionSchema(),
 *   args(v.tuple([v.string()])),
 *   returns(v.number()),
 * );
 *
 * // OK — returns number
 * const result = safeParse(Schema, (s: Str) => s.length);
 * if (result.ok) result.data('hello'); // 5
 *
 * // Fails at call time — returns string, not number
 * const result2 = safeParse(Schema, (s: Str) => s.toUpperCase());
 * if (result2.ok) result2.data('hello'); // throws at call time
 * ```
 *
 * @remarks
 * Combine with `args()` for full input/output validation.
 * The wrapper detects Promise returns automatically — no separate
 * async variant needed.
 *
 * If both `args()` and `returns()` are in the same pipe, the wrapper is
 * shared — both validations happen in a single wrapper rather than nesting.
 */
export function returns<TArgs extends unknown[], TReturn>(
  schema: v.GenericSchema<TReturn>,
  options?: CallTimeOptions,
): v.TransformAction<FnType<TArgs, unknown>, FnType<TArgs, TReturn>> {
  const onError: ErrorMode = options?.onError ?? 'throw';

  return v.transform<FnType<TArgs, unknown>, FnType<TArgs, TReturn>>(
    (fn: FnType<TArgs, unknown>): FnType<TArgs, TReturn> => {
      // Check if already wrapped (by a prior args() in the pipe)
      const existingMeta: WrapperMeta | undefined = getWrapperMeta(fn);
      if (existingMeta) {
        // Update the existing wrapper with returns schema
        return createWrapper<TArgs, TReturn>(
          _toFnType<TArgs, TReturn>(existingMeta.__original),
          existingMeta.__argsSchema,
          _toBaseSchema(schema),
          onError,
        );
      }

      // Create a new wrapper with returns validation only
      return createWrapper<TArgs, TReturn>(
        _toFnType<TArgs, TReturn>(fn),
        undefined,
        _toBaseSchema(schema),
        onError,
      );
    },
  );
}
