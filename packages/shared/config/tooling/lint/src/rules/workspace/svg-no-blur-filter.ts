/**
 * Rule: workspace/svg-no-blur-filter
 *
 * SVGs should not use feGaussianBlur or blur() filters.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching blur filters in SVGs. */
const BLUR_FILTER_RE: RegExp = /feGaussianBlur|blur\(/;

/** SVGs should not use feGaussianBlur or blur() filters. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-blur-filter',
  description: 'SVGs should not use feGaussianBlur or blur() filters.',
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

      if (BLUR_FILTER_RE.test(content)) {
        results.push(
          createResult(
            'workspace/svg-no-blur-filter',
            filePath,
            1,
            1,
            'warning',
            `SVG uses feGaussianBlur or blur() filter: ${filePath}`,
            {
              tip: 'Avoid feGaussianBlur or CSS blur() in SVG for performance reasons',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
