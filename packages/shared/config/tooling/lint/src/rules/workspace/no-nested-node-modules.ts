/**
 * Rule: workspace/no-nested-node-modules
 *
 * Workspace packages must not have their own node_modules directories.
 *
 * @module
 */

import { join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

/** Flags workspace packages that have their own node_modules directory. */
const rule: WorkspaceRule = {
  id: 'workspace/no-nested-node-modules',
  description: 'Workspace packages must not have their own node_modules directories.',
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

    const packages: WorkspacePackage[] = await ctx.getWorkspacePackages();

    for (const pkg of packages) {
      const nodeModulesPath: string = join(pkg.dir, 'node_modules');
      const exists: boolean = await ctx.dirExists(nodeModulesPath);

      if (exists) {
        const relativePath: string = relative(ctx.rootDir, nodeModulesPath);
        results.push(
          createResult(
            'workspace/no-nested-node-modules',
            pkg.path,
            1,
            1,
            'error',
            `Nested node_modules found: ${relativePath}`,
            {
              tip: 'Delete the nested node_modules directory and run pnpm install from the workspace root.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
