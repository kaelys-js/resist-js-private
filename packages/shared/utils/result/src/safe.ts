/**
 * Safe Wrappers
 *
 * Result-returning wrappers for Valibot schema validation and error conversion.
 * Provides `safeParse()` — the primary way to validate data in the codebase —
 * and `fromUnknownError()` for converting caught exceptions into typed `AppError` objects.
 *
 * Every function here returns `Result<T>`. On failure, the error is a fully
 * populated `AppError` with code, message, id, timestamp, and stack.
 *
 * @example
 * ```typescript
 * import * as v from 'valibot';
 * import { safeParse, fromUnknownError } from '@/utils/result';
 * import { ok, err, ERRORS, type Result } from '@/schemas/result';
 *
 * const UserSchema = v.strictObject({
 *   name: v.pipe(v.string(), v.minLength(1)),
 *   email: v.pipe(v.string(), v.email()),
 * });
 *
 * function parseUser(input: unknown): Result<User> {
 *   const result = safeParse(UserSchema, input);
 *   if (!result.ok) return result;
 *   return ok(UserSchema, result.data);
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import type { Str } from '@/schemas/common';
import {
  ERRORS,
  type AppError,
  type Result,
  type ValidationDetail,
  err,
} from '@/schemas/result/result';

/**
 * Deeply freezes an object to prevent mutation at runtime.
 * Recursively freezes all nested objects and arrays.
 *
 * **Why inlined:** `@/utils/result` depends only on `@/schemas/result` (the leaf
 * package). Importing from `@/utils/core` would create a dependency that could
 * lead to circular imports as core utilities also depend on the Result system.
 *
 * @param obj - Object to deep freeze.
 * @returns `T` — the same object reference, deeply frozen.
 */
function _deepFreeze<T extends object>(obj: T): T {
  const propNames: Array<keyof T> = Object.getOwnPropertyNames(obj) as Array<keyof T>;

  for (const name of propNames) {
    const value: T[keyof T] = obj[name];

    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      _deepFreeze(value as object);
    }
  }
  return Object.freeze(obj) as T;
}

/**
 * Creates a frozen success Result from already-valid data.
 *
 * Centralizes the `Object.freeze` + `_deepFreeze` pattern.
 * The `as object` cast is guarded by `typeof === 'object'` and `as Result<T>` is
 * necessary because `Object.freeze` returns `Readonly<T>`.
 *
 * @param data - The success value (already validated).
 * @returns `Result<T>` — frozen success result.
 */
function _okResult<T>(data: T): Result<T> {
  const frozen: T =
    typeof data === 'object' && data !== null ? (_deepFreeze(data as object) as T) : data;
  const result = { ok: true as const, data: frozen, error: null };
  Object.freeze(result);
  return result as Result<T>;
}

// =============================================================================
// Valibot
// =============================================================================

/**
 * Validates input against a Valibot schema and returns a `Result`.
 *
 * Wraps `v.safeParse()` — returns `ok(output)` on success, or
 * `err('VALIDATION.SCHEMA_FAILED', ...)` on failure with the `validation`
 * field populated with typed Valibot issues.
 *
 * This is the primary way to validate data in the codebase. It replaces
 * `v.parse()` (which throws) with a Result-returning alternative.
 *
 * @param {TSchema} schema - Valibot schema to validate against.
 * @param {unknown} input - The value to validate.
 * @returns {Result<v.InferOutput<TSchema>>} `Result<T>` — the validated output on success, or a validation
 *          error with full issue details.
 *
 * @example
 * ```typescript
 * import * as v from 'valibot';
 * import { safeParse } from '@/utils/result';
 * import { ok, type Result } from '@/schemas/result';
 *
 * const UserSchema = v.strictObject({
 *   name: v.pipe(v.string(), v.minLength(1)),
 *   email: v.pipe(v.string(), v.email()),
 * });
 *
 * function parseUser(input: unknown): Result<User> {
 *   const parsed = safeParse(UserSchema, input);
 *   if (!parsed.ok) return parsed;  // error has validation.issues and validation.flattened
 *   return ok(UserSchema, parsed.data);
 * }
 *
 * // Inspecting validation errors:
 * const result = parseUser({ name: '', email: 'bad' });
 * if (!result.ok && result.error.validation) {
 *   result.error.validation.flattened;
 *   // { nested: { name: ['String must have at least 1 character'], email: ['Invalid email'] } }
 *
 *   for (const issue of result.error.validation.issues) {
 *     const path = issue.path?.map(p => p.key).join('.') || 'root';
 *     `${path}: ${issue.message}`; // e.g. 'email: Invalid email'
 *   }
 * }
 * ```
 */
export function safeParse<TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: TSchema,
  input: unknown,
): Result<v.InferOutput<TSchema>> {
  try {
    const result: v.SafeParseResult<TSchema> = v.safeParse(schema, input);

    if (result.success) {
      return _okResult<v.InferOutput<TSchema>>(result.output);
    }

    const validation: ValidationDetail = {
      issues: result.issues,
      flattened: v.flatten(result.issues),
    };

    return err(ERRORS.VALIDATION.SCHEMA_FAILED, {
      validation,
    });
  } catch (error: unknown) {
    return err(ERRORS.INTERNAL.SAFE_PARSE_THREW, {
      meta: { reason: 'safeParse threw' },
      cause: fromUnknownError(error),
    });
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Converts an unknown thrown value into an `AppError` for use as a `cause`.
 *
 * Used by the safe wrappers and any catch block that needs a typed cause chain.
 * Handles `Error` instances, plain strings, and arbitrary values.
 *
 * @param {unknown} thrown - The caught value (could be `Error`, `string`, or anything).
 * @returns {AppError} `AppError` — a typed error representing the original thrown value.
 *
 * @example
 * ```typescript
 * try {
 *   await import(configPath);
 * } catch (thrown: unknown) {
 *   return err(ERRORS.CONFIG.LOAD_FAILED, 'Failed to load config', {
 *     cause: fromUnknownError(thrown),
 *   });
 * }
 * ```
 */
export function fromUnknownError(thrown: unknown): AppError {
  // If already an AppError, return as-is (idempotent)
  if (
    typeof thrown === 'object' &&
    thrown !== null &&
    'code' in thrown &&
    'id' in thrown &&
    'timestamp' in thrown
  ) {
    const maybeAppError = thrown as Record<string, unknown>;

    if (typeof maybeAppError.code === 'string' && typeof maybeAppError.message === 'string') {
      return Object.freeze(thrown as AppError);
    }
  }

  let message: Str;

  if (thrown instanceof Error) {
    ({ message } = thrown);
  } else if (typeof thrown === 'string') {
    message = thrown;
  } else {
    message = String(thrown);
  }

  const stack: Str =
    thrown instanceof Error ? (thrown.stack ?? '') : (new Error(message).stack ?? '');

  // Preserve the Error class name in meta (e.g., TypeError, RangeError)
  const meta: Record<string, unknown> | undefined =
    thrown instanceof Error && thrown.constructor.name !== 'Error'
      ? { errorName: thrown.constructor.name }
      : undefined;

  return Object.freeze({
    code: ERRORS.INTERNAL.UNEXPECTED,
    message,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    stack,
    ...(meta !== undefined && { meta }),
  });
}
