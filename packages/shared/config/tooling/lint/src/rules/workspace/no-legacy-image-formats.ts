/**
 * Rule: workspace/no-legacy-image-formats
 *
 * Only .webp, .svg, and .ico image formats are allowed.
 * Blocks .png, .jpg, and .jpeg files outside of node_modules and .git.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Legacy image format extensions to block. */
const LEGACY_EXTENSIONS: readonly string[] = ['.png', '.jpg', '.jpeg'];

/** Only .webp, .svg, and .ico image formats are allowed. */
const rule: WorkspaceRule = {
  id: 'workspace/no-legacy-image-formats',
  description: 'Only .webp, .svg, and .ico image formats are allowed.',
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
      if (filePath.includes('node_modules') || filePath.includes('.git')) {
        continue;
      }

      const lowerPath: string = filePath.toLowerCase();
      let isLegacy: boolean = false;

      for (const ext of LEGACY_EXTENSIONS) {
        if (lowerPath.endsWith(ext)) {
          isLegacy = true;
          break;
        }
      }

      if (isLegacy) {
        results.push(
          createResult(
            'workspace/no-legacy-image-formats',
            filePath,
            1,
            1,
            'error',
            `Legacy image format detected: ${filePath}`,
            {
              tip: 'Convert to .webp or .svg',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
