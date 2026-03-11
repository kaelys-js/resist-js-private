/**
 * Shared wrapper utilities for function schema actions.
 *
 * Contains the core wrapping logic used by both `args()` and `returns()`
 * actions. The wrapper validates arguments before and return values after
 * each function call, using Valibot's `safeParse()`.
 *
 * **Why `v.safeParse()` instead of the `safeParse` wrapper from `@/utils/result/safe`:**
 * The `schemas/function` package sits in the `shared/schemas` layer, which is
 * upstream of `shared/utils`. The dependency direction is `schemas ← utils`
 * (utils depends on schemas, not the other way around), so importing from
 * `@/utils/result/safe` would create a circular dependency. We use Valibot's
 * `v.safeParse()` directly and handle the `{ success, issues }` result inline.
 *
 * Prevents double-wrapping: when both `args()` and `returns()` are in the
 * same pipe, they coordinate through wrapper metadata to produce a single
 * wrapper that handles both validations.
 *
 * @module
 */

// Architecture note: This file uses v.safeParse() directly (not safeParse from @/utils/result/safe)
// because schemas/function cannot depend on utils/result (dependency direction: schemas ← utils).

import * as v from 'valibot';

import type { Str } from '@/schemas/common';
import { ERRORS, err } from '@/schemas/result/result';

import type { ErrorMode, FnType, WrapperMeta } from '@/schemas/function/types';

// =============================================================================
// Wrapper Symbol
// =============================================================================

/**
 * Symbol used to attach wrapper metadata to validated functions.
 * Allows detection of already-wrapped functions to prevent double-wrapping.
 */
export const WRAPPER_SYMBOL: unique symbol = Symbol('functionSchemaWrapper');

// =============================================================================
// Internal Cast Helpers
// =============================================================================

/**
 * Casts an unknown value to `FnType<TArgs, TReturn>`.
 *
 * This is the **single centralized location** for `as FnType` casts in the
 * function schema package. All other files use this helper instead of
 * scattering `as FnType` throughout the codebase.
 *
 * @internal
 * @typeParam TArgs - Tuple of parameter types.
 * @typeParam TReturn - Return type.
 * @param value - The value to cast. Caller is responsible for ensuring
 *   the value is actually a function.
 * @returns The value typed as `FnType<TArgs, TReturn>`.
 */
export function _toFnType<TArgs extends unknown[] = unknown[], TReturn = unknown>(
  value: unknown,
): FnType<TArgs, TReturn> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- centralized cast
  return value as FnType<TArgs, TReturn>;
}

/**
 * Casts a `v.GenericSchema` to `v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>`.
 *
 * Valibot's `v.GenericSchema` is structurally compatible with `v.BaseSchema`
 * but TypeScript cannot prove it without a cast. This helper centralizes
 * that single cast.
 *
 * @internal
 * @param schema - The generic schema to cast.
 * @returns The schema typed as `v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>`.
 */
export function _toBaseSchema(
  schema: v.GenericSchema,
): v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- centralized cast
  return schema as v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
}

// =============================================================================
// Wrapper Metadata
// =============================================================================

/**
 * Retrieves wrapper metadata from a function, if it has been wrapped.
 *
 * @param fn - The function to inspect.
 * @returns Wrapper metadata if the function is a validated wrapper, or `undefined`.
 */
export function getWrapperMeta<TArgs extends unknown[], TReturn>(
  fn: FnType<TArgs, TReturn>,
): WrapperMeta | undefined {
  if (WRAPPER_SYMBOL in fn) {
    return fn[WRAPPER_SYMBOL] as WrapperMeta;
  }
  return undefined;
}

// =============================================================================
// Result Detection
// =============================================================================

/**
 * Checks whether a value is a Result object.
 *
 * Detects the `{ ok: boolean, data: unknown, error: unknown }` shape
 * used by the Result system. Used to enable Result-aware return validation.
 *
 * @param value - The value to check.
 * @returns `true` if the value matches the Result shape.
 */
function isResult(value: unknown): value is { ok: boolean; data: unknown; error: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof value.ok === 'boolean' &&
    'data' in value &&
    'error' in value
  );
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validates function arguments against a schema.
 *
 * @param argsSchema - Tuple schema for the arguments.
 * @param argsArray - The actual arguments passed to the function.
 * @param fnName - Function name for error messages.
 * @param onError - Error mode ('throw' or 'result').
 * @returns `null` if validation passes, or the error value to return/throw.
 * @throws {Error} When `onError` is `'throw'` and validation fails. This is
 *   intentional — callers opt into throwing behavior via the `onError` option.
 */
