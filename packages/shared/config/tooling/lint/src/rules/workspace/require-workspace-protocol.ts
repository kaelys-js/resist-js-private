/**
 * Rule: workspace/require-workspace-protocol
 *
 * Internal workspace dependencies must use the workspace:* protocol.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Dependency fields to check. */
const DEP_FIELDS: readonly string[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
] as const;

/** Internal workspace dependencies must use workspace:* protocol. */
const rule: WorkspaceRule = {
  id: 'workspace/require-workspace-protocol',
  description: 'Internal workspace dependencies must use the workspace:* protocol.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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

    const workspacePackages: Awaited<ReturnType<typeof ctx.getWorkspacePackages>> =
      await ctx.getWorkspacePackages();
    const workspaceNames: Set<string> = new Set<string>(
      workspacePackages
        .map((pkg) => pkg.name)
        .filter((n: string | undefined): n is string => typeof n === 'string'),
    );

    for (const filePath of await ctx.allFiles()) {
      const fileName: string = basename(filePath);
      if (fileName !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const field of DEP_FIELDS) {
        const deps: unknown = parsed[field];
        if (deps === undefined || deps === null || typeof deps !== 'object') {
          continue;
        }

        const depEntries: Record<string, unknown> = deps as Record<string, unknown>;

        for (const [depName, depVersion] of Object.entries(depEntries)) {
          if (typeof depVersion !== 'string') {
            continue;
          }

          if (workspaceNames.has(depName) && !depVersion.startsWith('workspace:')) {
            results.push(
              createResult(
                'workspace/require-workspace-protocol',
                filePath,
                1,
                1,
                'error',
                `Internal dependency "${depName}" in ${field} of ${relativePath} must use "workspace:*" — found "${depVersion}"`,
                {
                  tip: `Change "${depName}": "${depVersion}" to "${depName}": "workspace:*"`,
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
