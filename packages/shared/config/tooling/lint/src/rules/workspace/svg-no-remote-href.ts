/**
 * Rule: workspace/svg-no-remote-href
 *
 * SVG files must not contain remote HTTP href references.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must not contain remote HTTP href references. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-remote-href',
  description: 'SVG files must not contain remote HTTP href references.',
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

      if (/(?:xlink:)?href\s*=\s*["']https?:\/\//.test(content)) {
        results.push(
          createResult(
            'workspace/svg-no-remote-href',
            filePath,
            1,
            1,
            'error',
            `Remote href detected in SVG: ${filePath}`,
            {
              tip: 'Do not reference external HTTP(S) URLs in SVG',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
