/**
 * Rule: workspace/mr-up-to-date-with-target
 *
 * MR source branch must not be behind target branch.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR source branch must not be behind target branch. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-up-to-date-with-target',
  description: 'MR source branch must not be behind target branch.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
  check(context: unknown): Promise<
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

    const targetBranch: string | undefined = process.env['MR_TARGET_BRANCH'];
    const sourceBranch: string | undefined = process.env['MR_SOURCE_BRANCH'];
    if (targetBranch === undefined || sourceBranch === undefined) {
      return Promise.resolve(results);
    }

    try {
      execSync(`git merge-base --is-ancestor origin/${targetBranch} ${sourceBranch}`, {
        cwd: ctx.rootDir,
        stdio: 'pipe',
      });
    } catch {
      results.push(
        createResult(
          'workspace/mr-up-to-date-with-target',
          ctx.rootDir,
          1,
          1,
          'error',
          `MR source branch is behind 'origin/${targetBranch}'`,
          {
            tip: `Rebase your branch onto the latest target: git pull --rebase origin ${targetBranch}`,
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
