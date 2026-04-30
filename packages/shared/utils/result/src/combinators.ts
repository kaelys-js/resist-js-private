/**
 * Result Combinators
 *
 * Functional transformation utilities for `Result<T>`. Provides `map()`,
 * `mapErr()`, `andThen()`, `orElse()`, `match()`, `unwrapOr()`, and
 * combining utilities. These complement the `if (!result.ok)` pattern
 * with functional alternatives found in neverthrow, ts-results, true-myth,
 * Rust's `Result`, and Swift's `Result`.
 *
 * All combinators accept and return `Result<T>` — they don't modify the
 * discriminated union pattern or require method chaining.
 *
 * @module
 */

import {
  type AppError,
  type KnownErrorCode,
  type ErrOptions,
  type Result,
  err,
  okUnchecked,
  ERRORS,
} from '@/schemas/result/result';
import { fromUnknownError } from '@/utils/result/safe';

// =============================================================================
// Transformation
// =============================================================================

/**
 * Transforms the success value of a Result.
 *
 * If the Result is `ok`, applies the function to the data and wraps the
 * output in a new `ok` Result. If the Result is `err`, passes it through
 * unchanged.
 *
 * @param {Result<T>} result - The Result to transform.
 * @param {(data: T) => U} fn - Function to apply to the success value.
 * @returns {Result<U>} `Result<U>` — transformed success or unchanged error.
 *
 * @example
 * ```typescript
 * import { map } from '@/utils/result/combinators';
 *
 * const num: Result<Num> = ok(NumSchema, 42);
 * const str: Result<Str> = map(num, (n) => String(n));
 * // str.data === '42'
 * ```
 */
export function map<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (!result.ok) {
    return result;
  }
  try {
    return okUnchecked<U>(fn(result.data as T));
  } catch (error: unknown) {
    return err(ERRORS.INTERNAL.UNEXPECTED, {
      cause: fromUnknownError(error),
      meta: { operation: 'map' },
    });
  }
}

/**
 * Transforms the error of a Result.
 *
 * If the Result is `err`, applies the function to create a new error.
 * If the Result is `ok`, passes it through unchanged.
 *
 * @param {Result<T>} result - The Result to transform.
 * @param {(error: AppError) => { code: KnownErrorCode; message?: string; options?: ErrOptions }} fn - Function that receives the AppError and returns `{ code, message?, options? }`.
 * @returns {Result<T>} `Result<T>` — unchanged success or transformed error.
 *
 * @example
 * ```typescript
 * import { mapErr } from '@/utils/result/combinators';
 *
 * const wrapped: Result<Config> = mapErr(result, (e) => ({
 *   code: ERRORS.CONFIG.LOAD_FAILED,
 *   message: `Config error: ${e.message}`,
 *   options: { cause: e },
 * }));
 * ```
 * @param {(error: AppError) => { code: KnownErrorCode; message?: string; options?: ErrOptions }} fn - Description
 * @param {(error: AppError) => { code: KnownErrorCode; message?: string; options?: ErrOptions }} fn - Description
 * @param {(error: AppError) => { code: KnownErrorCode; message?: string; options?: ErrOptions }} fn - Description
 * @param {(error: AppError) => { code: KnownErrorCode; message?: string; options?: ErrOptions }} fn - Description
 */
export function mapErr<T>(
  result: Result<T>,
  fn: (error: AppError) => { code: KnownErrorCode; message?: string; options?: ErrOptions },
): Result<T> {
  if (result.ok) {
    return result;
  }
  const mapped: { code: KnownErrorCode; message?: string; options?: ErrOptions } = fn(result.error);
  return err(mapped.code, mapped.message, mapped.options) as Result<T>;
}

