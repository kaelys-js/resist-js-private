/**
 * Rule: workspace/no-unpinned-git-deps
 *
 * Detects GitHub dependencies pinned to branch names instead of
 * commit SHAs in pnpm-lock.yaml.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unpinned-git-deps',
  description: 'GitHub dependencies in lockfile must be pinned to commit SHAs, not branch names.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
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
    const lockfilePath: string = join(ctx.rootDir, 'pnpm-lock.yaml');

    const exists: boolean = await ctx.fileExists(lockfilePath);

    if (!exists) {
      return [];
    }

    const content: string = await ctx.readFile(lockfilePath);
    const lines: string[] = content.split('\n');
    const results: Array<ReturnType<typeof createResult>> = [];
    const unpinnedPattern: RegExp = /github\.com.*#(main|master|next|canary|dev|develop)\b/;

    for (const [i, line] of lines.entries()) {
      if (unpinnedPattern.test(line)) {
        results.push(
          createResult(
            'workspace/no-unpinned-git-deps',
            lockfilePath,
            i + 1,
            1,
            'error',
            `Unpinned Git dependency detected: ${line.trim()}`,
            {
              tip: 'Pin to a specific commit SHA instead of a branch name',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
