/**
 * Concurrency Pool
 *
 * Simple promise-based concurrency pool for parallel task execution.
 * No external dependencies — uses native Promise APIs.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import * as v from 'valibot';

import {
  AbortSignalSchema,
  BoolSchema,
  NonNegativeIntegerSchema,
  PositiveIntegerSchema,
  type Bool,
  type NonNegativeInteger,
  type OptionalAbortSignal,
  type PositiveInteger,
} from '@/schemas/common';
import { functionSchema } from '@/schemas/function/function';
import { generic } from '@/schemas/generic/generic';
import type { Result } from '@/schemas/result/result';
import { DEFAULT_CONCURRENCY } from '@/utils/core/process';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Module-level validated constants
// =============================================================================

/** Pre-validated zero for NonNegativeInteger boundaries. */
const _zeroResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, 0);
if (!_zeroResult.ok) throw new Error('Static literal 0 failed NonNegativeInteger validation');
const _ZERO_NNI: NonNegativeInteger = _zeroResult.data;

// =============================================================================
// Types
// =============================================================================

/** Default task result type when caller doesn't specify `T`. */
type PoolTaskResult = unknown;

/**
 * Generic schema for pool task executor functions.
 *
 * @example
 * ```typescript
 * const StringTask = PoolTaskSchema(v.string());
 * // validates: () => Promise<string>
 * ```
 */
export const PoolTaskSchema = generic(
  <T>(_resultSchema: v.GenericSchema<T> = v.unknown() as v.GenericSchema<T>) =>
    functionSchema<[], Promise<T>>(),
);

/**
 * Task executor function that returns a promise.
 * Compile-time type alias; runtime schema: {@link PoolTaskSchema}.
 *
 * @example
 * ```typescript
 * const task: PoolTask<string> = () => fetch(url).then(r => r.text());
 * ```
 */
export type PoolTask<T> = () => Promise<T>;

/**
 * Generic schema for pool configuration options.
 *
 * @example
 * ```typescript
 * const StringPoolOpts = PoolOptionsSchema(v.string());
 * ```
 */
export const PoolOptionsSchema = generic(
  <T>(_resultSchema: v.GenericSchema<T> = v.unknown() as v.GenericSchema<T>) =>
    v.strictObject({
      /** Maximum concurrent tasks. */
      concurrency: PositiveIntegerSchema,
      /** Stop on first error. */
      failFast: BoolSchema,
      /** Called when a task completes. */
      onTaskComplete: v.optional(
        functionSchema<[T, NonNegativeInteger, NonNegativeInteger], void>(),
      ),
      /** Called when a task fails. */
      onTaskError: v.optional(functionSchema<[Error, NonNegativeInteger], void>()),
      /** AbortSignal for cancellation. */
      signal: v.optional(AbortSignalSchema),
    }),
);

/**
 * Configuration options for {@link runPool}.
 * Compile-time type alias; runtime schema: {@link PoolOptionsSchema}.
 *
 * @example
 * ```typescript
 * const options: PoolOptions<TaskResult> = {
 *   concurrency: 4,
 *   failFast: true,
 *   signal: controller.signal,
 * };
 * ```
 */
export type PoolOptions<T = PoolTaskResult> = {
  /** Maximum concurrent tasks. */
  concurrency: PositiveInteger;
  /** Stop on first error. */
  failFast: Bool;
  /** Called when a task completes. */
  onTaskComplete?: (result: T, index: NonNegativeInteger, total: NonNegativeInteger) => void;
  /** Called when a task fails. */
  onTaskError?: (error: Error, index: NonNegativeInteger) => void;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
};

/**
 * Generic schema for pool execution results.
 *
 * @example
 * ```typescript
 * const StringPoolResult = PoolResultSchema(v.string());
 * ```
 */
export const PoolResultSchema = generic(
  <T>(resultSchema: v.GenericSchema<T> = v.unknown() as v.GenericSchema<T>) =>
    v.strictObject({
      /** All results (in order). */
      results: v.array(resultSchema),
      /** Whether all tasks succeeded. */
      success: BoolSchema,
      /** Errors that occurred. */
      errors: v.array(
        v.strictObject({
          index: NonNegativeIntegerSchema,
          error: v.custom<Error>((val: unknown): boolean => val instanceof Error),
        }),
      ),
      /** Total duration in milliseconds. */
      duration: NonNegativeIntegerSchema,
    }),
);

/**
 * Result returned by {@link runPool}.
 * Compile-time type alias; runtime schema: {@link PoolResultSchema}.
 *
 * @example
 * ```typescript
 * const pool = await runPool(tasks, { concurrency: 4, failFast: false });
 * if (pool.success) {
 *   pool.results.length; // all tasks completed
 * } else {
 *   pool.errors.length; // tasks that failed
 * }
 * ```
 */
