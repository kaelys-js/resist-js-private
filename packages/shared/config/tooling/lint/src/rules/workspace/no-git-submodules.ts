/**
 * Rule: workspace/no-git-submodules
 *
 * Workspace must not use Git submodules.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags .gitmodules file in the workspace root. */
const rule: WorkspaceRule = {
  id: 'workspace/no-git-submodules',
  description: 'Workspace must not use Git submodules.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    const gitmodulesPath: string = join(ctx.rootDir, '.gitmodules');
    const exists: boolean = await ctx.fileExists(gitmodulesPath);

    if (exists) {
      results.push(
        createResult(
          'workspace/no-git-submodules',
          gitmodulesPath,
          1,
          1,
          'error',
          '.gitmodules file found — submodules are not allowed in this monorepo',
          {
            tip: 'Use workspace packages or vendored modules instead of submodules.',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
