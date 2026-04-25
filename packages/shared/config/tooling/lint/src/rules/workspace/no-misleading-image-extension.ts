/**
 * Rule: workspace/no-misleading-image-extension
 *
 * Image files must match their expected format based on extension.
 *
 * @module
 */

import { readFileSync } from 'node:fs';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Image files must match their expected format based on extension. */
const rule: WorkspaceRule = {
  id: 'workspace/no-misleading-image-extension',
  description: 'Image files must match their expected format based on extension.',
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
      const lower: string = filePath.toLowerCase();

      if (lower.endsWith('.svg')) {
        let content: string;
        try {
          content = await ctx.readFile(filePath);
        } catch {
          continue;
        }
        const trimmed: string = content.trimStart();
        if (
          !trimmed.startsWith('<svg') &&
          !trimmed.startsWith('<?xml') &&
          !trimmed.startsWith('<!')
        ) {
          results.push(
            createResult(
              'workspace/no-misleading-image-extension',
              filePath,
              1,
              1,
              'error',
              `SVG file does not contain valid SVG/XML content: ${filePath}`,
              {
                tip: 'Rename the file or re-encode it to match its extension',
              },
            ),
          );
        }
      } else if (lower.endsWith('.webp')) {
        let buf: Buffer;
        try {
          buf = readFileSync(filePath);
        } catch {
          continue;
        }
        if (buf.length >= 12) {
          const riff: string = buf.subarray(0, 4).toString('ascii');
          const webp: string = buf.subarray(8, 12).toString('ascii');
          if (riff !== 'RIFF' || webp !== 'WEBP') {
            results.push(
              createResult(
                'workspace/no-misleading-image-extension',
                filePath,
                1,
                1,
                'error',
                `File claims to be .webp but does not have RIFF/WEBP header: ${filePath}`,
                {
                  tip: 'Rename the file or re-encode it to match its extension',
                },
              ),
            );
          }
        }
      } else if (lower.endsWith('.ico')) {
        let buf: Buffer;
        try {
          buf = readFileSync(filePath);
        } catch {
          continue;
        }
        if (buf.length >= 4) {
          // ICO magic: 00 00 01 00
          if (buf[0] !== 0 || buf[1] !== 0 || buf[2] !== 1 || buf[3] !== 0) {
            results.push(
              createResult(
                'workspace/no-misleading-image-extension',
                filePath,
                1,
                1,
                'error',
                `File claims to be .ico but does not have ICO magic bytes: ${filePath}`,
                {
                  tip: 'Rename the file or re-encode it to match its extension',
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
