/**
 * Rule: plans/status-dependency-order
 *
 * Task statuses must be consistent with the Execution Order dependencies.
 * A task cannot be [x] if its dependency is still [ ] or [~].
 *
 * @module
 */

import {
  NO_OP_FIX,
  createResult,
  type LintFix,
  type LintResult,
  type WorkspaceRule,
} from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import {
  discoverPlanFiles,
  parsePlan,
  type PlanTask,
  type TaskStatus,
} from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/status-dependency-order';

/** No-op fix sentinel. */
const NO_FIX: LintFix = NO_OP_FIX;

/**
 * Build a fix that changes `[x]` to `[ ]` on the task's status line,
 * reverting the task since its dependency isn't complete.
 *
 * @param {string} content - Full plan file content
 * @param {number} taskLine - 1-based line number of the task header
 * @returns {LintFix} Fix that reverts status or NO_FIX
 */
function buildRevertStatusFix(content: string, taskLine: number): LintFix {
  const lines: string[] = content.split('\n');

  /* Search the task header and a few lines below for **Status**: [x] */
  for (let i: number = taskLine - 1; i < Math.min(taskLine + 5, lines.length); i++) {
    const line: string = lines[i] ?? '';
    const idx: number = line.indexOf('[x]');

    if (idx !== -1 && /\*\*Status\*\*/.test(line)) {
      /* Compute byte offset */
      let byteOffset: number = 0;

      for (let li: number = 0; li < i; li++) {
        byteOffset += (lines[li] ?? '').length + 1; /* +1 for \n */
      }

      const matchStart: number = byteOffset + idx;

      return { range: { start: matchStart, end: matchStart + 3 }, text: '[ ]' };
    }
  }

  return NO_FIX;
}

/** The status-dependency-order lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Task marked [x] must not depend on tasks that are still [ ] or [~] — dependencies must be completed first.',
  scope: 'workspace',
  categories: ['plans'],
  stages: ['ci'],
  fixable: true,

  async inputs(context: unknown): Promise<readonly string[]> {
    return discoverPlanFiles(context as WorkspaceContext);
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as WorkspaceContext;
    const results: LintResult[] = [];

    const planFiles: readonly string[] = await discoverPlanFiles(ctx);

    for (const file of planFiles) {
      const content: string = await ctx.readFile(file);
      const plan = parsePlan(content);

      if (plan.dependencies.length === 0) {
        continue;
      }

      /* Build status map: task number -> status */
      const statusMap: Map<number, TaskStatus> = new Map();
      const taskMap: Map<number, PlanTask> = new Map();

      for (const task of plan.tasks) {
        statusMap.set(task.number, task.status);
        taskMap.set(task.number, task);
      }

      /* Check each dependency */
      for (const dep of plan.dependencies) {
        const taskStatus: TaskStatus | undefined = statusMap.get(dep.task);

        if (taskStatus !== '[x]') {
          continue;
        }

        const task: PlanTask | undefined = taskMap.get(dep.task);

        if (task === undefined) {
          continue;
        }

        for (const depNum of dep.dependsOn) {
          const depStatus: TaskStatus | undefined = statusMap.get(depNum);

          if (depStatus !== undefined && depStatus !== '[x]') {
            const depTask: PlanTask | undefined = taskMap.get(depNum);
            const depName: string = depTask === undefined ? `TASK ${String(depNum)}` : depTask.name;
            results.push(
              createResult(
                RULE_ID,
                file,
                task.line,
                1,
                'error',
                `TASK ${String(dep.task)} (${task.name}) is [x] but depends on TASK ${String(depNum)} (${depName}) which is ${depStatus}.`,
                {
                  tip: `Either complete TASK ${String(depNum)} first or update the dependency in the Execution Order table.`,
                  fix: buildRevertStatusFix(content, task.line),
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
