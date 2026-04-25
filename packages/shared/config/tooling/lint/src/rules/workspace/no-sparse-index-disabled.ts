/**
 * Rule: workspace/no-sparse-index-disabled
 *
 * Sparse index should be enabled for monorepo performance.
 * Detects when index.sparse is not set to "true", which may
 * degrade performance in large monorepos.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags when sparse index is not enabled. */
const rule: WorkspaceRule = {
  id: 'workspace/no-sparse-index-disabled',
  description: 'Sparse index should be enabled for monorepo performance.',
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

    let value: string;
    try {
      value = execSync('git config --get index.sparse', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      results.push(
        createResult(
          'workspace/no-sparse-index-disabled',
          ctx.rootDir,
          1,
          1,
          'warning',
          'Sparse index is not enabled — may impact monorepo performance',
          {
            tip: 'Enable with: git config index.sparse true',
          },
        ),
      );
      return results;
    }

    if (value !== 'true') {
      results.push(
        createResult(
          'workspace/no-sparse-index-disabled',
          ctx.rootDir,
          1,
          1,
          'warning',
          'Sparse index is not enabled — may impact monorepo performance',
          {
            tip: 'Enable with: git config index.sparse true',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
