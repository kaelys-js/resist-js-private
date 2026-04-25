/**
 * Rule: workspace/ico-requires-multiresolution
 *
 * ICO files should contain at least 3 resolution variants.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** ICO files should contain at least 3 resolution variants. */
const rule: WorkspaceRule = {
  id: 'workspace/ico-requires-multiresolution',
  description: 'ICO files should contain at least 3 resolution variants.',
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

      if (buf.length < 6) {
        continue;
      }

      // ICO ICONDIR header: bytes 4-5 = image count (little-endian uint16)
      const imageCount: number = buf.readUInt16LE(4);
      const relativePath: string = relative(ctx.rootDir, filePath);

      if (imageCount < 3) {
        results.push(
          createResult(
            'workspace/ico-requires-multiresolution',
            filePath,
            1,
            1,
            'error',
            `ICO file contains only ${String(imageCount)} resolution variant(s), expected at least 3: ${relativePath}`,
            {
              tip: 'Include 16x16, 32x32, and 48x48 sizes for best compatibility',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
