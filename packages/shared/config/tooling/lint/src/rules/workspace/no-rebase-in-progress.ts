/**
 * Rule: workspace/no-rebase-in-progress
 *
 * No rebase operation should be in progress.
 * Detects .git/rebase-merge and .git/rebase-apply directories.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags in-progress rebase operations via .git directory markers. */
const rule: WorkspaceRule = {
  id: 'workspace/no-rebase-in-progress',
  description: 'No rebase operation should be in progress.',
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

    if (existsSync(join(ctx.rootDir, '.git', 'rebase-merge'))) {
      results.push(
        createResult(
          'workspace/no-rebase-in-progress',
          ctx.rootDir,
          1,
          1,
          'error',
          'Rebase in progress — .git/rebase-merge directory detected',
          {
            tip: 'Run git rebase --continue or git rebase --abort',
          },
        ),
      );
    }

    if (existsSync(join(ctx.rootDir, '.git', 'rebase-apply'))) {
      results.push(
        createResult(
          'workspace/no-rebase-in-progress',
          ctx.rootDir,
          1,
          1,
          'error',
          'Rebase in progress — .git/rebase-apply directory detected',
          {
            tip: 'Run git rebase --continue or git rebase --abort',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
