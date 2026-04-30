/**
 * Rule: plans/no-incomplete-tasks
 *
 * Plan files with unfinished tasks (not `[x]`) indicate missed or abandoned work.
 * Only reports on plans older than `maxAgeDays` to avoid flagging active work.
 *
 * @module
 */

import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan, parsePlanDate } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/no-incomplete-tasks';

/** Default age threshold in days. */
const DEFAULT_MAX_AGE_DAYS: number = 7;

/** Extended context with ruleOptions. */
type RuleContext = WorkspaceContext & { ruleOptions?: Record<string, unknown> };

/** The no-incomplete-tasks lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Plan files older than maxAgeDays must have all tasks marked [x] — incomplete tasks indicate missed work.',
  scope: 'workspace',
  categories: ['plans'],
  stages: ['ci'],
  fixable: false,
  optionsSchema: {
    maxAgeDays: {
      type: 'number',
      description: 'Only warn on plans older than N days (default: 7).',
    },
  },

  /* This rule's output depends on (a) plan-file content + (b) the current
   * date — a plan that's "young" today may cross the maxAgeDays threshold
   * tomorrow. We include a synthetic "__daily_rollover__/<UTC date>" path
   * in the input set so the cache invalidates exactly once per day. */
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const planFiles: readonly string[] = await discoverPlanFiles(ctx);
    const today: string = new Date().toISOString().slice(0, 10);

    return [...planFiles, `__daily_rollover__/${today}`];
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as RuleContext;
    const maxAgeDays: number =
      typeof ctx.ruleOptions?.['maxAgeDays'] === 'number'
        ? ctx.ruleOptions['maxAgeDays']
        : DEFAULT_MAX_AGE_DAYS;

    const results: LintResult[] = [];
    const now: Date = new Date();
    const planFiles: readonly string[] = await discoverPlanFiles(ctx);

    for (const file of planFiles) {
      /* Check age from filename date */
      const filename: string = file.split('/').pop() ?? '';
      const planDate: Date | undefined = parsePlanDate(filename);

      if (planDate !== undefined) {
        const ageMs: number = now.getTime() - planDate.getTime();
        const ageDays: number = ageMs / (1000 * 60 * 60 * 24);

        if (ageDays < maxAgeDays) {
          continue;
        }
      }

      const content: string = await ctx.readFile(file);
      const plan = parsePlan(content);

      for (const task of plan.tasks) {
        if (task.status !== '[x]') {
          results.push(
            createResult(
              RULE_ID,
              file,
              task.line,
              1,
              'error',
              `TASK ${String(task.number)} (${task.name}) is ${task.status === '[~]' ? 'still in progress' : 'not started'} — plan is over ${String(maxAgeDays)} days old.`,
              {
                tip: `Complete or remove this task. Mark as [x] once implemented and verified.`,
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
