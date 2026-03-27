/**
 * Rule: workspace/no-skipped-tests
 *
 * Test files must not contain skipped or focused tests
 * (.skip, .only, .todo).
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex to detect skipped/focused/todo test calls. */
const SKIPPED_TEST_REGEX: RegExp = /(describe|it|test)\.(skip|only|todo)\(/;

/** Flags test files containing skipped or focused tests. */
const rule: WorkspaceRule = {
  id: 'workspace/no-skipped-tests',
  description: 'Test files must not contain skipped or focused tests.',
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

    for await (const filePath of ctx.allFiles()) {
      if (!filePath.endsWith('.test.ts')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (SKIPPED_TEST_REGEX.test(content)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-skipped-tests',
            filePath,
            1,
            1,
            'error',
            `Skipped or focused test found: ${relativePath}`,
            {
              tip: 'Remove .skip/.only/.todo before committing — all tests should run',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
