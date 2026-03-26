/**
 * Custom Linter — Worker Thread Pool
 *
 * Manages a pool of worker threads that each load lint rules once
 * and process file-lint tasks in parallel. The pool distributes
 * tasks round-robin across workers and collects results.
 *
 * @module
 */

import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import * as v from 'valibot';

import type { LintResult } from '@/lint/framework/types.ts';

// =============================================================================
// Types
// =============================================================================

/** Schema for a task sent to a worker thread. */
export const WorkerTaskSchema = v.strictObject({
  /** Unique task identifier for correlating responses. */
  taskId: v.number(),
  /** Absolute path to the file being linted. */
  filePath: v.string(),
  /** File content as a string. */
  content: v.string(),
  /** Rule IDs to run (empty = all loaded rules). */
  ruleIds: v.array(v.string()),
  /** Per-rule config options. */
  ruleOptions: v.record(v.string(), v.record(v.string(), v.unknown())),
});

/** A task sent to a worker thread. See {@link WorkerTaskSchema}. */
export type WorkerTask = v.InferOutput<typeof WorkerTaskSchema>;

/** Schema for a result returned from a worker thread. */
export const WorkerResultSchema = v.strictObject({
  /** Correlates to the incoming task. */
  taskId: v.number(),
  /** Lint results for the file. */
  results: v.custom<LintResult[]>((val: unknown): boolean => Array.isArray(val)),
  /** Error message if the task failed. */
  error: v.optional(v.string()),
});

/** A result returned from a worker thread. See {@link WorkerResultSchema}. */
export type WorkerResult = v.InferOutput<typeof WorkerResultSchema>;

// =============================================================================
// Worker Pool
// =============================================================================

/** Path to the worker entry script. */
const WORKER_ENTRY: string = join(fileURLToPath(new URL('.', import.meta.url)), 'worker-entry.ts');

/**
 * Get the default number of worker threads.
 *
 * Uses the number of CPU cores, clamped to at least 1.
 *
 * @returns {number} Default pool size
 */
export function getDefaultPoolSize(): number {
  return Math.max(1, cpus().length);
}

/**
 * A pool of worker threads for parallel lint execution.
 *
 * Each worker loads all rules on startup. Tasks are submitted via
 * {@link execute} and the pool distributes them to the next available worker.
 *
 * @example
 * ```typescript
 * const pool = new WorkerPool(4);
 * await pool.waitForReady();
 * const result = await pool.execute({
 *   taskId: 1,
 *   filePath: '/path/to/file.ts',
 *   content: 'const x = 1;',
 *   ruleIds: [],
 *   ruleOptions: {},
 * });
 * await pool.shutdown();
 * ```
 */
export class WorkerPool {
  /** Active worker instances. */
  private readonly workers: Worker[] = [];

  /** Queue of pending tasks waiting for a free worker. */
  private readonly taskQueue: Array<{
    task: WorkerTask;
    resolve: (result: WorkerResult) => void;
    reject: (err: Error) => void;
  }> = [];

  /** Set of worker indices that are currently idle. */
  private readonly idleWorkers: Set<number> = new Set();

  /** Number of workers in the pool. */
  readonly poolSize: number;

  /** Promises that resolve when each worker sends its 'ready' message. */
  private readonly readyPromises: Array<Promise<void>>;

  /**
   * Create a new worker pool.
   *
   * @param {number} poolSize - Number of worker threads to spawn
   */
  constructor(poolSize: number) {
    this.poolSize = Math.max(1, poolSize);
    this.readyPromises = [];

    for (let i: number = 0; i < this.poolSize; i++) {
      const worker: Worker = new Worker(WORKER_ENTRY, {
        execArgv: ['--import', 'tsx'],
      });

      /* Track ready state via promise */
      const readyPromise: Promise<void> = new Promise<void>((resolve: () => void): void => {
        const onMessage = (msg: unknown): void => {
          if (
            msg &&
            typeof msg === 'object' &&
            'type' in msg &&
            (msg as Record<string, unknown>).type === 'ready'
          ) {
            worker.removeListener('message', onMessage);
            this.idleWorkers.add(i);
            resolve();
          }
        };
        worker.on('message', onMessage);
      });

      this.readyPromises.push(readyPromise);
      this.workers.push(worker);
    }
  }

