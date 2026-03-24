/**
 * Async testing utilities for polling, retrying, timeout, and cancellation.
 *
 * @module
 *
 * Provides standard helpers inspired by Testing Library's async utilities, adapted
 * for general-purpose use across Node.js, Workers, and browser environments.
 *
 * - `waitFor` — retry an assertion until it passes or times out
 * - `retry` — retry an async operation with configurable attempts and delay
 * - `withTimeout` — wrap a promise with a deadline
 * - `withAbort` — wrap a promise with an AbortSignal for cancellation testing
 *
 * @example
 * ```typescript
 * import { describe, it, expect } from 'vitest';
 * import { waitFor, withTimeout } from '@/test-presets/harness/async';
 *
 * describe('event processor', () => {
 *   it('eventually processes all events', async () => {
 *     startProcessor();
 *     await waitFor(() => {
 *       expect(getProcessedCount()).toBe(10);
 *     });
 *   });
 *
 *   it('completes within deadline', async () => {
 *     const result = await withTimeout(processAll(), 5000, 'processing too slow');
 *     expect(result).toBeDefined();
 *   });
 * });
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Options for `waitFor` polling behavior.
 */
export type WaitForOptions = {
  /**
   * Maximum time to wait before rejecting (milliseconds).
   * @default 1000
   */
  timeout?: number;

  /**
   * Interval between retries (milliseconds).
   * @default 50
   */
  interval?: number;
};

/**
 * Options for `retry` behavior.
 */
export type RetryOptions = {
  /**
   * Maximum number of attempts (including the first).
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Delay between attempts (milliseconds). Applied after each failed attempt.
   * @default 0
   */
  delay?: number;
};

// =============================================================================
// API
// =============================================================================

/**
 * Retry a callback until it succeeds (does not throw) or the timeout is reached.
 *
 * Useful for asserting eventual conditions in async code — similar to
 * Testing Library's `waitFor`. The callback should contain assertions
 * (e.g., `expect(...)`) that throw on failure.
 *
 * @param {() => void | Promise<void>} callback - Function to retry. Should throw if the condition is not yet met.
 * @param {WaitForOptions} options - Polling configuration (timeout, interval)
 * @returns {Promise<void>} Resolves when the callback succeeds; rejects with the last error on timeout
 *
 * @example
 * ```typescript
 * import { waitFor } from '@/test-presets/harness/async';
 *
 * // Wait for console output to appear:
 * await waitFor(() => {
 *   expect(getConsole().logOutput).toContain('ready');
 * });
 *
 * // Custom timeout and interval:
 * await waitFor(
 *   () => { expect(queue.length).toBe(0); },
 *   { timeout: 5000, interval: 100 },
 * );
 * ```
 */
export async function waitFor(
  callback: () => void | Promise<void>,
  options: WaitForOptions = {},
): Promise<void> {
  const { timeout = 1000, interval = 50 }: WaitForOptions = options;
  const deadline: number = Date.now() + timeout;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await callback();
      return;
    } catch (error: unknown) {
      lastError = error;

      await new Promise((resolve: (value: unknown) => void): void => {
        setTimeout(resolve, interval);
      });
    }
  }

  // One final attempt after timeout
  try {
    await callback();
  } catch (error: unknown) {
    throw lastError ?? error;
  }
}

/**
 * Retry an async function up to `maxAttempts` times, with an optional delay
 * between attempts. Returns the result of the first successful call.
 *
 * Unlike `waitFor` (which polls on a timer), `retry` counts discrete attempts.
 * Use `retry` when testing operations that may fail transiently (network calls,
 * file locks, race conditions).
 *
 * @typeParam T - Return type of the function
 * @param {() => T | Promise<T>} fn - Function to retry. Can return a value or a promise.
 * @param {RetryOptions} options - Retry configuration (maxAttempts, delay)
 * @returns {Promise<T>} The result of the first successful invocation
 *
 * @example
 * ```typescript
 * import { retry } from '@/test-presets/harness/async';
 *
 * // Retry a flaky operation 3 times:
 * const result = await retry(() => fetchExternalApi(), { maxAttempts: 3, delay: 100 });
 *
 * // Retry file write that may hit a lock:
 * await retry(() => writeConfig(dir.path), { maxAttempts: 5, delay: 50 });
 * ```
 */
export async function retry<T>(fn: () => T | Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, delay = 0 }: RetryOptions = options;
  let lastError: unknown;

  for (let attempt: number = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt < maxAttempts && delay > 0) {
        await new Promise((resolve: (value: unknown) => void): void => {
          setTimeout(resolve, delay);
        });
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Wrap a promise with a timeout. If the promise does not resolve within
 * the given time, the returned promise rejects with a descriptive error.
 *
 * The original promise is NOT cancelled — it continues running in the background.
 * Use `withAbort` if you need cancellation.
 *
 * @typeParam T - Resolved type of the promise
 * @param {Promise<T>} promise - The promise to wrap
 * @param {number} ms - Timeout duration in milliseconds
 * @param {string} message - Optional custom error message
 * @returns {Promise<T>} The resolved value of the original promise
 *
 * @example
 * ```typescript
 * import { withTimeout } from '@/test-presets/harness/async';
 *
 * // Ensure an operation completes within 5 seconds:
 * const result = await withTimeout(processLargeFile(), 5000);
 *
 * // Custom error message:
 * await withTimeout(
 *   connectToDatabase(),
 *   3000,
 *   'Database connection timed out',
 * );
 *
 * // In a test assertion:
 * await expect(
 *   withTimeout(slowOperation(), 100),
 * ).rejects.toThrow('timed out');
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout: Promise<never> = new Promise<never>(
    (_resolve: (value: never) => void, reject: (reason: unknown) => void): void => {
      timer = setTimeout((): void => {
        reject(new Error(message ?? `Operation timed out after ${ms}ms`));
      }, ms);
    },
  );

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Wrap a promise with an `AbortSignal`. If the signal is aborted before the
 * promise resolves, the returned promise rejects with the abort reason.
 *
 * Useful for testing cancellation flows — create an `AbortController`, pass
 * its signal, and call `controller.abort()` to simulate user cancellation.
 *
 * The original promise is NOT cancelled — it continues running in the background.
 *
 * @typeParam T - Resolved type of the promise
 * @param {Promise<T>} promise - The promise to wrap
 * @param {AbortSignal} signal - An `AbortSignal` to monitor
 * @returns {Promise<T>} The resolved value of the original promise
 *
 * @example
 * ```typescript
 * import { withAbort } from '@/test-presets/harness/async';
 *
 * it('cancels long-running operation', async () => {
 *   const controller = new AbortController();
 *   const promise = withAbort(longOperation(), controller.signal);
 *
 *   // Simulate user cancellation
 *   controller.abort(new Error('user cancelled'));
 *
 *   await expect(promise).rejects.toThrow('user cancelled');
 * });
 *
 * it('completes normally when not aborted', async () => {
 *   const controller = new AbortController();
 *   const result = await withAbort(Promise.resolve(42), controller.signal);
 *   expect(result).toBe(42);
 * });
 * ```
 */
export function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new Error('Aborted'));
  }

  const abortPromise: Promise<never> = new Promise<never>(
    (_resolve: (value: never) => void, reject: (reason: unknown) => void): void => {
      signal.addEventListener(
        'abort',
        (): void => {
          reject(signal.reason ?? new Error('Aborted'));
        },
        { once: true },
      );
    },
  );

  return Promise.race([promise, abortPromise]);
}
