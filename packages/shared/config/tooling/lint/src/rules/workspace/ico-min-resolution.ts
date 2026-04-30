/**
 * Rule: workspace/ico-min-resolution
 *
 * ICO files should have at least 64x64 resolution.
 *
 * @module
 */

import { readFileSync } from 'node:fs';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** ICO files should have at least 64x64 resolution. */
const rule: WorkspaceRule = {
  id: 'workspace/ico-min-resolution',
  description: 'ICO files should have at least 64x64 resolution.',
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

      if (buf.length < 22) {
        continue;
      }

      // ICO ICONDIR: 6 bytes header, then ICONDIRENTRY at offset 6
      // ICONDIRENTRY byte 0 = width (0 means 256), byte 1 = height (0 means 256)
      const widthByte: number = buf[6] ?? 0;
      const heightByte: number = buf[7] ?? 0;
      const width: number = widthByte === 0 ? 256 : widthByte;
      const height: number = heightByte === 0 ? 256 : heightByte;

      if (width < 64 || height < 64) {
        results.push(
          createResult(
            'workspace/ico-min-resolution',
            filePath,
            1,
            1,
            'warning',
            `ICO file has resolution ${String(width)}x${String(height)}, below minimum 64x64: ${filePath}`,
            {
              tip: 'Use at least 64x64 resolution for modern icon compatibility',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
