/**
 * Arity validation action for function schemas.
 *
 * Provides `arity()` — a Valibot pipe action that validates `fn.length`
 * at parse time. This is a **validation action** (not a transformation) —
 * it does not wrap the function, so there is zero runtime overhead after
 * the initial check.
 *
 * **Why `v.safeParse()` instead of the `safeParse` wrapper from `@/utils/result/safe`:**
 * The `schemas/function` package sits in the `shared/schemas` layer, which is
 * upstream of `shared/utils`. We use Valibot's `v.safeParse()` directly and
 * return `Result<T>` using `ok`/`err` from `@/schemas/result/result`.
 *
 * @module
 */

// Architecture note: This file uses v.safeParse() directly (not safeParse from @/utils/result/safe)
// because schemas/function cannot depend on utils/result (dependency direction: schemas ← utils).

import * as v from 'valibot';

import {
  type Message,
  MessageSchema,
  type NonNegativeInteger,
  NonNegativeIntegerSchema,
} from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';

import type { ArityConstraint, FnType } from '@/schemas/function/types';

// =============================================================================
// Arity Action
// =============================================================================

/**
 * Pipe action that validates function arity at parse time.
 *
 * Checks `fn.length` against the specified constraint. This is a
 * **validation action** (not a transformation) — it does not wrap
 * the function, so there is zero runtime overhead after validation.
 *
 * Returns `Result<v.CheckAction<FnType, Message>>` so that validation
 * errors on the constraint itself can propagate to callers.
 *
 * @param constraint - Either an exact arity (number) or a range `{ min?, max? }`.
 * @returns `Result<v.CheckAction<FnType, Message>>` — the check action on success,
 *   or an error if the constraint values fail branded type validation.
 *
 * @example
 * ```typescript
 * // Exact arity
 * const arityResult = arity(2);
 * if (!arityResult.ok) throw new Error(arityResult.error.message);
 * const BinaryFn = v.pipe(functionSchema(), arityResult.data);
 *
 * // Range
 * const rangeResult = arity({ min: 1, max: 3 });
 * if (!rangeResult.ok) throw new Error(rangeResult.error.message);
 * const FlexFn = v.pipe(functionSchema(), rangeResult.data);
 *
 * import { safeParse } from '@/utils/result/safe';
 *
 * const result1 = safeParse(BinaryFn, (a, b) => a + b);   // OK
 * if (result1.ok) result1.data;
 *
 * const result2 = safeParse(BinaryFn, (a) => a);           // fails
 * if (!result2.ok) result2.error;
 * ```
 *
 * @remarks
 * **Important**: `fn.length` only counts formal parameters before the first
 * parameter with a default value or a rest parameter:
 * - `(a, b) => {}` has length 2
 * - `(a, b = 0) => {}` has length 1
 * - `(...args) => {}` has length 0
 *
 * For functions with default or rest parameters, use `{ min }` instead of
 * an exact arity.
 */
export function arity(constraint: ArityConstraint): Result<v.CheckAction<FnType, Message>> {
  const isExact: boolean = typeof constraint === 'number';

  // Validate min/max as NonNegativeInteger (branded type)
  let min: NonNegativeInteger | undefined;
  let max: NonNegativeInteger | undefined;

  if (isExact) {
    const parsed: v.SafeParseResult<typeof NonNegativeIntegerSchema> = v.safeParse(
      NonNegativeIntegerSchema,
      constraint,
    );
    if (!parsed.success) {
      return err(
        ERRORS.FUNCTION.INVALID_ARITY,
        `Invalid arity constraint: expected a non-negative integer, got ${String(constraint)}`,
        {
          meta: { constraint, issues: parsed.issues },
        },
      );
    }
    min = parsed.output;
    max = parsed.output;
  } else if (typeof constraint === 'object') {
    if (constraint.min !== undefined) {
      const parsedMin: v.SafeParseResult<typeof NonNegativeIntegerSchema> = v.safeParse(
        NonNegativeIntegerSchema,
        constraint.min,
      );
      if (!parsedMin.success) {
        return err(
          ERRORS.FUNCTION.INVALID_ARITY,
          `Invalid arity constraint min: expected a non-negative integer, got ${String(constraint.min)}`,
          {
            meta: { constraint, issues: parsedMin.issues },
          },
        );
      }
      min = parsedMin.output;
    }
    if (constraint.max !== undefined) {
      const parsedMax: v.SafeParseResult<typeof NonNegativeIntegerSchema> = v.safeParse(
        NonNegativeIntegerSchema,
        constraint.max,
      );
      if (!parsedMax.success) {
        return err(
          ERRORS.FUNCTION.INVALID_ARITY,
          `Invalid arity constraint max: expected a non-negative integer, got ${String(constraint.max)}`,
          {
            meta: { constraint, issues: parsedMax.issues },
          },
        );
      }
      max = parsedMax.output;
    }
  }

  // Build description message and validate as Message (branded type)
  const descriptionRaw: string = isExact
    ? `Function must have exactly ${String(constraint)} parameter(s) (fn.length)`
    : // oxlint-disable-next-line no-negated-condition
      `Function must have ${min !== undefined ? `>= ${String(min)}` : ''}${min !== undefined && max !== undefined ? ' and ' : ''}${max !== undefined ? `<= ${String(max)}` : ''} parameter(s) (fn.length)`;

  const descriptionParsed: v.SafeParseResult<typeof MessageSchema> = v.safeParse(
    MessageSchema,
    descriptionRaw,
  );
  if (!descriptionParsed.success) {
    return err(ERRORS.FUNCTION.INVALID_ARITY, 'Failed to construct arity description message', {
      meta: { constraint, issues: descriptionParsed.issues },
    });
  }
  const description: Message = descriptionParsed.output;

  const action: v.CheckAction<FnType, Message> = v.check<FnType, Message>((fn: FnType): boolean => {
    // fn.length is always a non-negative integer (JS guarantee),
    // but we validate defensively via v.safeParse
    const lenParsed: v.SafeParseResult<typeof NonNegativeIntegerSchema> = v.safeParse(
      NonNegativeIntegerSchema,
      fn.length,
    );
    if (!lenParsed.success) {
      return false;
    }
    const len: NonNegativeInteger = lenParsed.output;
    if (min !== undefined && len < min) {
      return false;
    }
    if (max !== undefined && len > max) {
      return false;
    }
    return true;
  }, description);

  return okUnchecked<v.CheckAction<FnType, Message>>(action);
}
