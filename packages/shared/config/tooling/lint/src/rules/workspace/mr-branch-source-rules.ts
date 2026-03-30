/**
 * Rule: workspace/mr-branch-source-rules
 *
 * MR source branch must follow naming conventions.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Allowed branch naming pattern. */
const BRANCH_PATTERN: RegExp =
  /^(feature|fix|chore|refactor|hotfix|docs|test|perf|ci|infra|build)\/[a-z0-9._-]+$/;

/** MR source branch must follow naming conventions. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-branch-source-rules',
  description: 'MR source branch must follow naming conventions.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
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

    const branch: string | undefined = process.env['MR_SOURCE_BRANCH'];
    if (branch === undefined) {
      return Promise.resolve(results);
    }

    if (!BRANCH_PATTERN.test(branch)) {
      results.push(
        createResult(
          'workspace/mr-branch-source-rules',
          ctx.rootDir,
          1,
          1,
          'error',
          `Invalid MR source branch name: '${branch}'`,
          {
            tip: "Use format like 'feature/xyz', 'fix/abc', or 'chore/update-config'",
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
