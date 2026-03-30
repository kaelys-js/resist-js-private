/**
 * Rule: workspace/no-unlinked-workspace-deps
 *
 * Workspace dependencies must reference actual workspace packages.
 * Checks all package.json files for dependencies using the workspace:
 * protocol and verifies they match a real workspace package name.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Dependency field keys to check in package.json. */
const DEP_FIELDS: readonly string[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/** Validates workspace: protocol deps reference actual workspace packages. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unlinked-workspace-deps',
  description: 'Workspace dependencies must reference actual workspace packages.',
  scope: 'workspace',
  categories: ['workspace', 'dependencies'],
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

    /* Build a set of all workspace package names */
    const workspacePackages: Awaited<ReturnType<typeof ctx.getWorkspacePackages>> =
      await ctx.getWorkspacePackages();
    const packageNames: Set<string> = new Set();
    for (const pkg of workspacePackages) {
      if (typeof pkg.name === 'string') {
        packageNames.add(pkg.name);
      }
    }

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);

      if (name !== 'package.json') {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let pkg: Record<string, unknown>;
      try {
        pkg = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      for (const field of DEP_FIELDS) {
        const deps: unknown = pkg[field];
        if (typeof deps !== 'object' || deps === null) {
          continue;
        }

        const depsObj: Record<string, unknown> = deps as Record<string, unknown>;
        for (const depName of Object.keys(depsObj)) {
          const version: unknown = depsObj[depName];
          if (typeof version !== 'string') {
            continue;
          }

          if (version.startsWith('workspace:') && !packageNames.has(depName)) {
            results.push(
              createResult(
                'workspace/no-unlinked-workspace-deps',
                filePath,
                1,
                1,
                'error',
                `Workspace dependency '${depName}' does not match any workspace package in ${relativePath}`,
                {
                  tip: `Check that '${depName}' is listed as a package in pnpm-workspace.yaml and has a matching "name" field`,
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
