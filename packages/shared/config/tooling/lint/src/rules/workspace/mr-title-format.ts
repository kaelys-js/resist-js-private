/**
 * Rule: workspace/mr-title-format
 *
 * MR title must follow Conventional Commits format.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Conventional Commits pattern for MR titles. */
const TITLE_PATTERN: RegExp =
  /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9-]+\))?: .+/;

/** MR title must follow Conventional Commits format. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-title-format',
  description: 'MR title must follow Conventional Commits format.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
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

    const title: string | undefined = process.env['CI_MERGE_REQUEST_TITLE'];
    if (title === undefined || title === '') {
      return results;
    }

    if (!TITLE_PATTERN.test(title)) {
      results.push(
        createResult(
          'workspace/mr-title-format',
          ctx.rootDir,
          1,
          1,
          'error',
          'Merge Request title does not follow Conventional Commit format',
          {
            tip: "Use 'type(scope): description' — e.g. feat(auth): support token refresh",
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
