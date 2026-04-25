/**
 * Rule: workspace/no-empty-tests-directory
 *
 * __tests__ directories must contain at least one test file
 * (matching *.test.* or *.spec.*).
 *
 * @module
 */

import { dirname, join } from 'node:path';
import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex to match test file names. */
const TEST_FILE_RE: RegExp = /\.(test|spec)\./;

/** Flags __tests__ directories that contain no test files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-empty-tests-directory',
  description: '__tests__ directories must contain at least one test file.',
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

    /** Collect all file paths in a single pass (allFiles is async iterable). */
    const allPaths: string[] = [];
    for (const filePath of await ctx.allFiles()) {
      allPaths.push(filePath);
    }

    /** Set of __tests__ directories that exist (contain any file). */
    const testsDirsExist: Set<string> = new Set();

    /** Set of __tests__ directories that contain at least one test file. */
    const testsDirsWithTests: Set<string> = new Set();

    for (const filePath of allPaths) {
      if (!filePath.includes('/__tests__/')) {
        continue;
      }

      /**
       * Extract the __tests__ directory path from the file path.
       * For a path like /root/src/__tests__/nested/foo.ts, the __tests__
       * directory is /root/src/__tests__.
       */
      const testsIdx: number = filePath.indexOf('/__tests__/');
      const testsDirPath: string = filePath.substring(0, testsIdx + '/__tests__'.length);

      testsDirsExist.add(testsDirPath);

      const fileName: string = basename(filePath);
      if (TEST_FILE_RE.test(fileName)) {
        testsDirsWithTests.add(testsDirPath);
      }
    }

    /** Report __tests__ directories that exist but have no test files. */
    for (const testsDir of testsDirsExist) {
      if (!testsDirsWithTests.has(testsDir)) {
        const relativePath: string = relative(ctx.rootDir, testsDir);
        results.push(
          createResult(
            'workspace/no-empty-tests-directory',
            testsDir,
            1,
            1,
            'error',
            `Empty test folder: ${relativePath}`,
            {
              tip: 'Either remove this folder or add a valid test file',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
