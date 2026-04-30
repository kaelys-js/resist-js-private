/**
 * Error Utility Functions
 *
 * Type guards, error matching, cause chain traversal, domain extraction,
 * and severity helpers for `AppError` and `Result<T>`. These complement
 * the core Result system with inspection and transformation capabilities
 * found in Rust's anyhow/miette, cockroachdb/errors, Go's `errors.Is/As`,
 * and Sentry.
 *
 * Every function returns `Result<T>` unless it is a type guard (which
 * must return `boolean` by TypeScript convention).
 *
 * @module
 */

import * as v from 'valibot';

import { type Bool, BoolSchema } from '@/schemas/common';
import {
  type AppError,
  type KnownErrorCode,
  type ErrorDomain,
  type ErrorSeverity,
  type Result,
  AppErrorSchema,
  ErrorDomainSchema,
  ErrorSeveritySchema,
  ERRORS,
  ok,
  okUnchecked,
  err,
} from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard that checks whether a value is an `AppError`.
 *
 * Validates against the `AppErrorSchema` at runtime. Use when you have
 * an `unknown` value that might be an error (e.g., from `JSON.parse`,
 * an external API, or an untyped catch block).
 *
 * @param {unknown} value - The value to check.
 * @returns {value is AppError} `true` if the value conforms to the `AppError` shape.
 *
 * @example
 * ```typescript
 * import { isAppError } from '@/utils/result/error-utils';
 *
 * const parsed: unknown = JSON.parse(response);
 * if (isAppError(parsed)) {
 *   parsed.code; // KnownErrorCode — typed
 * }
 * ```
 */
export function isAppError(value: unknown): value is AppError {
  const result: v.SafeParseResult<typeof AppErrorSchema> = v.safeParse(AppErrorSchema, value);
  return result.success;
}

/**
 * Type guard that checks whether a value is a `Result<unknown>`.
 *
 * Checks the discriminant `ok` field and structural shape. Does not
 * validate the inner data or error types beyond confirming the error
 * is an `AppError` when `ok` is `false`.
 *
 * @param {unknown} value - The value to check.
 * @returns {value is Result<unknown>} `true` if the value has the `Result` shape.
 *
 * @example
 * ```typescript
 * import { isResult } from '@/utils/result/error-utils';
 *
 * if (isResult(maybeResult)) {
 *   if (maybeResult.ok) {
 *     maybeResult.data; // unknown
 *   }
 * }
 * ```
 */
export function isResult(value: unknown): value is Result<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj: Record<string, unknown> = value as Record<string, unknown>;
  if (typeof obj.ok !== 'boolean') {
    return false;
  }
  if (obj.ok === true) {
    return 'data' in obj;
  }
  return 'error' in obj && isAppError(obj.error);
}

// =============================================================================
// Error Code Matching
// =============================================================================

/**
 * Checks whether an `AppError` has a specific error code.
 *
 * @param {AppError} error - The AppError to check.
 * @param {KnownErrorCode} code - The error code to match against.
 * @returns {Result<Bool>} `Result<Bool>` — `true` if the error code matches.
 *
 * @example
 * ```typescript
 * import { hasCode } from '@/utils/result/error-utils';
 *
 * if (!result.ok) {
 *   const check: Result<Bool> = hasCode(result.error, ERRORS.AUTH.UNAUTHORIZED);
 *   if (check.ok && check.data) {
 *     // handle unauthorized
 *   }
 * }
 * ```
 */
export function hasCode(error: AppError, code: KnownErrorCode): Result<Bool> {
  return ok(BoolSchema, error.code === code);
}

