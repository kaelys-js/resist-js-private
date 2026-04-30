/**
 * Rule: workspace/mr-test-coverage-diff
 *
 * Test coverage must not decrease between base and head.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Test coverage must not decrease between base and head. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-test-coverage-diff',
  description: 'Test coverage must not decrease between base and head.',
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

    const beforeStr: string | undefined = process.env['COVERAGE_BEFORE'];
    const afterStr: string | undefined = process.env['COVERAGE_AFTER'];

    if (beforeStr === undefined || afterStr === undefined) {
      return Promise.resolve(results);
    }

    const before: number = Number(beforeStr);
    const after: number = Number(afterStr);

    if (after < before) {
      results.push(
        createResult(
          'workspace/mr-test-coverage-diff',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Test coverage decreased: ${String(before)}% \u2192 ${String(after)}%`,
          {
            tip: 'Add tests for new or changed logic to maintain coverage',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
