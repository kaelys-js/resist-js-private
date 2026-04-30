/**
 * Rule: workspace/mr-target-branch-protected
 *
 * MR must not target protected branches like main, production, or prod.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Disallowed target branches. */
const DISALLOWED_BRANCHES: Set<string> = new Set(['main', 'production', 'prod']);

/** MR must not target protected branches. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-target-branch-protected',
  description: 'MR must not target protected branches.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on CI environment variables (process.env). */
  check(context: unknown): Promise<
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

    const target: string | undefined = process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'];

    if (target === undefined) {
      return Promise.resolve(results);
    }

    if (DISALLOWED_BRANCHES.has(target)) {
      results.push(
        createResult(
          'workspace/mr-target-branch-protected',
          ctx.rootDir,
          1,
          1,
          'error',
          `Merge Request targets protected branch: ${target}`,
          {
            tip: 'Use a staging or preview branch, and merge via approved pipeline',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
