/**
 * Rule: workspace/svg-no-clipped-text
 *
 * SVG text elements must not be visually clipped.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching clipped text elements in SVGs. */
const CLIPPED_TEXT_RE: RegExp = /<text[^>]*(overflow|clip-path|clip-rule)/;

/** SVG text elements must not be visually clipped. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-clipped-text',
  description: 'SVG text elements must not be visually clipped.',
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

      if (CLIPPED_TEXT_RE.test(content)) {
        results.push(
          createResult(
            'workspace/svg-no-clipped-text',
            filePath,
            1,
            1,
            'warning',
            `SVG <text> element is visually clipped: ${filePath}`,
            {
              tip: 'Avoid clip-path or overflow on <text> unless purely decorative',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
