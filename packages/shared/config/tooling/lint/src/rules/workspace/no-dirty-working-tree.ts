/**
 * Rule: workspace/no-dirty-working-tree
 *
 * Working directory and index must be clean (no uncommitted changes).
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags uncommitted changes in the working directory or index. */
const rule: WorkspaceRule = {
  id: 'workspace/no-dirty-working-tree',
  description: 'Working directory and index must be clean (no uncommitted changes).',
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
      let dirty: boolean = false;

      try {
        execSync('git diff --quiet', { cwd: ctx.rootDir, encoding: 'utf8' });
      } catch {
        dirty = true;
      }

      try {
        execSync('git diff --cached --quiet', {
          cwd: ctx.rootDir,
          encoding: 'utf8',
        });
      } catch {
        dirty = true;
      }

      if (dirty) {
        results.push(
          createResult(
            'workspace/no-dirty-working-tree',
            ctx.rootDir,
            1,
            1,
            'error',
            'Uncommitted changes detected in working directory or index',
            {
              tip: 'Commit or stash your changes before proceeding',
            },
          ),
        );
      }
    } catch {
      /* git not available — skip */
    }

    return results;
  },
};

export default rule;
