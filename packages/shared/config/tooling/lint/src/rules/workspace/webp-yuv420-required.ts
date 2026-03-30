/**
 * Rule: workspace/webp-yuv420-required
 *
 * .webp files must use YUV420 subsampling.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** .webp files must use YUV420 subsampling. */
const rule: WorkspaceRule = {
  id: 'workspace/webp-yuv420-required',
  description: '.webp files must use YUV420 subsampling.',
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

      // WebP RIFF container: bytes 12-15 = chunk type
      // "VP8 " = lossy (YUV420 by default) -> pass
      // "VP8L" = lossless (not YUV420) -> warning
      // "VP8X" = extended -> pass (may contain either)
      const chunk: string = buf.subarray(12, 16).toString('ascii');
      const relativePath: string = relative(ctx.rootDir, filePath);

      if (chunk === 'VP8L') {
        results.push(
          createResult(
            'workspace/webp-yuv420-required',
            filePath,
            1,
            1,
            'warning',
            `WebP file uses lossless encoding (not YUV420 subsampling): ${relativePath}`,
            {
              tip: 'Re-encode with cwebp -q 80 for YUV420 lossy compression',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
