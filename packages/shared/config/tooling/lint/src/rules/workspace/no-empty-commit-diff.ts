/**
 * Rule: workspace/no-empty-commit-diff
 *
 * Commits must include actual file changes, not just metadata.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags commits that contain no file changes. */
const rule: WorkspaceRule = {
  id: 'workspace/no-empty-commit-diff',
  description: 'Commits must include actual file changes, not just metadata.',
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
      output = execSync('git log -1 --name-only --pretty=format:', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (output === '') {
      results.push(
        createResult(
          'workspace/no-empty-commit-diff',
          ctx.rootDir,
          1,
          1,
          'error',
          'Last commit contains no file changes — only metadata',
          {},
        ),
      );
    }

    return results;
  },
};

export default rule;
