/**
 * Rule: workspace/svg-requires-aria-attrs
 *
 * Non-decorative SVGs must declare ARIA role or aria attributes.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Non-decorative SVGs must declare ARIA role or aria attributes. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-requires-aria-attrs',
  description: 'Non-decorative SVGs must declare ARIA role or aria attributes.',
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

      if (
        content.toLowerCase().includes('<svg') &&
        !/role="(img|presentation)"|aria-/i.test(content)
      ) {
        results.push(
          createResult(
            'workspace/svg-requires-aria-attrs',
            filePath,
            1,
            1,
            'warning',
            `SVG is missing ARIA role or aria attributes: ${filePath}`,
            {
              tip: 'Add role="img" and aria-label or aria-hidden as appropriate',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
