/**
 * Rule: workspace/enforce-benchmark-file-naming
 *
 * Ensures benchmark files use .benchmark.ts(x) extensions and live inside
 * __benchmarks__ directories, and that files inside __benchmarks__ use
 * the correct naming convention.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Valid benchmark file extensions. */
const BENCHMARK_EXTENSIONS: readonly string[] = ['.benchmark.ts', '.benchmark.tsx'] as const;

/** Benchmark files must live in __benchmarks__/ and use .benchmark.ts(x) naming. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-benchmark-file-naming',
  description:
    'Benchmark files must live in __benchmarks__/ directories and use .benchmark.ts(x) naming.',
  scope: 'workspace',
  categories: ['workspace', 'testing'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;

    return ctx.allFiles();
  },

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
      const fileName: string = basename(filePath);
      const relativePath: string = relative(ctx.rootDir, filePath);
      let isBenchmarkName: boolean = false;

      for (const ext of BENCHMARK_EXTENSIONS) {
        if (fileName.endsWith(ext)) {
          isBenchmarkName = true;
          break;
        }
      }

      const isInBenchmarksDir: boolean = filePath.includes('/__benchmarks__/');
      const isTsFile: boolean = fileName.endsWith('.ts') || fileName.endsWith('.tsx');

      /* Check 1: Benchmark-named file not in __benchmarks__ directory. */
      if (isBenchmarkName && !isInBenchmarksDir) {
        results.push(
          createResult(
            'workspace/enforce-benchmark-file-naming',
            filePath,
            1,
            1,
            'error',
            `Benchmark file not in __benchmarks__ directory: ${relativePath}`,
            {
              tip: 'Move benchmark files to __benchmarks__/ and use .benchmark.ts(x) naming',
            },
          ),
        );
      }

      /* Check 2: File in __benchmarks__ with .ts(x) extension but wrong naming. */
      if (isInBenchmarksDir && isTsFile && !isBenchmarkName) {
        results.push(
          createResult(
            'workspace/enforce-benchmark-file-naming',
            filePath,
            1,
            1,
            'error',
            `File in __benchmarks__ must use .benchmark.ts(x) naming: ${fileName}`,
            {
              tip: 'Move benchmark files to __benchmarks__/ and use .benchmark.ts(x) naming',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
