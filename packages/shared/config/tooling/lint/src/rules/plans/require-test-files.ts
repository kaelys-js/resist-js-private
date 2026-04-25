/**
 * Rule: plans/require-test-files
 *
 * Implementation tasks that create or edit source files must declare
 * at least one test file in the Files section.
 *
 * @module
 */

import { createResult, type LintResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';
import { discoverPlanFiles, parsePlan } from '@/lint/rules/plans/plan-parser.ts';

/** Rule ID constant. */
const RULE_ID: string = 'plans/require-test-files';

/** File patterns exempt from requiring tests. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /\.d\.ts$/,
  /index\.ts$/,
  /\.config\.\w+$/,
  /schema\.\w+$/,
  /\.json$/,
  /\.md$/,
];

/**
 * Check if a file path is exempt from requiring tests.
 *
 * @param {string} path - File path
 * @returns {boolean} True if exempt
 */
function isExempt(path: string): boolean {
  return EXEMPT_PATTERNS.some((re: RegExp): boolean => re.test(path));
}

/**
 * Check if a file path is a test file.
 *
 * @param {string} path - File path
 * @returns {boolean} True if test file
 */
function isTestPath(path: string): boolean {
  return path.includes('.test.') || path.includes('.spec.');
}

/** The require-test-files lint rule. */
const rule: WorkspaceRule = {
  id: RULE_ID,
  description:
    'Implementation tasks that create/edit source files must declare test files — enforces TDD at the plan level.',
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
        if (task.isTail) continue;
        if (task.files.length === 0) continue;

        /* Check if task has any non-exempt source files */
        const hasSourceFiles: boolean = task.files.some(
          (f): boolean =>
            (f.action === 'create' || f.action === 'edit') &&
            f.path.endsWith('.ts') &&
            !isExempt(f.path) &&
            !isTestPath(f.path),
        );

        if (!hasSourceFiles) continue;

        /* Check if task declares any test files */
        const hasTestFiles: boolean = task.files.some(
          (f): boolean => f.action === 'test' || isTestPath(f.path),
        );

        if (!hasTestFiles) {
          results.push(
            createResult(
              RULE_ID,
              file,
              task.line,
              1,
              'error',
              `TASK ${String(task.number)} (${task.name}) creates/edits source files but declares no test files.`,
              {
                tip: `Add a Test: entry to the Files section (e.g., Test: src/path/to/file.test.ts).`,
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
