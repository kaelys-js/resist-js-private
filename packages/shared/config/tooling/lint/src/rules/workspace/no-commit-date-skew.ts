/**
 * Rule: workspace/no-commit-date-skew
 *
 * Commit timestamps must not be in the future or excessively old.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags commits with suspicious timestamps. */
const rule: WorkspaceRule = {
  id: 'workspace/no-commit-date-skew',
  description: 'Commit timestamps must not be in the future or excessively old.',
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
      output = execSync('git log -1 --pretty=%ct', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    const commitTs: number = Number.parseInt(output, 10);
    const now: number = Math.floor(Date.now() / 1000);
    const diff: number = now - commitTs;

    if (diff < -600) {
      results.push(
        createResult(
          'workspace/no-commit-date-skew',
          ctx.rootDir,
          1,
          1,
          'warning',
          'Last commit date is in the future',
          {},
        ),
      );
    }

    if (diff > 31_536_000) {
      results.push(
        createResult(
          'workspace/no-commit-date-skew',
          ctx.rootDir,
          1,
          1,
          'warning',
          'Last commit appears over a year old — check timestamp',
          {},
        ),
      );
    }

    return results;
  },
};

export default rule;
