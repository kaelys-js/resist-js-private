/**
 * Rule: workspace/no-bower-json
 *
 * Workspace must not contain deprecated bower.json files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags deprecated bower.json files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-bower-json',
  description: 'Workspace must not contain deprecated bower.json files.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
      const name: string = basename(filePath);
      if (name === 'bower.json') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-bower-json',
            filePath,
            1,
            1,
            'error',
            `Deprecated bower.json found: ${relativePath}`,
            {
              tip: 'Remove bower.json — Bower is unmaintained. Use pnpm instead.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
