/**
 * Rule: workspace/no-merge-commits-on-main
 *
 * The main branch must not contain merge commits.
 * This enforces a linear history on main,
 * keeping the git log clean and easy to bisect.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags merge commits on the main branch to enforce linear history. */
const rule: WorkspaceRule = {
  id: 'workspace/no-merge-commits-on-main',
  description: 'The main branch must not contain merge commits (linear history only).',
  scope: 'workspace',
  categories: ['workspace', 'git', 'safety'],
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

    let branch: string;
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (branch !== 'main') {
      return results;
    }

    let mergeOutput: string;
    try {
      mergeOutput = execSync("git log --merges --pretty=format:'%h %s' origin/main..HEAD", {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      });
    } catch {
      return results;
    }

    const lines: string[] = mergeOutput.split('\n').filter((line: string) => line.trim() !== '');

    for (const line of lines) {
      results.push(
        createResult(
          'workspace/no-merge-commits-on-main',
          ctx.rootDir,
          1,
          1,
          'error',
          `Merge commit on main: ${line.trim()}`,
          {
            tip: 'Use rebase instead of merge: git rebase origin/main',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
