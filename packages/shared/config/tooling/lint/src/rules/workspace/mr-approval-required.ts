/**
 * Rule: workspace/mr-approval-required
 *
 * MR must have sufficient approvals.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR must have sufficient approvals. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-approval-required',
  description: 'MR must have sufficient approvals.',
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

    const countStr: string | undefined = process.env['MR_APPROVAL_COUNT'];
    if (countStr === undefined) {
      return Promise.resolve(results);
    }

    const required: number = Number(process.env['MR_APPROVAL_MIN_REQUIRED'] ?? '1');
    const current: number = Number(countStr);

    if (current < required) {
      results.push(
        createResult(
          'workspace/mr-approval-required',
          ctx.rootDir,
          1,
          1,
          'error',
          `Merge request only has ${String(current)} approval(s); required: ${String(required)}`,
          {
            tip: 'Wait for additional reviewers to approve before merging',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
