/**
 * Rule: workspace/no-tests-directory
 *
 * Workspace must not contain __tests__/ or tests/ directories.
 * Test files should be colocated with source files.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Directory segments that indicate a centralized tests directory. */
const TEST_DIR_PATTERNS: readonly string[] = ['/__tests__/', '/tests/'];

/** Flags files inside centralized test directories. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tests-directory',
  description:
    'Workspace must not contain __tests__/ or tests/ directories. Test files should be colocated with source files.',
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
      const isInTestDir: boolean = TEST_DIR_PATTERNS.some((pattern: string): boolean =>
        filePath.includes(pattern),
      );

      if (isInTestDir) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-tests-directory',
            filePath,
            1,
            1,
            'error',
            `File inside centralized test directory: ${relativePath}`,
            {
              tip: 'Colocate test files next to source files (e.g., foo.test.ts next to foo.ts)',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
