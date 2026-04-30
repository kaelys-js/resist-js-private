/**
 * Rule: workspace/svg-requires-aria-role
 *
 * SVGs must declare an ARIA role attribute.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching valid ARIA role attributes in SVGs. */
const ARIA_ROLE_RE: RegExp = /role="(img|presentation|graphics-symbol)"/;

/** SVGs must declare an ARIA role attribute. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-requires-aria-role',
  description: 'SVGs must declare an ARIA role attribute.',
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

      if (!ARIA_ROLE_RE.test(content)) {
        results.push(
          createResult(
            'workspace/svg-requires-aria-role',
            filePath,
            1,
            1,
            'warning',
            `SVG is missing an ARIA role attribute: ${filePath}`,
            {
              tip: 'Add role="img" or role="presentation" as appropriate',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
