/**
 * Rule: workspace/no-npmrc
 *
 * Workspace must not contain .npmrc files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags .npmrc files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-npmrc',
  description: 'Workspace must not contain .npmrc files.',
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      if (name === '.npmrc') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-npmrc',
            filePath,
            1,
            1,
            'error',
            `.npmrc file found: ${relativePath} — this project uses pnpm only`,
            {
              tip: 'Remove .npmrc files to avoid registry/auth config conflicts with pnpm',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
