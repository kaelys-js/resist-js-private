/**
 * Rule: workspace/no-detached-head
 *
 * Git HEAD must not be in a detached state.
 * A detached HEAD means no branch is checked out,
 * which can lead to lost commits.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags when Git HEAD is detached (not on any branch). */
const rule: WorkspaceRule = {
  id: 'workspace/no-detached-head',
  description: 'Git HEAD must not be in a detached state.',
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

    try {
      execSync('git symbolic-ref --short HEAD', { cwd: ctx.rootDir, encoding: 'utf8' });
    } catch {
      results.push(
        createResult(
          'workspace/no-detached-head',
          ctx.rootDir,
          1,
          1,
          'warning',
          'Git HEAD is detached — not on any branch',
          {
            tip: 'Checkout a branch: git checkout main',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
