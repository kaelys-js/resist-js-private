/**
 * Rule: workspace/no-inline-svg-in-source
 *
 * Source files must not contain inline SVG markup.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Source files must not contain inline SVG markup. */
const rule: WorkspaceRule = {
  id: 'workspace/no-inline-svg-in-source',
  description: 'Source files must not contain inline SVG markup.',
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
      const ext: string = filePath.toLowerCase();

      if (
        !ext.endsWith('.tsx') &&
        !ext.endsWith('.jsx') &&
        !ext.endsWith('.html') &&
        !ext.endsWith('.md')
      ) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (/<svg[^>]*>/i.test(content)) {
        results.push(
          createResult(
            'workspace/no-inline-svg-in-source',
            filePath,
            1,
            1,
            'error',
            `Inline SVG markup found in source file: ${filePath}`,
            {
              tip: 'Move SVGs to external assets or import as components',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
