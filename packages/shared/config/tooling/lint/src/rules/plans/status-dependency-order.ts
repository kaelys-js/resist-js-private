/**
 * Rule: plans/status-dependency-order
 *
 * Task statuses must be consistent with the Execution Order dependencies.
 * A task cannot be [x] if its dependency is still [ ] or [~].
 *
 * @module
 */

import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import {
  discoverPlanFiles,
  parsePlan,
  type PlanTask,
  type TaskStatus,
} from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/status-dependency-order';

/** The status-dependency-order lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Task marked [x] must not depend on tasks that are still [ ] or [~] — dependencies must be completed first.',
  scope: 'workspace',
  categories: ['plans'],
  stages: ['ci'],
  fixable: false,

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
