/**
 * Rule: plans/require-concrete-verification
 *
 * Verification sections must contain specific, actionable commands or references —
 * not just generic "Tests pass" or "Type-check passes" text.
 *
 * Special handling for Integration Verification tasks: requires at least one
 * grep/count command to verify wiring completeness.
 *
 * @module
 */

import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan, type PlanTask } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/require-concrete-verification';

/**
 * Check if verification text contains concrete markers:
 * file paths, commands, counts, or specific identifiers.
 *
 * @param {string} text - Verification text
 * @returns {boolean} True if the text is concrete enough
 */
function isConcrete(text: string): boolean {
  /* File path (contains / and ends with extension) */
  if (/\S+\/\S+\.\w+/.test(text)) return true;
  /* Shell command */
  if (/(?:pnpm|grep|git|npm|node|vitest|tsc)\s/.test(text)) return true;
  /* Count or number reference */
  if (/\d+\s+(?:test|file|rule|command|export|import|instance)/i.test(text)) return true;
  /* Specific code reference (backtick identifier) */
  if (/`[a-zA-Z]\w+`/.test(text)) return true;
  /* Comparison operator */
  if (/>=|<=|==|outputs?\s+\d+/.test(text)) return true;

  return false;
}

/**
 * Check if an Integration Verification task has grep/count commands.
 *
 * @param {string} text - Verification text
 * @returns {boolean} True if it has concrete wiring checks
 */
function hasWiringChecks(text: string): boolean {
  return /grep|count|wc\s|\.length|registered\s+vs|declared\s+vs/i.test(text);
}

/** The require-concrete-verification lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Verification sections must contain specific commands, file paths, or expected counts — not just generic "Tests pass" text.',
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

      for (const task of plan.tasks) {
        if (task.verification.length === 0) continue;

        if (!isConcrete(task.verification)) {
          results.push(
            createResult(
              RULE_ID,
              file,
              task.line,
              1,
              'error',
              `TASK ${String(task.number)} (${task.name}) verification is too generic — add specific commands, file paths, or expected counts.`,
              {
                tip: `Instead of "Tests pass", write "pnpm qa:test -- --reporter verbose my-rule shows 5 new tests" or "grep -c 'registerCommand' src/extension.ts outputs 12".`,
              },
            ),
          );
        }

        /* Integration Verification tasks need grep/count commands */
        const isIntegration: boolean = task.name.toLowerCase().includes('integration verification');
        if (isIntegration && !hasWiringChecks(task.verification)) {
          results.push(
            createResult(
              RULE_ID,
              file,
              task.line,
              1,
              'error',
              `Integration Verification task must include grep/count commands to verify wiring completeness — generic "verify all commands registered" is not enough.`,
              {
                tip: `Add commands like: grep -c 'registerCommand' src/extension.ts matches declared command count.`,
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
