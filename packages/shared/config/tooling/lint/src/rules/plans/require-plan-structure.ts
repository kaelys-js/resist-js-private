/**
 * Rule: plans/require-plan-structure
 *
 * Mirrors the pre-plan-file-validate.sh hook checks as a CI-time lint rule.
 * Validates that plan files have all required structural sections:
 * Status Legend, Baseline, Execution Order, and all 4 tail tasks.
 *
 * Defense in depth: the hook catches at write time, this rule catches at CI.
 *
 * @module
 */

import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/require-plan-structure';

/** Required tail task patterns (case-insensitive). */
const REQUIRED_TAIL_TASKS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /register.*rules.*config|register.*config/i, label: 'Register Rules + Config' },
  { pattern: /integration\s+verification/i, label: 'Integration Verification' },
  { pattern: /full\s+qa|qa.*coverage/i, label: 'Full QA + Coverage' },
  { pattern: /final\s+verification.*commit/i, label: 'Final Verification + Commit' },
];

/** Integration Verification must check these patterns. */
const INTEGRATION_CHECKS: readonly { pattern: RegExp; label: string }[] = [
  {
    pattern: /command.*register|registerCommand|registered/i,
    label: 'command registration check',
  },
  {
    pattern: /config.*read|setting.*read|config\.get/i,
    label: 'config settings read check',
  },
  {
    pattern: /class.*instantiat|feature.*wired|instantiated/i,
    label: 'class instantiation check',
  },
  {
    pattern: /export.*import|unused.*export|dead.*code|orphan/i,
    label: 'unused exports / dead code check',
  },
];

/** The require-plan-structure lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Plan files must have Status Legend, Baseline, Execution Order, and all 4 required tail tasks — mirrors hook validation at CI time.',
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

      /* Check required sections */
      if (!plan.hasStatusLegend) {
        results.push(
          createResult(RULE_ID, file, 1, 1, 'error', 'Missing "Status Legend" section.', {
            tip: 'Add a Status Legend section with [ ], [x], [~] definitions.',
          }),
        );
      }

      if (!plan.hasBaseline) {
        results.push(
          createResult(
            RULE_ID,
            file,
            1,
            1,
            'error',
            'Missing "Baseline" section with metrics table.',
            {
              tip: 'Add a Baseline section recording metrics before any changes.',
            },
          ),
        );
      }

      if (!plan.hasExecutionOrder) {
        results.push(
          createResult(RULE_ID, file, 1, 1, 'error', 'Missing "Execution Order" table.', {
            tip: 'Add an Execution Order table making task dependencies explicit.',
          }),
        );
      }

      /* Check required tail tasks */
      const taskNames: string[] = plan.tasks.map((t) => t.name);
      for (const req of REQUIRED_TAIL_TASKS) {
        const found: boolean = taskNames.some((name: string): boolean => req.pattern.test(name));
        if (!found) {
          results.push(
            createResult(
              RULE_ID,
              file,
              1,
              1,
              'error',
              `Missing required tail task: "${req.label}".`,
              {
                tip: `Add a TASK with "${req.label}" in the name. See docs/plans/TEMPLATE.md.`,
              },
            ),
          );
        }
      }

      /* Check Integration Verification task content */
      const integrationTask = plan.tasks.find((t) => /integration\s+verification/i.test(t.name));
      if (integrationTask !== undefined) {
        const taskContent: string = [
          integrationTask.gap,
          ...integrationTask.planBullets,
          integrationTask.verification,
        ].join('\n');

        const missingChecks: string[] = [];
        for (const check of INTEGRATION_CHECKS) {
          if (!check.pattern.test(taskContent)) {
            missingChecks.push(check.label);
          }
        }

        if (missingChecks.length > 0) {
          results.push(
            createResult(
              RULE_ID,
              file,
              integrationTask.line,
              1,
              'error',
              `Integration Verification task is incomplete — missing: ${missingChecks.join(', ')}.`,
              {
                tip: 'The Integration Verification task must check command registration, config settings, class instantiation, and unused exports.',
              },
            ),
          );
        }
      }

      /* Check Final Verification + Commit has >=3 verify bullets */
      const finalTask = plan.tasks.find((t) => /final\s+verification.*commit/i.test(t.name));
      if (finalTask !== undefined) {
        const verifyCount: number = (finalTask.verification.match(/[Vv]erify/g) ?? []).length;
        const planVerifyCount: number = finalTask.planBullets.filter((b: string): boolean =>
          /[Vv]erify/i.test(b),
        ).length;
        const totalVerify: number = verifyCount + planVerifyCount;

        if (totalVerify < 3) {
          results.push(
            createResult(
              RULE_ID,
              file,
              finalTask.line,
              1,
              'error',
              `Final Verification + Commit task has only ${String(totalVerify)} verify items — needs >=3.`,
              {
                tip: 'Add specific verification bullets: verify files exist, verify config entries, verify test count, verify integration audit.',
              },
            ),
          );
        }
      }

      /* Check Full QA task has pnpm commands */
      const qaTask = plan.tasks.find((t) => /full\s+qa|qa.*coverage/i.test(t.name));
      if (qaTask !== undefined) {
        const qaContent: string = [...qaTask.planBullets, qaTask.verification].join('\n');
        if (!qaContent.includes('pnpm')) {
          results.push(
            createResult(
              RULE_ID,
              file,
              qaTask.line,
              1,
              'error',
              'Full QA task must list specific pnpm commands.',
              {
                tip: 'Add pnpm commands: pnpm qa:lint, pnpm qa:test, pnpm qa:format:check.',
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
