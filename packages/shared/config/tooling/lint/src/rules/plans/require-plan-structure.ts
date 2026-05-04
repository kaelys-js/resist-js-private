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

import {
  createResult,
  type LintFix,
  type LintResult,
  type WorkspaceRule,
} from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/require-plan-structure';

/** No-op fix sentinel. */
const NO_FIX: LintFix = { range: { start: 0, end: 0 }, text: '' };

/** Standard Status Legend block to insert when missing. */
const STATUS_LEGEND_BLOCK: string = [
  '',
  '## Status Legend',
  '',
  '- `[ ]` — Not started',
  '- `[x]` — Done (implemented + verified + tests passing)',
  '- `[~]` — In progress',
  '',
].join('\n');

/**
 * Build a fix that inserts the standard Status Legend block after the
 * plan's front-matter header (first `---` section or first `##` heading).
 *
 * @param {string} content - Full plan file content
 * @returns {LintFix} Fix inserting the Status Legend or NO_FIX
 */
function buildStatusLegendFix(content: string): LintFix {
  const lines: string[] = content.split('\n');

  /* Find insertion point: after the first blank line following the title/header */
  let insertLineIdx: number = -1;

  for (let i: number = 0; i < lines.length; i++) {
    const line: string = (lines[i] ?? '').trim();

    /* Skip past the title (# heading) and any metadata lines */
    if (line.startsWith('# ') && insertLineIdx === -1) {
      insertLineIdx = i + 1;
      continue;
    }

    /* If we find a ## heading or --- separator after the title, insert before it */
    if (insertLineIdx !== -1 && (line.startsWith('## ') || line === '---')) {
      insertLineIdx = i;
      break;
    }
  }

  if (insertLineIdx === -1) {
    /* Fall back to start of file */
    insertLineIdx = 0;
  }

  /* Compute byte offset */
  let byteOffset: number = 0;

  for (let i: number = 0; i < insertLineIdx; i++) {
    byteOffset += (lines[i] ?? '').length + 1;
  }

  return { range: { start: byteOffset, end: byteOffset }, text: STATUS_LEGEND_BLOCK };
}

/** Required tail task patterns (case-insensitive). */
const REQUIRED_TAIL_TASKS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /register.*rules.*config|register.*config/i, label: 'Register Rules + Config' },
  { pattern: /integration\s+verification/i, label: 'Integration Verification' },
  { pattern: /full\s+qa|qa.*coverage/i, label: 'Full QA + Coverage' },
  { pattern: /final\s+verification.*commit/i, label: 'Final Verification + Commit' },
];

/** Integration Verification must check these patterns. */
const INTEGRATION_CHECKS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
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

      /* Check required sections */
      if (!plan.hasStatusLegend) {
        results.push(
          createResult(RULE_ID, file, 1, 1, 'error', 'Missing "Status Legend" section.', {
            tip: 'Add a Status Legend section with [ ], [x], [~] definitions.',
            fix: buildStatusLegendFix(content),
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
        let found: boolean = false;

        for (const name of taskNames) {
          if (req.pattern.test(name)) {
            found = true;
            break;
          }
        }

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
      let integrationTask: (typeof plan.tasks)[number] | undefined;

      for (const t of plan.tasks) {
        if (/integration\s+verification/i.test(t.name)) {
          integrationTask = t;
          break;
        }
      }

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
      let finalTask: (typeof plan.tasks)[number] | undefined;

      for (const t of plan.tasks) {
        if (/final\s+verification.*commit/i.test(t.name)) {
          finalTask = t;
          break;
        }
      }

      if (finalTask !== undefined) {
        const verifyCount: number = (finalTask.verification.match(/[Vv]erify/g) ?? []).length;
        let planVerifyCount: number = 0;

        for (const b of finalTask.planBullets) {
          if (/[Vv]erify/i.test(b)) {
            planVerifyCount++;
          }
        }

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
      let qaTask: (typeof plan.tasks)[number] | undefined;

      for (const t of plan.tasks) {
        if (/full\s+qa|qa.*coverage/i.test(t.name)) {
          qaTask = t;
          break;
        }
      }

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
