/**
 * Rule: workspace/svg-no-tabindex
 *
 * SVGs should not use tabindex attribute.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVGs should not use tabindex attribute. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-tabindex',
  description: 'SVGs should not use tabindex attribute.',
  scope: 'workspace',
  categories: ['workspace', 'encoding'],
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

      if (content.includes('tabindex=')) {
        results.push(
          createResult(
            'workspace/svg-no-tabindex',
            filePath,
            1,
            1,
            'warning',
            `SVG contains tabindex attribute: ${filePath}`,
            {
              tip: 'Avoid tabindex unless the SVG is meant to be keyboard-focusable',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
