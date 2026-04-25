/**
 * Rule: workspace/no-jsconfig
 *
 * Workspace must not contain jsconfig.json files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags jsconfig.json files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-jsconfig',
  description: 'Workspace must not contain jsconfig.json files.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
      const name: string = basename(filePath);
      if (name === 'jsconfig.json') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-jsconfig',
            filePath,
            1,
            1,
            'error',
            `jsconfig.json found: ${relativePath}`,
            {
              tip: 'Remove jsconfig.json — use tsconfig.json in this TypeScript monorepo.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
