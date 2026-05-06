/**
 * Rule: testing/require-integration-location
 *
 * Enforces that integration test files (`*.integration.ts`) are either
 * placed in `tests/integration/` or colocated with source files
 * (i.e., the same directory contains non-test `.ts` files).
 *
 * @module
 */

import { basename, dirname, join } from 'node:path';

import {
  createResult,
  type FileOpFix,
  type WorkspaceRule,
  type LintResult,
} from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching integration test file names. */
const INTEGRATION_PATTERN: RegExp = /\.integration\.(ts|tsx|js|jsx|mjs)$/;

/** Pattern matching any test file (test, spec, e2e, integration). */
const TEST_FILE_PATTERN: RegExp = /\.(test|spec|e2e|integration)\./;

/** The require-integration-location lint rule. */
const rule: WorkspaceRule = {
  id: 'testing/require-integration-location',
  description: 'Integration test files must be in tests/integration/ or colocated with source',
  scope: 'workspace',
  categories: ['testing'],
  stages: ['lint', 'ci'],
  fixable: true,

  /**
   * Check all workspace files for misplaced integration tests.
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
    const allFiles: string[] = [];
    const dirFiles: Map<string, string[]> = new Map();

    for (const file of await ctx.allFiles()) {
      allFiles.push(file);
      const dir: string = dirname(file);
      const existing: string[] = dirFiles.get(dir) ?? [];
      existing.push(file);
      dirFiles.set(dir, existing);
    }

    for (const file of allFiles) {
      const name: string = basename(file);

      if (!INTEGRATION_PATTERN.test(name)) {
        continue;
      }
      if (file.includes('/tests/integration/')) {
        continue;
      }

      const dir: string = dirname(file);
      const siblings: string[] = dirFiles.get(dir) ?? [];
      let hasSource: boolean = false;

      for (const sibling of siblings) {
        const sibName: string = basename(sibling);

        if (sibName.endsWith('.ts') && !TEST_FILE_PATTERN.test(sibName) && sibling !== file) {
          hasSource = true;
          break;
        }
      }

      if (hasSource) {
        continue;
      }

      /* Move to tests/integration/ at the workspace root */
      const destPath: string = join(ctx.rootDir, 'tests', 'integration', name);
      const fileOp: FileOpFix = { type: 'move', from: file, to: destPath };

      results.push(
        createResult(
          'testing/require-integration-location',
          file,
          1,
          1,
          'warning',
          `Integration test '${name}' should be in tests/integration/ or colocated with source`,
          {
            tip: 'Move to tests/integration/ or place next to the source file it tests',
            fileOp,
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
