/**
 * Rule: workspace/webp-no-metadata
 *
 * .webp files must not contain EXIF, XMP, or ICC metadata.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** .webp files must not contain EXIF, XMP, or ICC metadata. */
const rule: WorkspaceRule = {
  id: 'workspace/webp-no-metadata',
  description: '.webp files must not contain EXIF, XMP, or ICC metadata.',
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

      if (/ICC_PROFILE|XMP|Exif/.test(content)) {
        results.push(
          createResult(
            'workspace/webp-no-metadata',
            filePath,
            1,
            1,
            'warning',
            `.webp file contains metadata (EXIF, XMP, or ICC): ${filePath}`,
            {
              tip: 'Strip metadata using cwebp -metadata none',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
