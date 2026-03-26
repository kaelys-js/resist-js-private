/**
 * Tests for the Worker Thread Pool.
 *
 * These tests verify the worker pool infrastructure: initialization,
 * task distribution, result collection, and shutdown.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { cpus } from 'node:os';

import {
  WorkerPool,
  getDefaultPoolSize,
  type WorkerTask,
  type WorkerResult,
} from './worker-pool.ts';

// =============================================================================
// getDefaultPoolSize
// =============================================================================

describe('getDefaultPoolSize', () => {
  it('returns a positive number', () => {
    const size: number = getDefaultPoolSize();
    expect(size).toBeGreaterThan(0);
  });

  it('matches os.cpus().length', () => {
    const size: number = getDefaultPoolSize();
    expect(size).toBe(Math.max(1, cpus().length));
  });
});

// =============================================================================
// WorkerPool — initialization
// =============================================================================

describe('WorkerPool — initialization', () => {
  it('creates a pool with the specified size', () => {
    const pool: WorkerPool = new WorkerPool(2);
    expect(pool.poolSize).toBe(2);
    void pool.shutdown();
  });

  it('clamps pool size to at least 1', () => {
    const pool: WorkerPool = new WorkerPool(0);
    expect(pool.poolSize).toBe(1);
    void pool.shutdown();
  });

  it('clamps negative pool size to 1', () => {
    const pool: WorkerPool = new WorkerPool(-5);
    expect(pool.poolSize).toBe(1);
    void pool.shutdown();
  });
});

// =============================================================================
// WorkerPool — task execution
// =============================================================================

describe('WorkerPool — task execution', () => {
  it('executes a single task and returns results', async () => {
    const pool: WorkerPool = new WorkerPool(1);
    await pool.waitForReady();

    const task: WorkerTask = {
      taskId: 1,
      filePath: '/tmp/test.ts',
      content: 'const x: number = 1;\n',
      ruleIds: [],
      ruleOptions: {},
    };

    const result: WorkerResult = await pool.execute(task);
    expect(result.taskId).toBe(1);
    expect(Array.isArray(result.results)).toBe(true);

    await pool.shutdown();
  }, 60_000);

  it('executes multiple tasks via executeAll', async () => {
    const pool: WorkerPool = new WorkerPool(2);
    await pool.waitForReady();

    const tasks: WorkerTask[] = [
      {
        taskId: 1,
        filePath: '/tmp/a.ts',
        content: 'const a: number = 1;\n',
        ruleIds: [],
        ruleOptions: {},
      },
      {
        taskId: 2,
        filePath: '/tmp/b.ts',
        content: 'const b: number = 2;\n',
        ruleIds: [],
        ruleOptions: {},
      },
    ];

    const results: WorkerResult[] = await pool.executeAll(tasks);
    expect(results).toHaveLength(2);
    expect(results[0]?.taskId).toBe(1);
    expect(results[1]?.taskId).toBe(2);

    await pool.shutdown();
  }, 60_000);

  it('queues tasks when all workers are busy', async () => {
    const pool: WorkerPool = new WorkerPool(1);
    await pool.waitForReady();

    /* Submit two tasks to a single worker — one will be queued */
    const tasks: WorkerTask[] = [
      {
        taskId: 1,
        filePath: '/tmp/c.ts',
        content: 'const c: number = 3;\n',
        ruleIds: [],
        ruleOptions: {},
      },
      {
        taskId: 2,
        filePath: '/tmp/d.ts',
        content: 'const d: number = 4;\n',
        ruleIds: [],
        ruleOptions: {},
      },
    ];

    const results: WorkerResult[] = await pool.executeAll(tasks);
    expect(results).toHaveLength(2);

    /* Both should complete successfully */
    for (const result of results) {
      expect(result.error).toBeUndefined();
    }

    await pool.shutdown();
  }, 60_000);

  it('filters rules by ruleIds when specified', async () => {
    const pool: WorkerPool = new WorkerPool(1);
    await pool.waitForReady();

    const task: WorkerTask = {
      taskId: 1,
      filePath: '/tmp/test.ts',
      content: 'const x: number = 1;\n',
      ruleIds: ['nonexistent/rule-that-does-not-exist'],
      ruleOptions: {},
    };

    const result: WorkerResult = await pool.execute(task);
    expect(result.taskId).toBe(1);
    /* No rules match, so no results */
    expect(result.results).toHaveLength(0);

    await pool.shutdown();
  }, 60_000);
});

// =============================================================================
// WorkerPool — shutdown
// =============================================================================

describe('WorkerPool — shutdown', () => {
  it('shuts down cleanly after tasks complete', async () => {
    const pool: WorkerPool = new WorkerPool(2);
    await pool.waitForReady();

    /* Execute a task first */
    const result: WorkerResult = await pool.execute({
      taskId: 1,
      filePath: '/tmp/shutdown-test.ts',
      content: 'export {};\n',
      ruleIds: [],
      ruleOptions: {},
    });

    expect(result.taskId).toBe(1);

    /* Shutdown should not throw */
    await expect(pool.shutdown()).resolves.toBeUndefined();
  }, 60_000);

  it('shutdown is idempotent', async () => {
    const pool: WorkerPool = new WorkerPool(1);
    await pool.waitForReady();
    await pool.shutdown();
    /* Second shutdown should not throw */
    await expect(pool.shutdown()).resolves.toBeUndefined();
  }, 60_000);
});
