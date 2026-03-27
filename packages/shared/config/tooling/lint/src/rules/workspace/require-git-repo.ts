/**
 * Rule: workspace/require-git-repo
 *
 * Ensures the project root has a `.git` directory (or file, for worktrees).
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/require-git-repo',
  description: 'Project root must be under Git version control.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
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
    const gitPath: string = join(ctx.rootDir, '.git');

    const isDir: boolean = await ctx.dirExists(gitPath);
    if (isDir) {
      return [];
    }

    const isFile: boolean = await ctx.fileExists(gitPath);
    if (isFile) {
      return [];
    }

    return [
      createResult(
        'workspace/require-git-repo',
        gitPath,
        1,
        1,
        'error',
        'Missing .git — project is not under Git version control',
        {
          tip: "Run 'git init' in the root directory",
        },
      ),
    ];
  },
};

export default rule;
