/**
 * Rule: workspace/svg-title-desc-requires-lang
 *
 * SVG title and desc elements must include a lang attribute.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG title and desc elements must include a lang attribute. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-title-desc-requires-lang',
  description: 'SVG title and desc elements must include a lang attribute.',
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

      if (/<title>/i.test(content) && !/<title[^>]*lang=/i.test(content)) {
        results.push(
          createResult(
            'workspace/svg-title-desc-requires-lang',
            filePath,
            1,
            1,
            'warning',
            `SVG <title> element is missing lang attribute: ${filePath}`,
            {
              tip: 'Add lang="en" or appropriate language code',
            },
          ),
        );
      }

      if (/<desc>/i.test(content) && !/<desc[^>]*lang=/i.test(content)) {
        results.push(
          createResult(
            'workspace/svg-title-desc-requires-lang',
            filePath,
            1,
            1,
            'warning',
            `SVG <desc> element is missing lang attribute: ${filePath}`,
            {
              tip: 'Add lang="en" or appropriate language code',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
