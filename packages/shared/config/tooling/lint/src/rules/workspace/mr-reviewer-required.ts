/**
 * Rule: workspace/mr-reviewer-required
 *
 * MR must have at least one reviewer.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR must have at least one reviewer. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-reviewer-required',
  description: 'MR must have at least one reviewer.',
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

    const reviewers: string | undefined = process.env['MR_REVIEWERS'];
    if (reviewers === undefined) {
      return Promise.resolve(results);
    }

    if (reviewers === '') {
      results.push(
        createResult(
          'workspace/mr-reviewer-required',
          ctx.rootDir,
          1,
          1,
          'error',
          'Merge request is missing reviewers',
          {
            tip: 'Assign at least one reviewer to this MR',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