/**
 * Checks whether an `AppError` has any of the specified error codes.
 *
 * @param {AppError} error - The AppError to check.
 * @param {readonly KnownErrorCode[]} codes - Array of error codes to match against.
 * @returns {Result<Bool>} `Result<Bool>` — `true` if the error code matches any in the array.
 *
 * @example
 * ```typescript
 * import { hasAnyCode } from '@/utils/result/error-utils';
 *
 * if (!result.ok) {
 *   const check: Result<Bool> = hasAnyCode(result.error, [
 *     ERRORS.AUTH.UNAUTHORIZED,
 *     ERRORS.AUTH.FORBIDDEN,
 *     ERRORS.AUTH.EXPIRED,
 *   ]);
 *   if (check.ok && check.data) {
 *     // redirect to login
 *   }
 * }
 * ```
 */
export function hasAnyCode(error: AppError, codes: readonly KnownErrorCode[]): Result<Bool> {
  return ok(BoolSchema, codes.includes(error.code));
}

/**
 * Checks whether an `AppError` code belongs to a specific domain.
 *
 * Extracts the domain prefix (first segment before the dot) and compares.
 *
 * @param {AppError} error - The AppError to check.
 * @param {ErrorDomain} domain - The error domain to match against.
 * @returns {Result<Bool>} `Result<Bool>` — `true` if the error belongs to the domain.
 *
 * @example
 * ```typescript
 * import { isInDomain } from '@/utils/result/error-utils';
 *
 * if (!result.ok) {
 *   const check: Result<Bool> = isInDomain(result.error, 'AUTH');
 *   if (check.ok && check.data) {
 *     // all auth errors → redirect to login
 *   }
 * }
 * ```
 */
export function isInDomain(error: AppError, domain: ErrorDomain): Result<Bool> {
  const parsed: Result<ErrorDomain> = safeParse(ErrorDomainSchema, domain);
  if (!parsed.ok) {
    return parsed;
  }
  return ok(BoolSchema, error.code.startsWith(`${parsed.data}.`));
}

// =============================================================================
// Cause Chain Traversal
// =============================================================================

/**
 * Collects all errors in the cause chain into a flat array.
 *
 * Walks `error.cause.cause...` recursively and returns every error
 * in the chain, starting with the root error and ending with the
 * deepest cause. Safe against circular references (max depth 100).
 *
 * @param {AppError} error - The root AppError to start from.
 * @returns {Result<readonly AppError[]>} `Result<ReadonlyArray<AppError>>` — flat array of all errors in the chain.
 *
 * @example
 * ```typescript
 * import { getCauseChain } from '@/utils/result/error-utils';
 *
 * if (!result.ok) {
 *   const chain: Result<ReadonlyArray<AppError>> = getCauseChain(result.error);
 *   if (chain.ok) {
 *     for (const e of chain.data) {
 *       // `[${e.code}] ${e.message}`
 *     }
 *   }
 * }
 * ```
 */
export function getCauseChain(error: AppError): Result<readonly AppError[]> {
  const chain: AppError[] = [];
  let current: AppError | undefined = error;
  const maxDepth = 100;
  let depth = 0;

  while (current && depth < maxDepth) {
    chain.push(current);
    current = current.cause;
    depth++;
  }

  return okUnchecked<readonly AppError[]>(chain);
}

/**
 * Finds the first error in the cause chain that matches a specific code.
 *
 * Walks the cause chain from the root error and returns the first error
 * whose code matches. Returns `null` if no match is found.
 *
 * Inspired by Rust's `Error::source()` chain traversal and Go's `errors.Is()`.
 *
 * @param {AppError} error - The root AppError to start from.
 * @param {KnownErrorCode} code - The error code to search for.
 * @returns {Result<AppError | null>} `Result<AppError | null>` — the matching error, or `null` if not found.
 *
 * @example
 * ```typescript
 * import { findInCauseChain } from '@/utils/result/error-utils';
 *
 * if (!result.ok) {
 *   const found: Result<AppError | null> = findInCauseChain(result.error, ERRORS.DB.CONNECTION);
 *   if (found.ok && found.data !== null) {
 *     // root cause was a DB connection failure
 *   }
 * }
 * ```
 */
