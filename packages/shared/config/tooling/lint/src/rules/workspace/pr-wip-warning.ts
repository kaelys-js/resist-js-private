/**
 * Rule: workspace/pr-wip-warning
 *
 * Warn if PR title contains [WIP].
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Warn if PR title contains [WIP]. */
const rule: WorkspaceRule = {
  id: 'workspace/pr-wip-warning',
  description: 'Warn if PR title contains [WIP].',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on CI environment variables (process.env). */
  check(context: unknown): Promise<
    Array<{
      ruleId: string;
      file: string;
      line: number;
      column: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
      fix: { range: { start: number; end: number }; text: string };
      tip?: string;
      example?: string;
      source?: string;
      url?: string;
      endLine?: number;
      endColumn?: number;
    }>
  > {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: Array<ReturnType<typeof createResult>> = [];

    const title: string | undefined = process.env['MR_TITLE'];
    if (title === undefined) {
      return Promise.resolve(results);
    }

    if (/\[wip\]/i.test(title)) {
      results.push(
        createResult(
          'workspace/pr-wip-warning',
          ctx.rootDir,
          1,
          1,
          'warning',
          'PR is marked as Work in Progress',
          {
            tip: 'Remove [WIP] from the title when the PR is ready for review',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
