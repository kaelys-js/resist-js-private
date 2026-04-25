/**
 * Rule: workspace/no-reflog-in-ci
 *
 * Git reflog must be disabled (core.logallrefupdates must not be true).
 * Detects when reflog is enabled, which adds unnecessary overhead in CI.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags when git reflog is enabled. */
const rule: WorkspaceRule = {
  id: 'workspace/no-reflog-in-ci',
  description: 'Git reflog must be disabled (core.logallrefupdates must not be true).',
  scope: 'workspace',
  categories: ['workspace', 'git', 'safety'],
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

    let value: string;
    try {
      value = execSync('git config --get core.logallrefupdates', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (value === 'true') {
      results.push(
        createResult(
          'workspace/no-reflog-in-ci',
          ctx.rootDir,
          1,
          1,
          'error',
          'Git reflog is enabled — should be disabled in CI',
          {
            tip: 'Set core.logallrefupdates to false',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
