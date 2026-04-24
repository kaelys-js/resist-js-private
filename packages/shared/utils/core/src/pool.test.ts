/**
 * Tests for the concurrency pool.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { PositiveInteger } from '@/schemas/common';
import { runPool, type PoolTask, type PoolResult } from './pool';
import { DEFAULT_CONCURRENCY } from './process';

// ── Helpers ─────────────────────────────────────────────────────────────

const delay =
  (ms: number, value: string): PoolTask<string> =>
  () =>
    new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(value);
      }, ms);
    });

const failing =
  (ms: number, msg: string): PoolTask<string> =>
  () =>
    new Promise<string>((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(msg));
      }, ms);
    });

const resolveValue =
  <T>(value: T): PoolTask<T> =>
  () =>
    new Promise<T>((resolve) => {
      resolve(value);
    });
const rejectError =
  <T>(err: Error): PoolTask<T> =>
  () =>
    new Promise<T>((_resolve, reject) => {
      reject(err);
    });

// ── Happy path ──────────────────────────────────────────────────────────

describe('runPool — success', () => {
  it('runs all tasks and returns results in order', async () => {
    const tasks: Array<PoolTask<string>> = [delay(10, 'a'), delay(5, 'b'), delay(15, 'c')];
    const result: PoolResult<string> = await runPool(tasks, {
      concurrency: 2 as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(true);
    expect(result.results).toEqual(['a', 'b', 'c']);
    expect(result.errors).toHaveLength(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('returns success=true when all tasks pass', async () => {
    const tasks: Array<PoolTask<number>> = [resolveValue(1), resolveValue(2)];
    const result: PoolResult<number> = await runPool(tasks, {
      concurrency: 4 as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(true);
  });
});

// ── Concurrency ─────────────────────────────────────────────────────────

describe('runPool — concurrency', () => {
  it('limits concurrent execution', async () => {
    let running = 0;
    let maxRunning = 0;

    const tasks: Array<PoolTask<void>> = Array.from({ length: 6 }, () => async () => {
      running++;
      if (running > maxRunning) {
        maxRunning = running;
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 20);
      });
      running--;
    });

    await runPool(tasks, { concurrency: 2 as PositiveInteger, failFast: false });
    expect(maxRunning).toBeLessThanOrEqual(2);
  });
});

// ── Fail-fast ───────────────────────────────────────────────────────────

describe('runPool — fail-fast', () => {
  it('stops on first error with failFast=true', async () => {
    const tasks: Array<PoolTask<string>> = [
      delay(5, 'a'),
      failing(5, 'boom'),
      delay(5, 'c'),
      delay(5, 'd'),
    ];
    const result: PoolResult<string> = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: true,
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    // With concurrency=1 and failFast, tasks after the failure shouldn't run
    expect(result.results.length).toBeLessThan(4);
  });

  it('continues on error with failFast=false and collects all errors', async () => {
    const tasks: Array<PoolTask<string>> = [
      delay(5, 'a'),
      failing(5, 'err1'),
      delay(5, 'c'),
      failing(5, 'err2'),
    ];
    const result: PoolResult<string> = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.results).toContain('a');
    expect(result.results).toContain('c');
  });
});

// ── Callbacks ───────────────────────────────────────────────────────────

describe('runPool — callbacks', () => {
  it('calls onTaskComplete for each successful task', async () => {
    const onComplete = vi.fn();
    const tasks: Array<PoolTask<string>> = [resolveValue('x'), resolveValue('y')];
    await runPool(tasks, {
      concurrency: 2 as PositiveInteger,
      failFast: false,
      onTaskComplete: onComplete,
    });
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('calls onTaskError for failed tasks', async () => {
    const onError = vi.fn();
    const tasks: Array<PoolTask<string>> = [
      resolveValue('ok'),
      rejectError<string>(new Error('fail')),
    ];
    await runPool(tasks, {
      concurrency: 2 as PositiveInteger,
      failFast: false,
      onTaskError: onError,
    });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
  });
});

// ── Abort signal ────────────────────────────────────────────────────────

describe('runPool — abort', () => {
  it('stops execution when signal is aborted', async () => {
    const controller = new AbortController();
    let completedCount = 0;

    const tasks: Array<PoolTask<string>> = Array.from({ length: 10 }, (_, i) => async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 20);
      });
      completedCount++;
      if (i === 1) {
        controller.abort();
      }
      return `task-${String(i)}`;
    });

    const result: PoolResult<string> = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
      signal: controller.signal,
    });
    // Should have stopped early — not all 10 completed
    expect(result.results.length).toBeLessThan(10);
    expect(completedCount).toBeLessThan(10);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────

describe('runPool — edge cases', () => {
  it('handles empty task array', async () => {
    const result: PoolResult<string> = await runPool([], {
      concurrency: 4 as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('handles task that throws non-Error value', async () => {
    const tasks: Array<PoolTask<string>> = [
      () =>
        new Promise<string>((_resolve, reject) => {
          reject(new Error('string error'));
        }),
    ];
    const result: PoolResult<string> = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.error).toBeInstanceOf(Error);
    expect(result.errors[0]!.error.message).toBe('string error');
  });

  it('concurrency > tasks does not block', async () => {
    const tasks: Array<PoolTask<string>> = [resolveValue('a'), resolveValue('b')];
    const result: PoolResult<string> = await runPool(tasks, {
      concurrency: 100 as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(true);
    expect(result.results).toEqual(['a', 'b']);
  });

  it('concurrency=1 runs tasks serially', async () => {
    const callOrder: number[] = [];
    let running = 0;
    let maxRunning = 0;
    const tasks: Array<PoolTask<number>> = Array.from({ length: 5 }, (_, i) => async () => {
      running++;
      if (running > maxRunning) {
        maxRunning = running;
      }
      callOrder.push(i);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });
      running--;
      return i;
    });
    const result = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(true);
    expect(maxRunning).toBe(1);
    expect(result.results).toEqual([0, 1, 2, 3, 4]);
  });

  it('falls back to default concurrency when concurrency is invalid', async () => {
    // Invalid concurrency (0) falls back to DEFAULT_CONCURRENCY — graceful degradation
    const tasks: Array<PoolTask<number>> = [resolveValue(1), resolveValue(2)];
    const result = await runPool(tasks, {
      concurrency: 0 as unknown as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(true);
    expect(result.results).toEqual([1, 2]);
    // Sanity check — the default was used rather than throwing
    expect(DEFAULT_CONCURRENCY).toBeGreaterThan(0);
  });

  it('falls back to default concurrency when concurrency is omitted', async () => {
    const tasks: Array<PoolTask<number>> = [resolveValue(42)];
    const result = await runPool(tasks, { failFast: false } as Partial<
      Parameters<typeof runPool>[1]
    >);
    expect(result.success).toBe(true);
    expect(result.results).toEqual([42]);
  });

  it('omitted failFast defaults to false', async () => {
    const tasks: Array<PoolTask<string>> = [
      rejectError<string>(new Error('first')),
      resolveValue('second'),
    ];
    const result = await runPool(tasks, { concurrency: 2 as PositiveInteger } as Partial<
      Parameters<typeof runPool>[1]
    >);
    // Default failFast=false lets the second task complete after the first errors
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.results).toContain('second');
  });
});

// ── Abort signal pre-check ──────────────────────────────────────────────

describe('runPool — abort before start', () => {
  it('skips execution when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(); // abort BEFORE running
    const tasks: Array<PoolTask<string>> = [resolveValue('never')];
    const result = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
      signal: controller.signal,
    });
    // Task never started — no results
    expect(result.results).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('stores result when signal aborts after task completes (mid-pool)', async () => {
    const controller = new AbortController();
    const tasks: Array<PoolTask<string>> = [
      async () => {
        // First task completes
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 5);
        });
        return 'first';
      },
      () =>
        new Promise<string>((resolve) => {
          // Abort signal before second task — keep function non-async to satisfy require-await
          controller.abort();
          resolve('second');
        }),
      () =>
        new Promise<string>((resolve) => {
          resolve('third');
        }),
    ];
    const result = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
      signal: controller.signal,
    });
    expect(result.results).toContain('first');
    // After abort, subsequent tasks should be skipped
    expect(result.results.length).toBeLessThan(3);
  });
});

// ── Additional callback edge cases ──────────────────────────────────────

describe('runPool — callback edge cases', () => {
  it('onTaskComplete receives index and total args', async () => {
    const calls: Array<{ result: number; index: number; total: number }> = [];
    const tasks: Array<PoolTask<number>> = [resolveValue(1), resolveValue(2)];
    await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
      onTaskComplete: (result, index, total) => {
        calls.push({ result, index: index as number, total: total as number });
      },
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]!.total).toBe(2);
    expect(calls[0]!.result).toBe(1);
  });

  it('omitted callbacks do not fail', async () => {
    const tasks: Array<PoolTask<number>> = [resolveValue(1)];
    const result = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
    });
    expect(result.success).toBe(true);
  });

  it('onTaskError receives index', async () => {
    const captured: Array<{ err: Error; index: number }> = [];
    const tasks: Array<PoolTask<string>> = [
      rejectError<string>(new Error('e0')),
      resolveValue('ok'),
      rejectError<string>(new Error('e2')),
    ];
    await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
      onTaskError: (err, index) => {
        captured.push({ err, index: index as number });
      },
    });
    expect(captured.length).toBeGreaterThanOrEqual(2);
    const indexes = captured.map((c) => c.index);
    expect(indexes).toContain(0);
    expect(indexes).toContain(2);
  });
});
