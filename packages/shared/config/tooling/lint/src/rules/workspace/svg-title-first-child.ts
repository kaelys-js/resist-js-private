/**
 * Rule: workspace/svg-title-first-child
 *
 * SVG title element must appear as the first child of svg.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG title element must appear as the first child of svg. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-title-first-child',
  description: 'SVG title element must appear as the first child of svg.',
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

      if (content.includes('<svg') && !content.includes('<title>')) {
        results.push(
          createResult(
            'workspace/svg-title-first-child',
            filePath,
            1,
            1,
            'warning',
            `SVG is missing a <title> element: ${filePath}`,
            {
              tip: 'Add a <title> element as the first child of <svg>',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
