/**
 * Rule: workspace/no-oversized-repo
 *
 * Git object database must not exceed size budget.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags oversized Git object databases. */
const rule: WorkspaceRule = {
  id: 'workspace/no-oversized-repo',
  description: 'Git object database must not exceed size budget.',
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
      output = execSync('du -sk .git/objects', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      });
    } catch {
      return results;
    }

    const sizeKB: number = Number.parseInt(output.split('\t')[0] ?? '0', 10);

    if (sizeKB > 500_000) {
      results.push(
        createResult(
          'workspace/no-oversized-repo',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Git object database is large (${sizeKB} KB)`,
          {
            tip: 'Use git-lfs for large files',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
