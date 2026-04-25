/**
 * Rule: workspace/mr-label-conflict-matrix
 *
 * MR must not have conflicting label pairs from the conflict matrix.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Conflicting label pairs. */
const CONFLICTING_PAIRS: Array<[string, string]> = [
  ['breaking-change', 'patch'],
  ['hotfix', 'chore'],
  ['feature', 'revert'],
];

/** MR must not have conflicting label pairs from the conflict matrix. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-label-conflict-matrix',
  description: 'MR must not have conflicting label pairs from the conflict matrix.',
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

    const labels: string | undefined = process.env['MR_LABELS'];
    if (labels === undefined) {
      return Promise.resolve(results);
    }

    for (const [a, b] of CONFLICTING_PAIRS) {
      if (labels.includes(a) && labels.includes(b)) {
        results.push(
          createResult(
            'workspace/mr-label-conflict-matrix',
            ctx.rootDir,
            1,
            1,
            'error',
            `Conflicting labels found on MR: '${a}' and '${b}'`,
            {
              tip: 'Remove one of the conflicting labels to clarify intent',
            },
          ),
        );
      }
    }

    return Promise.resolve(results);
  },
};

export default rule;
