/**
 * Rule: workspace/svg-no-embedded-font
 *
 * SVG files must not embed fonts.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must not embed fonts. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-embedded-font',
  description: 'SVG files must not embed fonts.',
  scope: 'workspace',
  categories: ['workspace', 'encoding', 'safety'],
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

      if (/data:font\/|\.woff|\.ttf|<font/i.test(content)) {
        results.push(
          createResult(
            'workspace/svg-no-embedded-font',
            filePath,
            1,
            1,
            'error',
            `Embedded font detected in SVG: ${filePath}`,
            {
              tip: 'Remove font embedding and use system or CSS fonts',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
