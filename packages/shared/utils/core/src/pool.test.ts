/**
 * Tests for the concurrency pool.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { NonNegativeInteger, PositiveInteger } from '@/schemas/common';
import { runPool, type PoolTask, type PoolResult } from './pool';

// ── Helpers ─────────────────────────────────────────────────────────────

const delay = (ms: number, value: string): PoolTask<string> => () =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const failing = (ms: number, msg: string): PoolTask<string> => () =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

// ── Happy path ──────────────────────────────────────────────────────────

describe('runPool — success', () => {
  it('runs all tasks and returns results in order', async () => {
    const tasks: PoolTask<string>[] = [
      delay(10, 'a'),
      delay(5, 'b'),
      delay(15, 'c'),
    ];
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
    const tasks: PoolTask<number>[] = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
    ];
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

    const tasks: PoolTask<void>[] = Array.from({ length: 6 }, () => async () => {
      running++;
      if (running > maxRunning) maxRunning = running;
      await new Promise((r) => setTimeout(r, 20));
      running--;
    });

    await runPool(tasks, { concurrency: 2 as PositiveInteger, failFast: false });
    expect(maxRunning).toBeLessThanOrEqual(2);
  });
});

// ── Fail-fast ───────────────────────────────────────────────────────────

describe('runPool — fail-fast', () => {
  it('stops on first error with failFast=true', async () => {
    const tasks: PoolTask<string>[] = [
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
    const tasks: PoolTask<string>[] = [
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
    const tasks: PoolTask<string>[] = [
      () => Promise.resolve('x'),
      () => Promise.resolve('y'),
    ];
    await runPool(tasks, {
      concurrency: 2 as PositiveInteger,
      failFast: false,
      onTaskComplete: onComplete,
    });
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('calls onTaskError for failed tasks', async () => {
    const onError = vi.fn();
    const tasks: PoolTask<string>[] = [
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('fail')),
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

    const tasks: PoolTask<string>[] = Array.from({ length: 10 }, (_, i) => async () => {
      await new Promise((r) => setTimeout(r, 20));
      completedCount++;
      if (i === 1) controller.abort();
      return `task-${String(i)}`;
    });

    const result: PoolResult<string> = await runPool(tasks, {
      concurrency: 1 as PositiveInteger,
      failFast: false,
      signal: controller.signal,
    });
    // Should have stopped early — not all 10 completed
    expect(result.results.length).toBeLessThan(10);
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
    const tasks: PoolTask<string>[] = [
      () => Promise.reject('string error'),
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
});
