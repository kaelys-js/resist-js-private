/**
 * Rule: workspace/no-webp-in-css
 *
 * CSS files must not reference .webp in url() or background properties.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** CSS files must not reference .webp in url() or background properties. */
const rule: WorkspaceRule = {
  id: 'workspace/no-webp-in-css',
  description: 'CSS files must not reference .webp in url() or background properties.',
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
        !ext.endsWith('.css') &&
        !ext.endsWith('.scss') &&
        !ext.endsWith('.sass') &&
        !ext.endsWith('.less')
      ) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (/url\([^)]*\.webp/i.test(content)) {
        results.push(
          createResult(
            'workspace/no-webp-in-css',
            filePath,
            1,
            1,
            'warning',
            `CSS file references .webp in url(): ${filePath}`,
            {
              tip: 'Prefer .svg or static formats for background images',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
