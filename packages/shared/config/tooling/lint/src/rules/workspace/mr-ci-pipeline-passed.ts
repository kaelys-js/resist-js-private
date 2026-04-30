/**
 * Rule: workspace/mr-ci-pipeline-passed
 *
 * CI pipeline must be success status to merge.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** CI pipeline must be success status. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-ci-pipeline-passed',
  description: 'CI pipeline must be success status to merge.',
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

    const status: string | undefined = process.env['CI_PIPELINE_STATUS'];

    if (status === undefined) {
      return Promise.resolve(results);
    }

    if (status !== 'success') {
      results.push(
        createResult(
          'workspace/mr-ci-pipeline-passed',
          ctx.rootDir,
          1,
          1,
          'error',
          `CI pipeline not successful: status=${status}`,
          {
            tip: 'Re-run or fix failing jobs before merging',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
