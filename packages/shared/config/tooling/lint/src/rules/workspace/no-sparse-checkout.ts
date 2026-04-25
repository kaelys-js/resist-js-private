/**
 * Rule: workspace/no-sparse-checkout
 *
 * Sparse checkout must not be enabled.
 * Detects when core.sparseCheckout is set to "true" in git config.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags when sparse checkout is enabled. */
const rule: WorkspaceRule = {
  id: 'workspace/no-sparse-checkout',
  description: 'Sparse checkout must not be enabled.',
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
      value = execSync('git config core.sparseCheckout', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (value === 'true') {
      results.push(
        createResult(
          'workspace/no-sparse-checkout',
          ctx.rootDir,
          1,
          1,
          'error',
          'Sparse checkout is enabled but not expected',
          {
            tip: 'Disable with: git sparse-checkout disable',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
