/**
 * Rule: workspace/require-scoped-package-names
 *
 * All package.json files must declare a scoped package name.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching a valid scoped package name. */
const SCOPED_NAME_PATTERN: RegExp = /^@[^/]+\/[^/]+$/;

/** Ensures all package.json files declare a scoped package name. */
const rule: WorkspaceRule = {
  id: 'workspace/require-scoped-package-names',
  description: 'All package.json files must declare a scoped package name.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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
      const name: string = basename(filePath);
      if (name !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);
      const packageName: unknown = parsed.name;

      if (packageName === undefined || typeof packageName !== 'string') {
        results.push(
          createResult(
            'workspace/require-scoped-package-names',
            filePath,
            1,
            1,
            'error',
            `Missing 'name' field in ${relativePath}`,
            {
              tip: 'Use scoped names like "@my-company/foo"',
            },
          ),
        );
        continue;
      }

      if (!SCOPED_NAME_PATTERN.test(packageName)) {
        results.push(
          createResult(
            'workspace/require-scoped-package-names',
            filePath,
            1,
            1,
            'error',
            `Unscoped or invalid package name in ${relativePath}: "${packageName}"`,
            {
              tip: 'Use scoped names like "@my-company/foo"',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