export function findInCauseChain(error: AppError, code: KnownErrorCode): Result<AppError | null> {
  let current: AppError | undefined = error;
  const maxDepth = 100;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (current.code === code) {
      return okUnchecked<AppError | null>(current);
    }
    current = current.cause;
    depth++;
  }

  return okUnchecked<AppError | null>(null);
}

/**
 * Gets the root cause (deepest error in the cause chain).
 *
 * Walks `cause.cause.cause...` until reaching the terminal error.
 * Inspired by Go's `errors.Unwrap()` recursive unwrapping.
 *
 * @param {AppError} error - The AppError to unwrap.
 * @returns {Result<AppError>} `Result<AppError>` — the deepest cause in the chain.
 *
 * @example
 * ```typescript
 * import { getRootCause } from '@/utils/result/error-utils';
 *
 * const root: Result<AppError> = getRootCause(result.error);
 * if (root.ok) {
 *   root.data.code; // the original error code
 * }
 * ```
 */
export function getRootCause(error: AppError): Result<AppError> {
  let current: AppError = error;
  const maxDepth = 100;
  let depth = 0;

  while (current.cause && depth < maxDepth) {
    current = current.cause;
    depth++;
  }

  return okUnchecked<AppError>(current);
}

// =============================================================================
// Domain Extraction
// =============================================================================

/**
 * Extracts the domain prefix from an error code.
 *
 * The domain is the first segment before the dot (e.g., `'AUTH'` from
 * `'AUTH.INVALID_TOKEN'`).
 *
 * @param {AppError} error - The AppError whose domain to extract.
 * @returns {Result<ErrorDomain>} `Result<ErrorDomain>` — the error domain.
 *
 * @example
 * ```typescript
 * import { getDomain } from '@/utils/result/error-utils';
 *
 * const domain: Result<ErrorDomain> = getDomain(result.error);
 * if (domain.ok) {
 *   domain.data; // 'AUTH'
 * }
 * ```
 */
export function getDomain(error: AppError): Result<ErrorDomain> {
  const dotIndex: number = error.code.indexOf('.');
  if (dotIndex === -1) {
    return err(ERRORS.INTERNAL.INVARIANT_VIOLATED, {
      meta: { reason: 'Error code has no domain separator', code: error.code },
    });
  }
  const domain: string = error.code.slice(0, dotIndex);
  return safeParse(ErrorDomainSchema, domain);
}

// =============================================================================
// Severity Helpers
// =============================================================================

/**
 * Gets the effective severity of an error.
 *
 * Returns the error's explicit `severity` field if set, otherwise
 * returns `'error'` as the default.
 *
 * @param {AppError} error - The AppError to check.
 * @returns {Result<ErrorSeverity>} `Result<ErrorSeverity>` — the effective severity.
 *
 * @example
 * ```typescript
 * import { getSeverity } from '@/utils/result/error-utils';
 *
 * const sev: Result<ErrorSeverity> = getSeverity(result.error);
 * if (sev.ok && sev.data === 'fatal') {
 *   process.exit(1);
 * }
 * ```
 */
export function getSeverity(error: AppError): Result<ErrorSeverity> {
  return ok(ErrorSeveritySchema, error.severity ?? 'error');
}

/**
 * Checks whether an error is retryable.
 *
 * Returns `true` if the error has `retry.retryable === true`.
 *
 * @param {AppError} error - The AppError to check.
 * @returns {Result<Bool>} `Result<Bool>` — `true` if the error is retryable.
 *
 * @example
 * ```typescript
 * import { isRetryable } from '@/utils/result/error-utils';
 *
 * const check: Result<Bool> = isRetryable(result.error);
 * if (check.ok && check.data) {
 *   // wait and retry
 * }
 * ```
 */
export function isRetryable(error: AppError): Result<Bool> {
  return ok(BoolSchema, error.retry?.retryable === true);
}
