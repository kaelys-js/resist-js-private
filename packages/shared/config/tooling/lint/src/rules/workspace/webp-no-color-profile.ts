/**
 * Rule: workspace/webp-no-color-profile
 *
 * .webp files must not contain embedded ICC or EXIF color profiles.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** .webp files must not contain embedded ICC or EXIF color profiles. */
const rule: WorkspaceRule = {
  id: 'workspace/webp-no-color-profile',
  description: '.webp files must not contain embedded ICC or EXIF color profiles.',
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
      if (!filePath.toLowerCase().endsWith('.webp')) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);

      if (content.includes('ICCP') || content.includes('EXIF')) {
        results.push(
          createResult(
            'workspace/webp-no-color-profile',
            filePath,
            1,
            1,
            'warning',
            `WebP file contains embedded color profile (ICC/EXIF): ${relativePath}`,
            {
              tip: 'Strip color profiles using cwebp -metadata none',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
