/**
 * Rule: workspace/svg-requires-namespace
 *
 * SVG files must declare the xmlns namespace.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must declare the xmlns namespace. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-requires-namespace',
  description: 'SVG files must declare the xmlns namespace.',
  scope: 'workspace',
  categories: ['workspace', 'encoding'],
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

      if (!content.includes('xmlns="http://www.w3.org/2000/svg"')) {
        results.push(
          createResult(
            'workspace/svg-requires-namespace',
            filePath,
            1,
            1,
            'error',
            `Missing xmlns attribute in SVG: ${filePath}`,
            {
              tip: 'Ensure SVGs declare the XML namespace',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