function validateArgs(
  argsSchema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
  argsArray: unknown[],
  fnName: Str,
  onError: ErrorMode,
): unknown | null {
  const result: v.SafeParseResult<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> =
    v.safeParse(argsSchema, argsArray);
  if (result.success) return null;

  const message: Str = `${fnName}: parameter validation failed — ${v.flatten(result.issues).nested ? JSON.stringify(v.flatten(result.issues).nested) : result.issues.map((i: v.BaseIssue<unknown>) => i.message).join('; ')}`;

  if (onError === 'result') {
    return err(ERRORS.FUNCTION.PARAM_VALIDATION_FAILED, message, {
      meta: { functionName: fnName, issues: result.issues },
    });
  }

  // Intentional: implements the 'throw' error mode for callers that opt in
  throw new Error(message);
}

/**
 * Validates a function's return value against a schema.
 *
 * **Result-aware**: If the return value is a `Result<T>` with `ok: true`,
 * validates `.data` instead of the entire Result object. If `ok: false`,
 * passes through without validation (errors are already structured).
 *
 * @param returnsSchema - Schema for the return value.
 * @param value - The actual return value.
 * @param fnName - Function name for error messages.
 * @param onError - Error mode ('throw' or 'result').
 * @returns The original value if valid, or the error value.
 * @throws {Error} When `onError` is `'throw'` and validation fails. This is
 *   intentional — callers opt into throwing behavior via the `onError` option.
 */
function validateReturn(
  returnsSchema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
  value: unknown,
  fnName: Str,
  onError: ErrorMode,
): unknown {
  // Result-aware: validate .data inside ok Results
  if (isResult(value)) {
    if (!value.ok) return value; // pass through error Results

    const result: v.SafeParseResult<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> =
      v.safeParse(returnsSchema, value.data);
    if (result.success) return value;

    const message: Str = `${fnName}: return value (.data) validation failed — ${result.issues.map((i: v.BaseIssue<unknown>) => i.message).join('; ')}`;

    if (onError === 'result') {
      return err(ERRORS.FUNCTION.RETURN_VALIDATION_FAILED, message, {
        meta: { functionName: fnName, issues: result.issues },
      });
    }

    // Intentional: implements the 'throw' error mode for callers that opt in
    throw new Error(message);
  }

  // Non-Result: validate the raw return value
  const result: v.SafeParseResult<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> =
    v.safeParse(returnsSchema, value);
  if (result.success) return value;

  const message: Str = `${fnName}: return value validation failed — ${result.issues.map((i: v.BaseIssue<unknown>) => i.message).join('; ')}`;

  if (onError === 'result') {
    return err(ERRORS.FUNCTION.RETURN_VALIDATION_FAILED, message, {
      meta: { functionName: fnName, issues: result.issues },
    });
  }

  // Intentional: implements the 'throw' error mode for callers that opt in
  throw new Error(message);
}

// =============================================================================
// Wrapper Factory
// =============================================================================

/**
 * Creates a validated wrapper function with optional args and return validation.
 *
 * The wrapper:
 * 1. Validates arguments (if `argsSchema` is provided) before calling the original
 * 2. Calls the original function, preserving `this` context
 * 3. Validates the return value (if `returnsSchema` is provided)
 * 4. For async functions (Promise returns), chains validation on the resolved value
 *
 * @typeParam TArgs - Tuple type of function parameters.
 * @typeParam TReturn - Function return type.
 * @param original - The original function to wrap.
 * @param argsSchema - Optional schema for argument validation.
 * @param returnsSchema - Optional schema for return value validation.
 * @param onError - Error mode for validation failures.
 * @returns The validated wrapper function with metadata attached.
 */
export function createWrapper<TArgs extends unknown[], TReturn>(
  original: FnType<TArgs, TReturn>,
  argsSchema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>> | undefined,
  returnsSchema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>> | undefined,
  onError: ErrorMode,
): FnType<TArgs, TReturn> {
  const fnName: Str = original.name || '<anonymous>';

  const wrapper: FnType<TArgs, TReturn> = _toFnType<TArgs, TReturn>(function wrappedFn(
    this: unknown,
    ...fnArgs: TArgs
  ): TReturn {
    // 1. Validate arguments
    if (argsSchema) {
      const argError: unknown | null = validateArgs(argsSchema, fnArgs, fnName, onError);
      if (argError !== null) return argError as TReturn;
    }

    // 2. Call original
    const result: TReturn = original.call(this, ...fnArgs);

    // 3. Validate return
    if (!returnsSchema) return result;

    // 4. Handle async (Promise) returns
    if (result instanceof Promise) {
      return (async () => {
        const resolved: unknown = await result;
        return validateReturn(returnsSchema, resolved, fnName, onError);
      })() as TReturn;
    }

    return validateReturn(returnsSchema, result, fnName, onError) as TReturn;
  });

  // Preserve function name for debugging
  Object.defineProperty(wrapper, 'name', { value: `validated(${fnName})`, configurable: true });

  // Attach metadata for coordination between args() and returns()
  const meta: WrapperMeta = {
    __original: _toFnType(original),
    __argsSchema: argsSchema,
    __returnsSchema: returnsSchema,
    __onError: onError,
  };
  Object.defineProperty(wrapper, WRAPPER_SYMBOL, { value: meta, configurable: true });

  return wrapper;
}
