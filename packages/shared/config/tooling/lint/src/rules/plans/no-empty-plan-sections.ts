/**
 * Rule: plans/no-empty-plan-sections
 *
 * Required task fields must contain meaningful content, not just
 * single words or empty text. The hook checks sections exist;
 * this rule checks they have substance.
 *
 * @module
 */

import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/no-empty-plan-sections';

/** Minimum characters for a meaningful Gap description. */
const MIN_GAP_LENGTH: number = 15;

/** Minimum plan bullets for a meaningful plan. */
const MIN_PLAN_BULLETS: number = 2;

/** The no-empty-plan-sections lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Task sections (Gap, Plan, Files, Verification) must contain meaningful content — not empty or minimal text.',
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

      for (const task of plan.tasks) {
        /* Skip tail tasks for Gap and Files checks */
        if (!task.isTail) {
          /* Gap check */
          if (task.gap.length > 0 && task.gap.length < MIN_GAP_LENGTH) {
            results.push(
              createResult(
                RULE_ID,
                file,
                task.line,
                1,
                'error',
                `TASK ${String(task.number)} (${task.name}) Gap is too short (${String(task.gap.length)} chars) — needs >${String(MIN_GAP_LENGTH)} chars to be meaningful.`,
                {
                  tip: `Describe what is missing or broken in enough detail to guide implementation.`,
                },
              ),
            );
          }

          /* Files check */
          if (task.files.length === 0) {
            results.push(
              createResult(
                RULE_ID,
                file,
                task.line,
                1,
                'error',
                `TASK ${String(task.number)} (${task.name}) has no Files section — list files to create/modify.`,
                {
                  tip: `Add a **Files** section with Create:/Edit:/Test: entries.`,
                },
              ),
            );
          }
        }

        /* Plan bullets check (all tasks) */
        if (task.planBullets.length > 0 && task.planBullets.length < MIN_PLAN_BULLETS) {
          results.push(
            createResult(
              RULE_ID,
              file,
              task.line,
              1,
              'error',
              `TASK ${String(task.number)} (${task.name}) Plan has only ${String(task.planBullets.length)} bullet(s) — needs >=${String(MIN_PLAN_BULLETS)}.`,
              {
                tip: `Break the plan into at least ${String(MIN_PLAN_BULLETS)} actionable steps.`,
              },
            ),
          );
        }

        /* Verification check (all tasks) */
        if (task.verification.length === 0) {
          results.push(
            createResult(
              RULE_ID,
              file,
              task.line,
              1,
              'error',
              `TASK ${String(task.number)} (${task.name}) has no Verification section.`,
              {
                tip: `Add a **Verification** section describing how to verify this task is complete.`,
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
