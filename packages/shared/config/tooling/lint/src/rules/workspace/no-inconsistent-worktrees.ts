/**
 * Rule: workspace/no-inconsistent-worktrees
 *
 * All git worktrees must be valid and registered.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags missing or invalid git worktrees. */
const rule: WorkspaceRule = {
  id: 'workspace/no-inconsistent-worktrees',
  description: 'All git worktrees must be valid and registered.',
  scope: 'workspace',
  categories: ['workspace', 'git'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
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

    let output: string;

    try {
      output = execSync('git worktree list --porcelain', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (!output.includes('worktree ')) {
      results.push(
        createResult(
          'workspace/no-inconsistent-worktrees',
          ctx.rootDir,
          1,
          1,
          'error',
          'No valid Git worktree found',
          {},
        ),
      );
    }

    return results;
  },
};

export default rule;
