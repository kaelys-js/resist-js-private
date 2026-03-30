/**
 * Rule: workspace/svg-requires-title-or-desc
 *
 * SVG files must contain a title or desc element for accessibility.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must contain a title or desc element for accessibility. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-requires-title-or-desc',
  description: 'SVG files must contain a title or desc element for accessibility.',
  scope: 'workspace',
  categories: ['workspace', 'encoding', 'accessibility'],
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

      if (!content.includes('<title>') && !content.includes('<desc>')) {
        results.push(
          createResult(
            'workspace/svg-requires-title-or-desc',
            filePath,
            1,
            1,
            'error',
            `SVG missing <title> or <desc>: ${filePath}`,
            {
              tip: 'Add <title> or <desc> for screen readers and SEO',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