/**
 * Chains a Result-returning function onto a success Result.
 *
 * If the Result is `ok`, applies the function (which itself returns a Result).
 * If the Result is `err`, passes it through unchanged. This is `flatMap` /
 * `chain` / `bind` — the monadic bind operation.
 *
 * @param {Result<T>} result - The Result to chain from.
 * @param {(data: T) => Result<U>} fn - Function that takes the success value and returns a new Result.
 * @returns {Result<U>} `Result<U>` — the chained Result.
 *
 * @example
 * ```typescript
 * import { andThen } from '@/utils/result/combinators';
 *
 * const user: Result<User> = andThen(
 *   safeParse(IdSchema, input),
 *   (id) => findUser(id),
 * );
 * ```
 */
export function andThen<T, U>(result: Result<T>, fn: (data: T) => Result<U>): Result<U> {
  if (!result.ok) {
    return result;
  }
  try {
    return fn(result.data as T);
  } catch (error: unknown) {
    return err(ERRORS.INTERNAL.UNEXPECTED, {
      cause: fromUnknownError(error),
      meta: { operation: 'andThen' },
    });
  }
}

/**
 * Recovers from an error by applying a fallback function.
 *
 * If the Result is `err`, applies the function (which returns a new Result).
 * If the Result is `ok`, passes it through unchanged.
 *
 * @param {Result<T>} result - The Result to recover from.
 * @param {(error: AppError) => Result<T>} fn - Function that takes the AppError and returns a recovery Result.
 * @returns {Result<T>} `Result<T>` — the original success or the recovery Result.
 *
 * @example
 * ```typescript
 * import { orElse } from '@/utils/result/combinators';
 *
 * const config: Result<Config> = orElse(
 *   loadConfig(path),
 *   (e) => ok(ConfigSchema, DEFAULT_CONFIG),
 * );
 * ```
 */
export function orElse<T>(result: Result<T>, fn: (error: AppError) => Result<T>): Result<T> {
  if (result.ok) {
    return result;
  }
  try {
    return fn(result.error);
  } catch (error: unknown) {
    return err(ERRORS.INTERNAL.UNEXPECTED, {
      cause: fromUnknownError(error),
      meta: { operation: 'orElse' },
    });
  }
}

/**
 * Exhaustive pattern matching on a Result.
 *
 * Applies one of two functions depending on whether the Result is
 * success or failure. Both branches must return the same type.
 *
 * @param {Result<T>} result - The Result to match.
 * @param {{
    ok: (data: T) => U;
    err: (error: AppError) => U;
  }} handlers - Object with `ok` and `err` handler functions.
 * @returns {U} `U` — the value from whichever handler was invoked.
 *
 * @example
 * ```typescript
 * import { match } from '@/utils/result/combinators';
 *
 * const message: Str = match(result, {
 *   ok: (user) => `Hello, ${user.name}`,
 *   err: (error) => `Error: ${error.message}`,
 * });
 * ```
  * @param {{
    ok: (data: T) => U;
    err: (error: AppError) => U;
  }} handlers - Description
  * @param {{
    ok: (data: T) => U;
    err: (error: AppError) => U;
  }} handlers - Description
  * @param {{
    ok: (data: T) => U;
    err: (error: AppError) => U;
  }} handlers - Description
  * @param {{
    ok: (data: T) => U;
    err: (error: AppError) => U;
  }} handlers - Description
 */
export function match<T, U>(
  result: Result<T>,
  handlers: {
    ok: (data: T) => U;
    err: (error: AppError) => U;
  },
): U {
  if (result.ok) {
    return handlers.ok(result.data as T);
  }
  return handlers.err(result.error);
}

