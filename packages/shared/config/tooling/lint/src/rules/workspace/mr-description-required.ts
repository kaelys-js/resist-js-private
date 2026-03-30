/**
 * Rule: workspace/mr-description-required
 *
 * MR description must not be empty.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR description must not be empty. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-description-required',
  description: 'MR description must not be empty.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  async check(context: unknown): Promise<
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

    const desc: string | undefined = process.env['CI_MERGE_REQUEST_DESCRIPTION'];
    if (desc === undefined) {
      return results;
    }

    if (desc === '' || desc === 'null') {
      results.push(
        createResult(
          'workspace/mr-description-required',
          ctx.rootDir,
          1,
          1,
          'error',
          'Merge Request has no description',
          {
            tip: 'Add a summary of changes and any testing or context',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
