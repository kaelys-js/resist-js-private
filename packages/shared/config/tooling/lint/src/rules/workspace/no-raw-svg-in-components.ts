/**
 * Rule: workspace/no-raw-svg-in-components
 *
 * Component files must use SVG wrapper components instead of raw inline SVG.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Component files must use SVG wrapper components instead of raw inline SVG. */
const rule: WorkspaceRule = {
  id: 'workspace/no-raw-svg-in-components',
  description: 'Component files must use SVG wrapper components instead of raw inline SVG.',
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

      if (!ext.endsWith('.svelte') && !ext.endsWith('.tsx')) {
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
            'workspace/no-raw-svg-in-components',
            filePath,
            1,
            1,
            'error',
            `Raw inline SVG found in component file: ${filePath}`,
            {
              tip: 'Use a wrapper like <SvgIcon name="check" /> for consistency and accessibility',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
