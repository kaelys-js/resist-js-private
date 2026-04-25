/**
 * Rule: testing/require-e2e-location
 *
 * Enforces that E2E test files (`*.e2e.ts`) live under an `e2e/` or
 * `tests/e2e/` directory. Flags E2E files found elsewhere.
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult } from '@/lint/framework/types.ts';
import type { WorkspaceRule, LintResult } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching E2E test file names. */
const E2E_PATTERN: RegExp = /\.e2e\.(ts|tsx|js|jsx|mjs)$/;

/**
 * Check whether a file path contains an `e2e/` directory segment.
 *
 * @param {string} filePath - Absolute file path
 * @returns {boolean} True if the file is inside an e2e directory
 */
function isInE2eDir(filePath: string): boolean {
  return filePath.split('/').some((part: string): boolean => part === 'e2e');
}

/** The require-e2e-location lint rule. */
const rule: WorkspaceRule = {
  id: 'testing/require-e2e-location',
  description: 'E2E test files must live under e2e/ or tests/e2e/',
  scope: 'workspace',
  categories: ['testing'],
  stages: ['lint', 'ci'],
  fixable: false,

  /**
   * Check all workspace files for misplaced E2E tests.
   *
   * @param {unknown} context - The workspace context
   * @returns {Promise<LintResult[]>} Array of lint results
   */
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    return ctx.allFiles();
  },

  async check(context: unknown): Promise<LintResult[]> {
    const ctx: WorkspaceContext = context as WorkspaceContext;
    const results: LintResult[] = [];

    for (const file of await ctx.allFiles()) {
      const name: string = basename(file);
      if (E2E_PATTERN.test(name) && !isInE2eDir(file)) {
        results.push(
          createResult(
            'testing/require-e2e-location',
            file,
            1,
            1,
            'error',
            `E2E test '${name}' must be in an e2e/ or tests/e2e/ directory`,
            {
              tip: 'Move this file to an e2e/ or tests/e2e/ directory',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
