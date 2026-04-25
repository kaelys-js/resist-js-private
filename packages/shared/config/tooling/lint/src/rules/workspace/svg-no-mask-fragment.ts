/**
 * Rule: workspace/svg-no-mask-fragment
 *
 * SVGs should not use mask with inline URL fragment references.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVGs should not use mask with inline URL fragment references. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-mask-fragment',
  description: 'SVGs should not use mask with inline URL fragment references.',
  scope: 'workspace',
  categories: ['workspace', 'encoding'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    return ctx.allFiles();
  },

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

    for (const filePath of await ctx.allFiles()) {
      if (!filePath.toLowerCase().endsWith('.svg')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.includes('mask="url(#')) {
        results.push(
          createResult(
            'workspace/svg-no-mask-fragment',
            filePath,
            1,
            1,
            'warning',
            `SVG contains mask with inline URL fragment reference: ${filePath}`,
            {
              tip: 'Avoid mask="url(#...)" — prefer <use> with symbol instead',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
