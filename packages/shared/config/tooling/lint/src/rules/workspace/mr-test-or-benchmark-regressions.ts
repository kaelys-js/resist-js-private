/**
 * Rule: workspace/mr-test-or-benchmark-regressions
 *
 * MR must not introduce test coverage or benchmark performance regressions.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR must not introduce test coverage or benchmark performance regressions. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-test-or-benchmark-regressions',
  description: 'MR must not introduce test coverage or benchmark performance regressions.',
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

    const coverageDiff: string | undefined = process.env['MR_COVERAGE_DIFF'];
    const benchmarkDiff: string | undefined = process.env['MR_BENCHMARK_DIFF'];

    if (coverageDiff === undefined && benchmarkDiff === undefined) {
      return Promise.resolve(results);
    }

    if (coverageDiff !== undefined && Number(coverageDiff) < -0.5) {
      results.push(
        createResult(
          'workspace/mr-test-or-benchmark-regressions',
          ctx.rootDir,
          1,
          1,
          'error',
          `Test coverage regressed by ${coverageDiff}%`,
          {
            tip: 'Add or fix tests to maintain coverage',
          },
        ),
      );
    }

    if (benchmarkDiff !== undefined && Number(benchmarkDiff) > 5.0) {
      results.push(
        createResult(
          'workspace/mr-test-or-benchmark-regressions',
          ctx.rootDir,
          1,
          1,
          'error',
          `Benchmark performance regressed by ${benchmarkDiff}%`,
          {
            tip: 'Investigate performance bottlenecks or avoid changes with high cost',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
