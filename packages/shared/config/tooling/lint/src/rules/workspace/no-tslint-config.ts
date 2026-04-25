/**
 * Rule: workspace/no-tslint-config
 *
 * Workspace must not contain deprecated tslint.json files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags deprecated tslint.json files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tslint-config',
  description: 'Workspace must not contain deprecated tslint.json files.',
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
      if (name === 'tslint.json') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-tslint-config',
            filePath,
            1,
            1,
            'error',
            `Deprecated tslint.json found: ${relativePath}`,
            {
              tip: 'Remove tslint.json — TSLint is deprecated. Use the custom linter instead.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
