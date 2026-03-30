/**
 * Rule: workspace/svg-no-event-handler
 *
 * SVG files must not contain inline event handlers.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must not contain inline event handlers. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-event-handler',
  description: 'SVG files must not contain inline event handlers.',
  scope: 'workspace',
  categories: ['workspace', 'encoding', 'safety'],
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

      if (/\bon\w+\s*=/i.test(content)) {
        results.push(
          createResult(
            'workspace/svg-no-event-handler',
            filePath,
            1,
            1,
            'error',
            `Inline event handler detected in SVG: ${filePath}`,
            {
              tip: 'Remove all on* event attributes from SVG files',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
