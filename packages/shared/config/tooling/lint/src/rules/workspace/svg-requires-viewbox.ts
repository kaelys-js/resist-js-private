/**
 * Rule: workspace/svg-requires-viewbox
 *
 * SVG files must declare a viewBox attribute.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must declare a viewBox attribute. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-requires-viewbox',
  description: 'SVG files must declare a viewBox attribute.',
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

      if (!content.includes('viewBox=')) {
        results.push(
          createResult(
            'workspace/svg-requires-viewbox',
            filePath,
            1,
            1,
            'error',
            `Missing viewBox in SVG: ${filePath}`,
            {
              tip: 'Add a viewBox to support responsive scaling',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
