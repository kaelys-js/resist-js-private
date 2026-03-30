/**
 * Rule: workspace/no-empty-benchmarks-directory
 *
 * __benchmarks__ directories must contain at least one
 * benchmark file (matching *.benchmark.*).
 *
 * @module
 */

import { dirname, join } from 'node:path';
import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex to match benchmark file names. */
const BENCHMARK_FILE_RE: RegExp = /\.benchmark\./;

/** Flags __benchmarks__ directories that contain no benchmark files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-empty-benchmarks-directory',
  description: '__benchmarks__ directories must contain at least one benchmark file.',
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

    /** Collect all file paths in a single pass (allFiles is async iterable). */
    const allPaths: string[] = [];
    for await (const filePath of ctx.allFiles()) {
      allPaths.push(filePath);
    }

    /** Set of __benchmarks__ directories that exist (contain any file). */
    const benchDirsExist: Set<string> = new Set();

    /** Set of __benchmarks__ directories that contain at least one benchmark file. */
    const benchDirsWithBench: Set<string> = new Set();

    for (const filePath of allPaths) {
      if (!filePath.includes('/__benchmarks__/')) {
        continue;
      }

      /**
       * Extract the __benchmarks__ directory path from the file path.
       * For a path like /root/src/__benchmarks__/foo.benchmark.ts,
       * the directory is /root/src/__benchmarks__.
       */
      const benchIdx: number = filePath.indexOf('/__benchmarks__/');
      const benchDirPath: string = filePath.substring(0, benchIdx + '/__benchmarks__'.length);

      benchDirsExist.add(benchDirPath);

      const fileName: string = basename(filePath);
      if (BENCHMARK_FILE_RE.test(fileName)) {
        benchDirsWithBench.add(benchDirPath);
      }
    }

    /** Report __benchmarks__ directories that exist but have no benchmark files. */
    for (const benchDir of benchDirsExist) {
      if (!benchDirsWithBench.has(benchDir)) {
        const relativePath: string = relative(ctx.rootDir, benchDir);
        results.push(
          createResult(
            'workspace/no-empty-benchmarks-directory',
            benchDir,
            1,
            1,
            'error',
            `Empty test folder: ${relativePath}`,
            {
              tip: 'Either remove this folder or include a valid benchmark file',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