/**
 * Extracts the success value or returns a default.
 *
 * If the Result is `ok`, returns the data. If `err`, returns the
 * provided default value.
 *
 * @param {Result<T>} result - The Result to unwrap.
 * @param {T} defaultValue - The value to return if the Result is an error.
 * @returns {T} `T` — the success data or the default.
 *
 * @example
 * ```typescript
 * import { unwrapOr } from '@/utils/result/combinators';
 *
 * const count: Num = unwrapOr(parseCount(input), 0);
 * ```
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (result.ok) {
    return result.data as T;
  }
  return defaultValue;
}

// =============================================================================
// Side Effects
// =============================================================================

/**
 * Executes a side effect on success without changing the Result.
 *
 * If the Result is `ok`, calls the function with the data and returns
 * the original Result unchanged. If `err`, passes through. Useful for
 * logging, metrics, or other side effects in a chain.
 *
 * Named `tap` following true-myth / Ramda conventions.
 *
 * @param {Result<T>} result - The Result to tap.
 * @param {(data: T) => void} fn - Side-effect function. Return value is ignored.
 * @returns {Result<T>} `Result<T>` — the original Result, unchanged.
 *
 * @example
 * ```typescript
 * import { tap } from '@/utils/result/combinators';
 *
 * const user: Result<User> = tap(findUser(id), (u) => {
 *   log.info(`Found user: ${u.name}`);
 * });
 * ```
 */
export function tap<T>(result: Result<T>, fn: (data: T) => void): Result<T> {
  if (result.ok) {
    try {
      fn(result.data as T);
    } catch {
      /* side effect — swallow */
    }
  }
  return result;
}

/**
 * Executes a side effect on error without changing the Result.
 *
 * If the Result is `err`, calls the function with the error and returns
 * the original Result unchanged. If `ok`, passes through.
 *
 * @param {Result<T>} result - The Result to tap on error.
 * @param {(error: AppError) => void} fn - Side-effect function. Return value is ignored.
 * @returns {Result<T>} `Result<T>` — the original Result, unchanged.
 *
 * @example
 * ```typescript
 * import { tapErr } from '@/utils/result/combinators';
 *
 * const config: Result<Config> = tapErr(loadConfig(path), (e) => {
 *   log.warn(`Config load failed: ${e.message}`);
 * });
 * ```
 */
export function tapErr<T>(result: Result<T>, fn: (error: AppError) => void): Result<T> {
  if (!result.ok) {
    try {
      fn(result.error);
    } catch {
      /* side effect — swallow */
    }
  }
  return result;
}

// =============================================================================
// Combining
// =============================================================================

/**
 * Combines multiple Results into a single Result of an array.
 *
 * If ALL Results are `ok`, returns `ok` with an array of all success values.
 * If ANY Result is `err`, returns the FIRST error encountered.
 *
 * For accumulating ALL errors, use {@link combineWithAllErrors}.
 *
 * @param {ReadonlyArray<Result<T>>} results - Array of Results to combine.
 * @returns {Result<readonly T[]>} `Result<ReadonlyArray<T>>` — combined success or first error.
 *
 * @example
 * ```typescript
 * import { combine } from '@/utils/result/combinators';
 *
 * const results: Result<Num>[] = [safeParse(NumSchema, 1), safeParse(NumSchema, 2)];
 * const combined: Result<ReadonlyArray<Num>> = combine(results);
 * if (combined.ok) combined.data; // [1, 2]
 * ```
 */
export function combine<T>(results: ReadonlyArray<Result<T>>): Result<readonly T[]> {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.data as T);
  }
  return okUnchecked<readonly T[]>(values);
}

/**
 * Combines multiple Results, accumulating ALL errors.
 *
 * If ALL Results are `ok`, returns `ok` with an array of all success values.
 * If ANY Results are `err`, returns a single error with all failures as
 * `related` errors.
 *
 * Unlike {@link combine} which stops at the first error, this collects
 * every error. Follows neverthrow's `combineWithAllErrors` and Effect's
 * `validate` pattern.
 *
 * @param {ReadonlyArray<Result<T>>} results - Array of Results to combine.
 * @returns {Result<readonly T[]>} `Result<ReadonlyArray<T>>` — combined success or accumulated errors.
 *
 * @example
 * ```typescript
 * import { combineWithAllErrors } from '@/utils/result/combinators';
 *
 * const results: Result<Str>[] = [
 *   safeParse(EmailSchema, 'bad'),
 *   safeParse(NameSchema, ''),
 * ];
 * const combined: Result<ReadonlyArray<Str>> = combineWithAllErrors(results);
 * if (!combined.ok) {
 *   combined.error.related; // array of all validation errors
 * }
 * ```
 */
