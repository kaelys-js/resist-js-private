/**
 * Fake timer/clock utilities for testing time-dependent code.
 *
 * Wraps vitest's `vi.useFakeTimers()` / `vi.useRealTimers()` with a cleaner
 * interface that handles setup, teardown, and provides ergonomic methods for
 * advancing time.
 *
 * Two usage patterns:
 * - **Manual**: `createFakeClock()` — caller manages lifecycle (call `restore()` when done)
 * - **Hook-based**: `useFakeClock()` — auto setup/teardown per test via beforeEach/afterEach
 *
 * @example
 * ```typescript
 * import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 * import { useFakeClock } from '@/test-presets/harness/clock';
 *
 * describe('debounce', () => {
 *   const getClock = useFakeClock({ vi, beforeEach, afterEach });
 *
 *   it('fires after delay', async () => {
 *     const handler = vi.fn();
 *     debounce(handler, 300);
 *     triggerInput();
 *
 *     await getClock().advance(200);
 *     expect(handler).not.toHaveBeenCalled();
 *
 *     await getClock().advance(100);
 *     expect(handler).toHaveBeenCalledOnce();
 *   });
 * });
 * ```
 *
 * @module
 */

/**
 * Minimal subset of vitest's `vi` object needed for fake timers.
 * Accepts the real `vi` object or a compatible mock.
 */
export type ViFakeTimerProvider = {
  useFakeTimers: (options?: { now?: number | Date }) => void;
  useRealTimers: () => void;
  advanceTimersByTime: (ms: number) => void;
  advanceTimersByTimeAsync: (ms: number) => Promise<void>;
  runAllTimers: () => void;
  runAllTimersAsync: () => Promise<void>;
};

/**
 * A managed fake clock with convenience methods for advancing time.
 *
 * All time advancement methods are async to ensure pending microtasks
 * and timer callbacks are properly flushed.
 */
export type FakeClock = {
  /**
   * Advance time by the given number of milliseconds and trigger any
   * pending timers that fall within that window.
   *
   * @param ms - Milliseconds to advance
   *
   * @example
   * ```typescript
   * // Advance 500ms to trigger a 300ms setTimeout:
   * await getClock().advance(500);
   * ```
   */
  advance(ms: number): Promise<void>;

  /**
   * Run all pending timers (setTimeout, setInterval) until there are none left.
   * Use with caution — can infinite loop if timers reschedule themselves.
   *
   * @example
   * ```typescript
   * setTimeout(callback, 1000);
   * setTimeout(callback, 5000);
   * await getClock().runAll();
   * // Both timers have fired
   * ```
   */
  runAll(): Promise<void>;

  /**
   * Restore real timers. Called automatically by `useFakeClock` in the
   * afterEach hook. Safe to call multiple times.
   */
  restore(): void;
};

/**
 * Create a fake clock that replaces real timers with vitest's fake timer
 * implementation.
 *
 * The caller is responsible for calling `restore()` when done. For automatic
 * lifecycle management tied to test hooks, use `useFakeClock()` instead.
 *
 * @param vi - The vitest `vi` object (pass explicitly to support `globals: false`)
 * @param now - Optional fixed "current time" as a Date or Unix timestamp (ms).
 *   If provided, `Date.now()` and `new Date()` will return this time.
 * @returns A `FakeClock` instance
 *
 * @example
 * ```typescript
 * import { vi } from 'vitest';
 * import { createFakeClock } from '@/test-presets/harness/clock';
 *
 * const clock = createFakeClock(vi, new Date('2024-01-01'));
 * try {
 *   expect(Date.now()).toBe(new Date('2024-01-01').getTime());
 *   await clock.advance(60_000);
 *   // Now 1 minute later
 * } finally {
 *   clock.restore();
 * }
 * ```
 */
export function createFakeClock(vi: ViFakeTimerProvider, now?: Date | number): FakeClock {
  const timerOptions =
    now === undefined ? undefined : { now: now instanceof Date ? now.getTime() : now };
  vi.useFakeTimers(timerOptions);

  return {
    async advance(ms: number): Promise<void> {
      await vi.advanceTimersByTimeAsync(ms);
    },

    async runAll(): Promise<void> {
      await vi.runAllTimersAsync();
    },

    restore(): void {
      vi.useRealTimers();
    },
  };
}

/**
 * Register `beforeEach`/`afterEach` hooks that install fake timers for each
 * test and restore real timers afterward. Returns a getter function that
 * provides the current test's `FakeClock`.
 *
 * Must be called at the `describe` block level (not inside `it`).
 *
 * @param hooks - Object containing `vi`, `beforeEach`, and `afterEach`
 *   (pass them explicitly from vitest to support `globals: false`)
 * @param now - Optional fixed "current time" as a Date or Unix timestamp (ms)
 * @returns A getter function `() => FakeClock` that returns the current test's clock
 *
 * @example
 * ```typescript
 * import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 * import { useFakeClock } from '@/test-presets/harness/clock';
 *
 * describe('cron scheduler', () => {
 *   const getClock = useFakeClock({ vi, beforeEach, afterEach });
 *
 *   it('runs task every minute', async () => {
 *     const task = vi.fn();
 *     startCron(task, '* * * * *');
 *
 *     await getClock().advance(60_000);
 *     expect(task).toHaveBeenCalledOnce();
 *
 *     await getClock().advance(60_000);
 *     expect(task).toHaveBeenCalledTimes(2);
 *   });
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Fixed time for deterministic date-dependent tests:
 * const getClock = useFakeClock(
 *   { vi, beforeEach, afterEach },
 *   new Date('2024-06-15T12:00:00Z'),
 * );
 *
 * it('formats relative time', () => {
 *   const pastDate = new Date('2024-06-15T11:00:00Z');
 *   expect(formatRelative(pastDate)).toBe('1 hour ago');
 * });
 * ```
 */
export function useFakeClock(
  hooks: {
    vi: ViFakeTimerProvider;
    beforeEach: (fn: () => void) => void;
    afterEach: (fn: () => void) => void;
  },
  now?: Date | number,
): () => FakeClock {
  let current: FakeClock | undefined;

  hooks.beforeEach(() => {
    current = createFakeClock(hooks.vi, now);
  });

  hooks.afterEach(() => {
    current?.restore();
    current = undefined;
  });

  return (): FakeClock => {
    if (!current) {
      throw new Error(
        'useFakeClock: no clock available. Ensure this is called inside a test ' +
          '(after beforeEach has run). Did you call useFakeClock() at the describe level?',
      );
    }
    return current;
  };
}
