/**
 * Rule: workspace/webp-no-lossless
 *
 * .webp files should use lossy encoding.
 *
 * @module
 */

import { readFileSync } from 'node:fs';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** .webp files should use lossy encoding. */
const rule: WorkspaceRule = {
  id: 'workspace/webp-no-lossless',
  description: '.webp files should use lossy encoding.',
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
      if (!filePath.toLowerCase().endsWith('.webp')) {
        continue;
      }

      let buf: Buffer;
      try {
        buf = readFileSync(filePath);
      } catch {
        continue;
      }

      if (buf.length < 16) {
        continue;
      }

      const chunk: string = buf.subarray(12, 16).toString('ascii');
      if (chunk === 'VP8L') {
        results.push(
          createResult(
            'workspace/webp-no-lossless',
            filePath,
            1,
            1,
            'warning',
            `.webp file uses lossless encoding: ${filePath}`,
            {
              tip: 'Re-encode with cwebp -q 80 for lossy compression',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
