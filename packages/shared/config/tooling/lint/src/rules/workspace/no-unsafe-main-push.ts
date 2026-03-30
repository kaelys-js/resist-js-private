/**
 * Rule: workspace/no-unsafe-main-push
 *
 * Protected branches must not have unsafe push config
 * or fixup/squash commits.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags unsafe push configurations and fixup/squash commits on protected branches. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unsafe-main-push',
  description: 'Protected branches must not have unsafe push config or fixup/squash commits.',
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
      branch = execSync('git symbolic-ref --short HEAD', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (branch !== 'main' && branch !== 'master') {
      return results;
    }

    try {
      const pushDefault: string = execSync('git config --get push.default', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();

      if (pushDefault === 'force' || pushDefault === 'matching') {
        results.push(
          createResult(
            'workspace/no-unsafe-main-push',
            ctx.rootDir,
            1,
            1,
            'error',
            `Unsafe push.default config '${pushDefault}' on protected branch '${branch}'`,
            {
              tip: 'Set push.default to "simple" or "current" for safer push behavior',
            },
          ),
        );
      }
    } catch {
      /* push.default not set — safe */
    }

    try {
      const subject: string = execSync('git log -1 --pretty=%s', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();

      if (subject.startsWith('fixup!') || subject.startsWith('squash!')) {
        results.push(
          createResult(
            'workspace/no-unsafe-main-push',
            ctx.rootDir,
            1,
            1,
            'error',
            `Fixup/squash commit on protected branch '${branch}': ${subject}`,
            {
              tip: 'Run git rebase -i to squash these commits before pushing to a protected branch',
            },
          ),
        );
      }
    } catch {
      /* no commits — safe */
    }

    return results;
  },
};

export default rule;
