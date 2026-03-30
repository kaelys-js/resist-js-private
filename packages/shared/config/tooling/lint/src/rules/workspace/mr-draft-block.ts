/**
 * Rule: workspace/mr-draft-block
 *
 * MR title must not start with Draft:.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR title must not start with Draft:. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-draft-block',
  description: 'MR title must not start with Draft:.',
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

    const title: string | undefined = process.env['CI_MERGE_REQUEST_TITLE'];
    if (title === undefined) {
      return Promise.resolve(results);
    }

    if (/^[Dd]raft:/.test(title)) {
      results.push(
        createResult(
          'workspace/mr-draft-block',
          ctx.rootDir,
          1,
          1,
          'error',
          'Merge request is marked as Draft',
          {
            tip: "Remove 'Draft:' from MR title when ready to merge",
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
