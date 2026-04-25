/**
 * Rule: workspace/no-git-alternate-objects
 *
 * GIT_ALTERNATE_OBJECT_DIRECTORIES environment variable must not be set.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags GIT_ALTERNATE_OBJECT_DIRECTORIES environment variable. */
const rule: WorkspaceRule = {
  id: 'workspace/no-git-alternate-objects',
  description: 'GIT_ALTERNATE_OBJECT_DIRECTORIES environment variable must not be set.',
  scope: 'workspace',
  categories: ['workspace', 'git', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on CI environment variables (process.env). */
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

    if (process.env['GIT_ALTERNATE_OBJECT_DIRECTORIES']) {
      results.push(
        createResult(
          'workspace/no-git-alternate-objects',
          ctx.rootDir,
          1,
          1,
          'error',
          'GIT_ALTERNATE_OBJECT_DIRECTORIES is set — this allows injection of foreign Git objects',
          {
            tip: 'Unset this variable: unset GIT_ALTERNATE_OBJECT_DIRECTORIES',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
