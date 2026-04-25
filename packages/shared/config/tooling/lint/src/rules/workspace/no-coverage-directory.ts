/**
 * Rule: workspace/no-coverage-directory
 *
 * Workspace must not contain coverage/ directories.
 * Coverage output should be excluded via .gitignore and never committed.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

/** Flags coverage/ directories in the workspace root and all packages. */
const rule: WorkspaceRule = {
  id: 'workspace/no-coverage-directory',
  description: 'Workspace must not contain coverage/ directories. Add coverage/ to .gitignore.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    try {
      const packages = await ctx.getWorkspacePackages();
      return packages.map((p) => p.path);
    } catch {
      return [];
    }
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

    const rootCoveragePath: string = join(ctx.rootDir, 'coverage');
    const rootExists: boolean = await ctx.dirExists(rootCoveragePath);

    if (rootExists) {
      results.push(
        createResult(
          'workspace/no-coverage-directory',
          rootCoveragePath,
          1,
          1,
          'error',
          `Coverage directory found at workspace root: coverage/`,
          {
            tip: 'Add coverage/ to .gitignore and delete the directory',
          },
        ),
      );
    }

    const packages: WorkspacePackage[] = await ctx.getWorkspacePackages();

    for (const pkg of packages) {
      const pkgCoveragePath: string = join(pkg.dir, 'coverage');
      const pkgExists: boolean = await ctx.dirExists(pkgCoveragePath);

      if (pkgExists) {
        results.push(
          createResult(
            'workspace/no-coverage-directory',
            pkgCoveragePath,
            1,
            1,
            'error',
            `Coverage directory found in package: ${pkg.dir}/coverage`,
            {
              tip: 'Add coverage/ to .gitignore and delete the directory',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
