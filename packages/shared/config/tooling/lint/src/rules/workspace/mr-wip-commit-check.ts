/**
 * Rule: workspace/mr-wip-commit-check
 *
 * MR commits must not contain WIP/tmp/debug/fixme messages.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching WIP/placeholder commit messages. */
const WIP_PATTERN: RegExp = /\b(wip|tmp|debug|test|fixme)\b/i;

/** MR commits must not contain WIP/tmp/debug/fixme messages. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-wip-commit-check',
  description: 'MR commits must not contain WIP/tmp/debug/fixme messages.',
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

    const commits: string | undefined = process.env['MR_COMMITS'];
    if (commits === undefined) {
      return Promise.resolve(results);
    }

    if (WIP_PATTERN.test(commits)) {
      results.push(
        createResult(
          'workspace/mr-wip-commit-check',
          ctx.rootDir,
          1,
          1,
          'error',
          'Merge request includes WIP or placeholder commits',
          {
            tip: 'Squash or reword commits before merging',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
