/**
 * Custom Linter — Worker Thread Entry Point
 *
 * This script runs inside a `worker_threads.Worker`. On startup it loads
 * all lint rules once. Then it listens for task messages, runs the
 * applicable TypeScript rules on each file, and posts results back.
 *
 * @module
 */

import { parentPort, workerData } from 'node:worker_threads';

import { runTypeScriptRules } from '@/lint/framework/oxc-runner.ts';
import { loadAllRules } from '@/lint/framework/rule-loader.ts';
import type { TypeScriptRule, LintResult } from '@/lint/framework/types.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

// =============================================================================
// Types
// =============================================================================

/** Shape of a task message sent from the main thread. */
type WorkerTask = {
  /** Unique task identifier for correlating responses. */
  taskId: number;
  /** Absolute path to the file being linted. */
  filePath: string;
  /** File content as a string. */
  content: string;
  /** Rule IDs to run (empty = all loaded rules). */
  ruleIds: string[];
  /** Per-rule config options. */
  ruleOptions: Record<string, Record<string, unknown>>;
};

/** Shape of a result message sent back to the main thread. */
type WorkerResponse = {
  /** Correlates to the incoming task. */
  taskId: number;
  /** Lint results for the file. */
  results: LintResult[];
  /** Error message if the task failed. */
  error?: string;
};

// =============================================================================
// Startup
// =============================================================================

/** Worker-level rule cache — loaded once on startup. */
let allRules: TypeScriptRule[] = [];

async function initialize(): Promise<void> {
  const strings: LintStrings = (workerData as { strings: LintStrings }).strings;
  const loaded: Awaited<ReturnType<typeof loadAllRules>> = await loadAllRules(strings);
  allRules = loaded.typescript;

  /* Signal that we're ready to receive tasks */
  parentPort?.postMessage({ type: 'ready' });
}

// =============================================================================
// Message Handler
// =============================================================================

parentPort?.on('message', async (task: WorkerTask): Promise<void> => {
  try {
    /* Filter rules to only those requested */
    let rules: TypeScriptRule[] = allRules;
    if (task.ruleIds.length > 0) {
      const idSet: ReadonlySet<string> = new Set(task.ruleIds);
      rules = allRules.filter((r: TypeScriptRule): boolean => idSet.has(r.id));
    }

    /* Filter rules by file pattern */
    rules = rules.filter((rule: TypeScriptRule): boolean =>
      rule.patterns.some((pattern: string): boolean => {
        if (pattern.startsWith('**/*.')) {
          const ext: string = pattern.slice(4);
          return task.filePath.endsWith(ext);
        }
        return task.filePath.includes(pattern);
      }),
    );

    const results: LintResult[] = await runTypeScriptRules(
      task.filePath,
      task.content,
      rules,
      task.ruleOptions,
    );

    const response: WorkerResponse = { taskId: task.taskId, results };
    parentPort?.postMessage(response);
  } catch (error: unknown) {
    const response: WorkerResponse = {
      taskId: task.taskId,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
    parentPort?.postMessage(response);
  }
});

/* Start initialization */
await initialize();
