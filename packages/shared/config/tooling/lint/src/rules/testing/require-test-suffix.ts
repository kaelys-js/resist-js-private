/**
 * Rule: testing/require-test-suffix
 *
 * Enforces that all test files use the `*.test.ts` naming convention.
 * Flags files using `*.spec.ts`, `*-test.ts`, or `*_test.ts` suffixes.
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult } from '@/lint/framework/types.ts';
import type { WorkspaceRule, LintResult } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns matching non-standard test file suffixes. */
const BAD_SUFFIX_PATTERNS: readonly RegExp[] = [
  /\.spec\.(ts|tsx|js|jsx|mjs)$/,
  /-test\.(ts|tsx|js|jsx|mjs)$/,
  /_test\.(ts|tsx|js|jsx|mjs)$/,
];

/** The require-test-suffix lint rule. */
const rule: WorkspaceRule = {
  id: 'testing/require-test-suffix',
  description: 'Test files must use *.test.ts naming',
  scope: 'workspace',
  categories: ['testing'],
  stages: ['lint', 'ci'],
  fixable: false,

  /**
   * Check all workspace files for non-standard test file suffixes.
   *
   * @param {unknown} context - The workspace context
   * @returns {Promise<LintResult[]>} Array of lint results
   */
  async check(context: unknown): Promise<LintResult[]> {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: LintResult[] = [];

    for await (const file of ctx.allFiles()) {
      const name: string = basename(file);
      if (BAD_SUFFIX_PATTERNS.some((p: RegExp): boolean => p.test(name))) {
        results.push(
          createResult(
            'testing/require-test-suffix',
            file,
            1,
            1,
            'error',
            `Test file '${name}' must use *.test.ts naming convention`,
            {
              tip: `Rename to ${name.replace(/\.(spec|-test|_test)\./, '.test.')}`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
