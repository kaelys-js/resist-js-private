/**
 * Rule: workspace/svg-no-embedded-media
 *
 * SVG files must not contain embedded media elements.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must not contain embedded media elements. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-embedded-media',
  description: 'SVG files must not contain embedded media elements.',
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

      if (/<(image|video|audio)\b/.test(content)) {
        results.push(
          createResult(
            'workspace/svg-no-embedded-media',
            filePath,
            1,
            1,
            'error',
            `Embedded media element detected in SVG: ${filePath}`,
            {
              tip: 'Remove <image>, <video>, and <audio> elements from SVGs',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
