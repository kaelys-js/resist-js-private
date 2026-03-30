/**
 * Rule: workspace/webp-max-size
 *
 * .webp files must not exceed 250KB.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** .webp files must not exceed 250KB. */
const rule: WorkspaceRule = {
  id: 'workspace/webp-max-size',
  description: '.webp files must not exceed 250KB.',
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

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.length > 256000) {
        results.push(
          createResult(
            'workspace/webp-max-size',
            filePath,
            1,
            1,
            'warning',
            `.webp file exceeds 250KB: ${filePath}`,
            {
              tip: 'Compress with cwebp -q 80 or resize the image',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
