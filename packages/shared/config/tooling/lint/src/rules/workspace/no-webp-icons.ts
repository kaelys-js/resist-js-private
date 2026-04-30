/**
 * Rule: workspace/no-webp-icons
 *
 * .webp files must not be used for favicons or icons.
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** .webp files must not be used for favicons or icons. */
const rule: WorkspaceRule = {
  id: 'workspace/no-webp-icons',
  description: '.webp files must not be used for favicons or icons.',
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
      const fileName: string = basename(filePath).toLowerCase();

      if (
        fileName.endsWith('.webp') &&
        (fileName.includes('icon') || fileName === 'favicon.webp')
      ) {
        results.push(
          createResult(
            'workspace/no-webp-icons',
            filePath,
            1,
            1,
            'error',
            `.webp file used as icon or favicon: ${filePath}`,
            {
              tip: 'Use .ico or .svg for icons/favicons to ensure browser compatibility',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
