/**
 * Rule: workspace/svg-no-black-fill
 *
 * SVG files should not use fill="black".
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files should not use fill="black". */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-black-fill',
  description: 'SVG files should not use fill="black".',
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

      if (/fill="black"/i.test(content)) {
        results.push(
          createResult(
            'workspace/svg-no-black-fill',
            filePath,
            1,
            1,
            'warning',
            `SVG uses black fill: ${filePath}`,
            {
              tip: 'Use currentColor or theme-consistent fills',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