export function combineWithAllErrors<T>(results: ReadonlyArray<Result<T>>): Result<readonly T[]> {
  const values: T[] = [];
  const errors: AppError[] = [];

  for (const result of results) {
    if (result.ok) {
      values.push(result.data as T);
    } else {
      errors.push(result.error);
    }
  }

  const [firstError, ...relatedErrors]: AppError[] = errors;
  if (firstError === undefined) {
    return okUnchecked<readonly T[]>(values);
  }

  return err(firstError.code, firstError.message, {
    ...(firstError.validation !== undefined && { validation: firstError.validation }),
    ...(firstError.source !== undefined && { source: firstError.source }),
    ...(firstError.cause !== undefined && { cause: firstError.cause }),
    ...(firstError.meta !== undefined && { meta: firstError.meta }),
    ...(relatedErrors.length > 0 && { related: relatedErrors }),
  });
}

// =============================================================================
// Wrapping Throwing Functions
// =============================================================================

/**
 * Wraps a throwing synchronous function into a Result-returning function.
 *
 * The returned function catches exceptions and converts them to error
 * Results using `fromUnknownError()`. Follows neverthrow's `fromThrowable`
 * and true-myth's `tryOr`.
 *
 * @param {(...args: TArgs) => TReturn} fn - A function that may throw.
 * @param {KnownErrorCode} errorCode - The error code to use if the function throws.
 * @returns {(...args: TArgs) => Result<TReturn>} A new function with the same signature but returning `Result<T>`.
 *
 * @example
 * ```typescript
 * import { fromThrowable } from '@/utils/result/combinators';
 *
 * const safeJsonParse = fromThrowable(
 *   (input: Str) => JSON.parse(input),
 *   ERRORS.ENCODING.JSON_FAILED,
 * );
 *
 * const result: Result<unknown> = safeJsonParse('{"valid": true}');
 * if (result.ok) result.data; // { valid: true }
 * ```
 */
export function fromThrowable<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  errorCode: KnownErrorCode,
): (...args: TArgs) => Result<TReturn> {
  return (...args: TArgs): Result<TReturn> => {
    try {
      return okUnchecked<TReturn>(fn(...args));
    } catch (error: unknown) {
      return err(errorCode, {
        cause: fromUnknownError(error),
      });
    }
  };
}

/**
 * Wraps a throwing async function into a Result-returning async function.
 *
 * Same as {@link fromThrowable} but for async functions.
 *
 * @param {(...args: TArgs) => Promise<TReturn>} fn - An async function that may throw or reject.
 * @param {KnownErrorCode} errorCode - The error code to use on failure.
 * @returns {(...args: TArgs) => Promise<Result<TReturn>>} A new async function returning `Promise<Result<T>>`.
 *
 * @example
 * ```typescript
 * import { fromAsyncThrowable } from '@/utils/result/combinators';
 *
 * const safeFetch = fromAsyncThrowable(
 *   async (url: Str) => {
 *     const res: Response = await fetch(url);
 *     return res.json();
 *   },
 *   ERRORS.IO.FETCH_FAILED,
 * );
 *
 * const result: Result<unknown> = await safeFetch('https://api.example.com/data');
 * ```
 */
export function fromAsyncThrowable<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  errorCode: KnownErrorCode,
): (...args: TArgs) => Promise<Result<TReturn>> {
  return async (...args: TArgs): Promise<Result<TReturn>> => {
    try {
      const value: TReturn = await fn(...args);
      return okUnchecked<TReturn>(value);
    } catch (error: unknown) {
      return err(errorCode, {
        cause: fromUnknownError(error),
      });
    }
  };
}
