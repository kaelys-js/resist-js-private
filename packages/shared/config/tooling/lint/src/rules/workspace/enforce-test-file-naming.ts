/**
 * Rule: workspace/enforce-test-file-naming
 *
 * Test files must live in __tests__/ directories and use .test.ts(x) naming.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Source file extensions to check. */
const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx'];

/** Regex to match test file basenames. */
const TEST_FILE_PATTERN: RegExp = /\.test\.tsx?$/;

/** Test files must be in __tests__/ and use .test.ts(x) naming. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-test-file-naming',
  description: 'Test files must be in __tests__/ directories with .test.ts(x) naming.',
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
      const hasSourceExt: boolean = SOURCE_EXTENSIONS.some((ext: string): boolean =>
        filePath.endsWith(ext),
      );

      if (!hasSourceExt) {
        continue;
      }

      const fileName: string = basename(filePath);
      const isTestFile: boolean = TEST_FILE_PATTERN.test(fileName);
      const isInTestsDir: boolean = filePath.includes('/__tests__/');
      const relativePath: string = relative(ctx.rootDir, filePath);

      /* Check 1: test file not in __tests__/ directory */
      if (isTestFile && !isInTestsDir) {
        results.push(
          createResult(
            'workspace/enforce-test-file-naming',
            filePath,
            1,
            1,
            'error',
            `Test file not in __tests__ directory: ${relativePath}`,
            {
              tip: 'Move test files to __tests__/ and use .test.ts(x) naming',
            },
          ),
        );
      }

      /* Check 2: file in __tests__/ but not using .test.ts(x) naming */
      if (isInTestsDir && !isTestFile) {
        results.push(
          createResult(
            'workspace/enforce-test-file-naming',
            filePath,
            1,
            1,
            'error',
            `File in __tests__ must use .test.ts(x) naming: ${fileName}`,
            {
              tip: 'Move test files to __tests__/ and use .test.ts(x) naming',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
