/**
 * Rule: workspace/no-nonpreferred-image-formats
 *
 * Blocks non-preferred image formats (.png, .jpg, .jpeg, .gif, .tiff, .bmp).
 * Only .webp, .svg, and .ico are allowed.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Blocked image format extensions. */
const BLOCKED_EXTENSIONS: ReadonlySet<string> = new Set<string>([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.tiff',
  '.tif',
  '.bmp',
]);

/** Blocks non-preferred image formats. */
const rule: WorkspaceRule = {
  id: 'workspace/no-nonpreferred-image-formats',
  description: 'Images must use preferred formats (.webp, .svg, .ico).',
  scope: 'workspace',
  categories: ['workspace', 'assets'],
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
      const lowerPath: string = filePath.toLowerCase();
      const isBlocked: boolean = [...BLOCKED_EXTENSIONS].some((ext: string): boolean =>
        lowerPath.endsWith(ext),
      );

      if (isBlocked) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        const ext: string =
          [...BLOCKED_EXTENSIONS].find((e: string): boolean => lowerPath.endsWith(e)) ?? '';
        results.push(
          createResult(
            'workspace/no-nonpreferred-image-formats',
            filePath,
            1,
            1,
            'error',
            `Non-preferred image format '${ext}' found: ${relativePath} — use .webp, .svg, or .ico instead`,
            {
              tip: 'Convert images to WebP format for better compression and performance',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
