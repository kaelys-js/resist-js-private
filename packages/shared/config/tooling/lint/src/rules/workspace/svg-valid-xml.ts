/**
 * Rule: workspace/svg-valid-xml
 *
 * SVG files must be well-formed XML with balanced tags.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must be well-formed XML with balanced tags. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-valid-xml',
  description: 'SVG files must be well-formed XML with balanced tags.',
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

      const relativePath: string = relative(ctx.rootDir, filePath);

      if (!content.includes('<svg')) {
        results.push(
          createResult(
            'workspace/svg-valid-xml',
            filePath,
            1,
            1,
            'error',
            `SVG file does not contain an <svg> element: ${relativePath}`,
            {
              tip: 'Ensure all SVG tags are properly closed',
            },
          ),
        );
      } else if (!content.includes('</svg>')) {
        results.push(
          createResult(
            'workspace/svg-valid-xml',
            filePath,
            1,
            1,
            'error',
            `SVG file has unclosed <svg> tag: ${relativePath}`,
            {
              tip: 'Ensure all SVG tags are properly closed',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
