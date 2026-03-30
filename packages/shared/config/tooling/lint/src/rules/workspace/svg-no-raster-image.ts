/**
 * Rule: workspace/svg-no-raster-image
 *
 * SVG files must not embed raster images.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** SVG files must not embed raster images. */
const rule: WorkspaceRule = {
  id: 'workspace/svg-no-raster-image',
  description: 'SVG files must not embed raster images.',
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

      if (/data:image\/(png|jpeg|gif);base64,/.test(content)) {
        results.push(
          createResult(
            'workspace/svg-no-raster-image',
            filePath,
            1,
            1,
            'error',
            `Embedded raster image found in SVG: ${filePath}`,
            {
              tip: 'Avoid base64 raster images in vector graphics',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
