/**
 * Rule: workspace/mr-no-force-push-after-review
 *
 * Force-pushes must not occur after MR approval.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Force-pushes must not occur after MR approval. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-no-force-push-after-review',
  description: 'Force-pushes must not occur after MR approval.',
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

    const forcePushedAt: string | undefined = process.env['MR_FORCE_PUSHED_AT'];
    const approvedAt: string | undefined = process.env['MR_APPROVED_AT'];
    if (!forcePushedAt || !approvedAt) {
      return Promise.resolve(results);
    }

    if (forcePushedAt > approvedAt) {
      results.push(
        createResult(
          'workspace/mr-no-force-push-after-review',
          ctx.rootDir,
          1,
          1,
          'error',
          'Force-push occurred after MR was approved',
          {
            tip: 'Re-request approval after force-push, or avoid force-pushing after review',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