export type PoolResult<T> = {
  /** All results (in order). */
  results: T[];
  /** Whether all tasks succeeded. */
  success: Bool;
  /** Errors that occurred. */
  errors: Array<{ index: NonNegativeInteger; error: Error }>;
  /** Total duration in milliseconds. */
  duration: NonNegativeInteger;
};

// =============================================================================
// Pool Implementation
// =============================================================================

/**
 * Runs tasks in parallel with a concurrency limit.
 *
 * Executes an array of async task functions with at most `concurrency`
 * running simultaneously. Supports fail-fast mode, abort signals,
 * and progress callbacks.
 *
 * @remarks Returns `PoolResult<T>` (not `Result<T>`) because the pool has its own
 *   error tracking via `errors[]` and `success` — partial results are still useful.
 *
 * @param tasks - Array of task functions to execute.
 * @param options - Pool configuration (defaults: concurrency from CPU count, failFast off).
 * @returns Pool result with ordered results, errors, and timing metadata.
 *
 * @example
 * ```typescript
 * const tasks: PoolTask<string>[] = urls.map(url => () => fetch(url).then(r => r.text()));
 * const pool = await runPool(tasks, { concurrency: 4, failFast: false });
 * if (pool.success) {
 *   for (const text of pool.results) { ... }
 * }
 * ```
 */
export async function runPool<T>(
  tasks: PoolTask<T>[],
  options: Partial<PoolOptions<T>> = {},
): Promise<PoolResult<T>> {
  const startTime: number = Date.now();

  // Validate and default concurrency
  const concurrencyResult: Result<PositiveInteger> = safeParse(
    PositiveIntegerSchema,
    options.concurrency ?? DEFAULT_CONCURRENCY,
  );
  // Graceful degradation: invalid user concurrency falls back to default
  const concurrency: PositiveInteger = concurrencyResult.ok
    ? concurrencyResult.data
    : DEFAULT_CONCURRENCY;

  const failFast: Bool = options.failFast ?? false;
  const onTaskComplete = options.onTaskComplete;
  const onTaskError = options.onTaskError;
  const signal: OptionalAbortSignal = options.signal;

  const total: number = tasks.length;
  const results: (T | undefined)[] = Array.from({ length: total });
  const errors: Array<{ index: NonNegativeInteger; error: Error }> = [];

  let currentIndex: number = 0;
  let completedCount: number = 0;
  let shouldStop: Bool = false;

  /**
   * Executes the next available task from the queue.
   */
  async function executeNext(): Promise<void> {
    while (!shouldStop && currentIndex < total) {
      if (signal?.aborted) {
        shouldStop = true;
        break;
      }

      const index: number = currentIndex;
      currentIndex = currentIndex + 1;

      const task: PoolTask<T> = tasks[index];

      try {
        const result: T = await task();

        if (signal?.aborted) {
          shouldStop = true;
          results[index] = result;
          break;
        }

        results[index] = result;
        completedCount = completedCount + 1;

        if (onTaskComplete) {
          const completedResult: Result<NonNegativeInteger> = safeParse(
            NonNegativeIntegerSchema,
            completedCount,
          );
          const totalResult: Result<NonNegativeInteger> = safeParse(
            NonNegativeIntegerSchema,
            total,
          );
          if (completedResult.ok && totalResult.ok) {
            onTaskComplete(result, completedResult.data, totalResult.data);
          }
        }
      } catch (thrown: unknown) {
        const error: Error = thrown instanceof Error ? thrown : new Error(String(thrown));
        const indexResult: Result<NonNegativeInteger> = safeParse(NonNegativeIntegerSchema, index);
        if (indexResult.ok) {
          errors.push({ index: indexResult.data, error });

          if (onTaskError) {
            onTaskError(error, indexResult.data);
          }
        }

        if (failFast) {
          shouldStop = true;
          break;
        }
      }
    }
  }

  // Start workers up to concurrency limit
  const workers: Promise<void>[] = [];
  const workerCount: number = Math.min(concurrency, total);

  // Internal arithmetic — values provably non-negative from validated inputs
  for (let i: number = 0; i < workerCount; i = i + 1) {
    workers.push(executeNext());
  }

  await Promise.all(workers);

  const durationResult: Result<NonNegativeInteger> = safeParse(
    NonNegativeIntegerSchema,
    Date.now() - startTime,
  );
  // Duration is always non-negative (end - start); fallback via safeParse
  const duration: NonNegativeInteger = durationResult.ok ? durationResult.data : _ZERO_NNI;

  return {
    results: results.filter((r: T | undefined): r is T => r !== undefined),
    success: errors.length === 0,
    errors,
    duration,
  };
}