  /**
   * Wait for all workers to finish loading rules and be ready for tasks.
   *
   * @returns {Promise<void>}
   */
  async waitForReady(): Promise<void> {
    await Promise.all(this.readyPromises);
  }

  /**
   * Submit a lint task to the pool.
   *
   * If a worker is idle, the task runs immediately. Otherwise it's queued.
   *
   * @param {WorkerTask} task - The lint task to execute
   * @returns {Promise<WorkerResult>} Result from the worker
   */
  execute(task: WorkerTask): Promise<WorkerResult> {
    return new Promise<WorkerResult>(
      (resolve: (r: WorkerResult) => void, reject: (e: Error) => void): void => {
        /* Try to find an idle worker */
        const idleIdx: number | undefined = this.idleWorkers.values().next().value;

        if (idleIdx === undefined) {
          /* No idle workers — queue the task */
          this.taskQueue.push({ task, resolve, reject });
        } else {
          this.idleWorkers.delete(idleIdx);
          this.dispatchToWorker(idleIdx, task, resolve, reject);
        }
      },
    );
  }

  /**
   * Execute multiple tasks and collect all results.
   *
   * @param {WorkerTask[]} tasks - Array of tasks to execute
   * @returns {Promise<WorkerResult[]>} Results in the same order as tasks
   */
  executeAll(tasks: WorkerTask[]): Promise<WorkerResult[]> {
    const promises: Array<Promise<WorkerResult>> = tasks.map(
      (task: WorkerTask): Promise<WorkerResult> => this.execute(task),
    );
    return Promise.all(promises);
  }

  /**
   * Shut down all workers and release resources.
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    const terminations: Array<Promise<number>> = this.workers.map(
      (worker: Worker): Promise<number> => worker.terminate(),
    );
    await Promise.all(terminations);
    this.workers.length = 0;
    this.idleWorkers.clear();
    this.taskQueue.length = 0;
  }

  /**
   * Send a task to a specific worker and set up the response handler.
   *
   * @param workerIdx - Index of the worker in the pool
   * @param task - Task to dispatch
   * @param resolve - Promise resolve callback
   * @param reject - Promise reject callback
   */
  private dispatchToWorker(
    workerIdx: number,
    task: WorkerTask,
    resolve: (r: WorkerResult) => void,
    reject: (e: Error) => void,
  ): void {
    const worker: Worker | undefined = this.workers[workerIdx];
    if (!worker) {
      reject(new Error(`Worker ${workerIdx} not found`));
      return;
    }

    const onMessage = (msg: WorkerResult): void => {
      if (msg.taskId === task.taskId) {
        worker.removeListener('message', onMessage);
        worker.removeListener('error', onError);

        /* Mark worker as idle and process queue */
        this.idleWorkers.add(workerIdx);
        this.processQueue();

        resolve(msg);
      }
    };

    const onError = (err: Error): void => {
      worker.removeListener('message', onMessage);
      worker.removeListener('error', onError);

      /* Mark worker as idle and process queue */
      this.idleWorkers.add(workerIdx);
      this.processQueue();

      reject(err);
    };

    worker.on('message', onMessage);
    worker.on('error', onError);
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- node:worker_threads, not browser
    worker.postMessage(task);
  }

  /**
   * Try to dispatch queued tasks to newly-idle workers.
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.idleWorkers.size > 0) {
      const next = this.taskQueue.shift();
      if (!next) {
        break;
      }

      const idleIdx: number | undefined = this.idleWorkers.values().next().value;
      if (idleIdx === undefined) {
        /* Put it back — no idle workers */
        this.taskQueue.unshift(next);
        break;
      }

      this.idleWorkers.delete(idleIdx);
      this.dispatchToWorker(idleIdx, next.task, next.resolve, next.reject);
    }
  }
}
