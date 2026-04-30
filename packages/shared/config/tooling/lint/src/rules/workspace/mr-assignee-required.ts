/**
 * Rule: workspace/mr-assignee-required
 *
 * MR must have an assignee.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR must have an assignee. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-assignee-required',
  description: 'MR must have an assignee.',
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

    const assignee: string | undefined = process.env['MR_ASSIGNEE'];

    if (assignee === undefined) {
      return Promise.resolve(results);
    }

    if (assignee === '') {
      results.push(
        createResult(
          'workspace/mr-assignee-required',
          ctx.rootDir,
          1,
          1,
          'error',
          'Merge request has no assignee',
          {
            tip: 'Assign the MR to a responsible team member',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
