/**
 * Base function schema.
 *
 * Provides `functionSchema()` — a Valibot schema that validates a value
 * is callable (`typeof val === 'function'`). Use as the starting point
 * in a `v.pipe()` to compose function validation with `args()`, `returns()`,
 * and `arity()` actions.
 *
 * @module
 */

import * as v from 'valibot';

import type { Bool, Str } from '@/schemas/common';
import type { FnType } from '@/schemas/function/types';
import { _toFnType } from '@/schemas/function/wrapper-utils';

// =============================================================================
// Constants
// =============================================================================

/**
 * AsyncFunction constructor reference.
 *
 * Used to detect async functions via `fn.constructor === AsyncFunction`.
 * Arrow async functions and `async function` declarations both have
 * this constructor.
 */
// oxlint-disable-next-line no-empty-function -- Empty body required to extract AsyncFunction constructor
const AsyncFunction: FnType = _toFnType((async () => {}).constructor);

// =============================================================================
// Function Schema
// =============================================================================

/**
 * Creates a base function schema that validates a value is callable.
 *
 * Use as the starting point in a `v.pipe()` to compose function validation.
 * On its own, only checks `typeof val === 'function'`. Combine with
 * `args()`, `returns()`, and `arity()` actions for full signature validation.
 *
 * @typeParam TArgs - Tuple type of function parameters. Defaults to `unknown[]`.
 * @typeParam TReturn - Function return type. Defaults to `unknown`.
 * @returns `GenericSchema<(...args: TArgs) => TReturn>` — a Valibot schema that validates callability.
 *
 * @example
 * ```typescript
 * // Untyped — any function passes
 * const AnyFn = functionSchema();
 *
 * // Typed — type-only (no runtime param/return validation)
 * const TypedFn = functionSchema<[Str, Num], Bool>();
 *
 * // In a pipe with actions
 * const ValidatedFn = v.pipe(
 *   functionSchema(),
 *   args(v.tuple([v.string()])),
 *   returns(v.number()),
 * );
 * ```
 *
 * @remarks
 * This schema does NOT validate parameter types or return types at parse time.
 * To validate signatures at call time, use `args()` and `returns()` in a pipe.
 * To validate arity at parse time, use `arity()` in a pipe.
 *
 * Class constructors (`class Foo {}`) are rejected — only plain functions
 * and arrow functions pass validation.
 */
export function functionSchema<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
>(): v.GenericSchema<FnType<TArgs, TReturn>> {
  return v.custom<FnType<TArgs, TReturn>>((val: unknown): boolean => {
    if (typeof val !== 'function') return false;

    // Reject class constructors — they look like functions but
    // have different semantics (must be called with `new`)
    const str: Str = val.toString();
    if (str.startsWith('class ') || str.startsWith('class{')) return false;

    return true;
  }, 'Expected a callable function (not a class constructor)');
}

/**
 * Checks whether a function is async (constructed with AsyncFunction).
 *
 * @param fn - The function to check.
 * @returns `true` if the function is an async function.
 */
export function isAsyncFunction(fn: FnType): Bool {
  return fn.constructor === AsyncFunction;
}
