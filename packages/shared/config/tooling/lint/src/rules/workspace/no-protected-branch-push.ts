/**
 * Rule: workspace/no-protected-branch-push
 *
 * Direct pushes to protected branches are not allowed.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags direct pushes to protected branches. */
const rule: WorkspaceRule = {
  id: 'workspace/no-protected-branch-push',
  description: 'Direct pushes to protected branches are not allowed.',
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

    const PROTECTED: readonly string[] = ['main', 'master', 'production', 'release', 'prod'];

    if (PROTECTED.includes(branch)) {
      results.push(
        createResult(
          'workspace/no-protected-branch-push',
          ctx.rootDir,
          1,
          1,
          'error',
          `Direct push to protected branch '${branch}' is not allowed`,
          {
            tip: 'Create a feature branch and open a pull request instead',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
