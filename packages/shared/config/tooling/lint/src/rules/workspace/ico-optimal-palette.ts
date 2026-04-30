/**
 * Rule: workspace/ico-optimal-palette
 *
 * ICO files should use 256 or fewer colors.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** ICO files should use 256 or fewer colors. */
const rule: WorkspaceRule = {
  id: 'workspace/ico-optimal-palette',
  description: 'ICO files should use 256 or fewer colors.',
  scope: 'workspace',
  categories: ['workspace', 'encoding'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule reads filesystem directly via node:fs (image/symlink inspection). */
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
      if (!filePath.toLowerCase().endsWith('.ico')) {
        continue;
      }

      let buf: Buffer;

      try {
        buf = readFileSync(filePath);
      } catch {
        continue;
      }

      if (buf.length < 9) {
        continue;
      }

      // ICONDIRENTRY starts at offset 6
      // Byte 8 (offset 6+2) = color count: 0 means >=256 colors (32-bit/true color)
      const colorCount: number = buf[8] ?? 0;
      const relativePath: string = relative(ctx.rootDir, filePath);

      if (colorCount === 0) {
        results.push(
          createResult(
            'workspace/ico-optimal-palette',
            filePath,
            1,
            1,
            'warning',
            `ICO uses 32-bit color (more than 256 colors): ${relativePath}`,
            {
              tip: 'Reduce to 256 or fewer colors for smaller file size',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
