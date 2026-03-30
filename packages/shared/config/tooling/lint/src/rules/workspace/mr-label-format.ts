/**
 * Rule: workspace/mr-label-format
 *
 * MR labels must use lowercase kebab-case format.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR labels must use lowercase kebab-case format. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-label-format',
  description: 'MR labels must use lowercase kebab-case format.',
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

    const labelsRaw: string | undefined = process.env['MR_LABELS'];
    if (labelsRaw === undefined) {
      return Promise.resolve(results);
    }

    const labels: Array<string> = labelsRaw
      .split(/[,\n]/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    for (const label of labels) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(label)) {
        results.push(
          createResult(
            'workspace/mr-label-format',
            ctx.rootDir,
            1,
            1,
            'error',
            `Invalid MR label format: '${label}'`,
            {
              tip: "Labels must be lowercase kebab-case (e.g. 'api-change', 'no-changelog')",
            },
          ),
        );
        return Promise.resolve(results);
      }
    }

    return Promise.resolve(results);
  },
};

export default rule;
