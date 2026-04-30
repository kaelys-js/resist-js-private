/**
 * Rule: workspace/no-tsbuildinfo
 *
 * TypeScript build cache files should not be committed to version control.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags .tsbuildinfo files that should not be committed. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsbuildinfo',
  description: 'TypeScript build cache files should not be committed to version control.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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
      if (filePath.endsWith('.tsbuildinfo')) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-tsbuildinfo',
            filePath,
            1,
            1,
            'error',
            `TypeScript build cache should not be committed: ${relativePath}`,
            {
              tip: 'Add *.tsbuildinfo to .gitignore',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
