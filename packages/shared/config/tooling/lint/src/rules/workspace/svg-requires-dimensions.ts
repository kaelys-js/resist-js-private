/**
 * Rule: workspace/svg-requires-dimensions
 *
 * SVG files must have width and height attributes.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must have width and height attributes. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-requires-dimensions',
  description: 'SVG files must have width and height attributes.',
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

      if (!content.includes('width=') || !content.includes('height=')) {
        results.push(
          createResult(
            'workspace/svg-requires-dimensions',
            filePath,
            1,
            1,
            'warning',
            `Missing width or height in SVG: ${filePath}`,
            {
              tip: 'Set both width and height to prevent rendering issues',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
