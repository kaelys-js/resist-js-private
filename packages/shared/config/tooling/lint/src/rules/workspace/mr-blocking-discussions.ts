/**
 * Rule: workspace/mr-blocking-discussions
 *
 * MR must not have unresolved discussions.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR must not have unresolved discussions. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-blocking-discussions',
  description: 'MR must not have unresolved discussions.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
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

    const countStr: string | undefined = process.env['MR_BLOCKING_DISCUSSIONS_COUNT'];
    if (countStr === undefined) {
      return Promise.resolve(results);
    }

    const count: number = Number(countStr);
    if (count > 0) {
      results.push(
        createResult(
          'workspace/mr-blocking-discussions',
          ctx.rootDir,
          1,
          1,
          'error',
          `Merge request has unresolved discussions: ${String(count)}`,
          {
            tip: 'Resolve all open threads before merging',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
