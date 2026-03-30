/**
 * Rule: workspace/no-bench-directory
 *
 * Workspace must not contain __benchmarks__/, benchmarks/, or bench/ directories.
 * Benchmark files should be colocated with source files.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Directory segments that indicate a centralized benchmarks directory. */
const BENCH_DIR_PATTERNS: readonly string[] = ['/__benchmarks__/', '/benchmarks/', '/bench/'];

/** Flags files inside centralized benchmark directories. */
const rule: WorkspaceRule = {
  id: 'workspace/no-bench-directory',
  description:
    'Workspace must not contain __benchmarks__/, benchmarks/, or bench/ directories. Benchmark files should be colocated with source files.',
  scope: 'workspace',
  categories: ['workspace', 'testing'],
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

    for (const filePath of await ctx.allFiles()) {
      const isInBenchDir: boolean = BENCH_DIR_PATTERNS.some((pattern: string): boolean =>
        filePath.includes(pattern),
      );

      if (isInBenchDir) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-bench-directory',
            filePath,
            1,
            1,
            'error',
            `File inside centralized benchmark directory: ${relativePath}`,
            {
              tip: 'Colocate benchmark files next to source files (e.g., foo.bench.ts next to foo.ts)',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
