/**
 * Async Utilities
 *
 * Pure utilities for async patterns like timeouts.
 * No CLI dependencies — suitable for use in any context.
 * Gracefully works in non-Node environments (browser, Cloudflare Workers).
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
  MessageSchema,
  NonNegativeIntegerSchema,
  type Message,
  type NonNegativeInteger,
} from '@/schemas/common';
import { ERRORS, err, type Result } from '@/schemas/result/result';
import { deepFreeze } from '@/utils/core/object';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Creates a frozen success Result from already-valid data.
 *
 * Centralizes the `Object.freeze` + `deepFreeze` pattern for generic `T`
 * values that have no Valibot schema. The `as object` cast is guarded by
 * `typeof === 'object'` and `as Result<T>` is necessary because
 * `Object.freeze` returns `Readonly<T>`.
 *
 * @param data - The success value (already validated).
 * @returns `Result<T>` — frozen success result.
 */
function _okResult<T>(data: T): Result<T> {
  const frozen: T =
    typeof data === 'object' && data !== null ? (deepFreeze(data as object) as T) : data;
  return Object.freeze({ ok: true as const, data: frozen, error: null }) as Result<T>;
}

// =============================================================================
// Timeout
// =============================================================================

/**
 * Wraps a promise with a timeout.
 * If the promise doesn't resolve within the timeout, returns a timeout error.
 *
 * @param {Promise<T>} promise - The promise to wrap.
 * @param {NonNegativeInteger} timeoutMs - Timeout in milliseconds (0 or negative disables timeout).
 * @param {Message} errorMessage - Error message for the timeout.
 * @returns {Promise<Result<T>>} `Promise<Result<T>>` — the resolved value wrapped in Result, or a timeout error.
 *
 * @example
 * ```typescript
 * const result = await withTimeout(fetch(url), 5000, 'Request timed out');
 * if (!result.ok) return result;
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: NonNegativeInteger,
  errorMessage: Message,
): Promise<Result<T>> {
  const timeoutMsResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    timeoutMs,
  );
  if (!timeoutMsResult.ok) {
    return timeoutMsResult;
  }

  const errorMessageResult: Result<Message> = safeParse(MessageSchema, errorMessage);
  if (!errorMessageResult.ok) {
    return errorMessageResult;
  }

  if ((timeoutMsResult.data as unknown as number) <= 0) {
    try {
      const result: T = await promise;
      return _okResult<T>(result);
    } catch (error: unknown) {
      return err(ERRORS.IO.TIMEOUT, errorMessageResult.data as unknown as string, {
        cause: fromUnknownError(error),
      });
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise: Promise<never> = new Promise<never>(
    (_resolve, reject: (reason: Error) => void) => {
      timeoutId = setTimeout(
        () => {
          reject(new Error(errorMessageResult.data as unknown as string));
        },
        timeoutMsResult.data as unknown as number,
      );
    },
  );

  try {
    const result: T = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return _okResult<T>(result);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    return err(ERRORS.IO.TIMEOUT, errorMessageResult.data as unknown as string, {
      meta: { timeoutMs: timeoutMsResult.data },
      cause: fromUnknownError(error),
    });
  }
}
