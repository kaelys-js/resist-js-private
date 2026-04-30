/**
 * Rule: workspace/require-type-field
 *
 * Ensures sibling workspace packages (grouped by their parent directory
 * two levels above package.json) use a consistent "type" field value.
 *
 * @module
 */

import { dirname } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

/** Flags inconsistent "type" fields among sibling workspace packages. */
const rule: WorkspaceRule = {
  id: 'workspace/require-type-field',
  description: 'Sibling workspace packages must use a consistent "type" field value.',
  scope: 'workspace',
  categories: ['package', 'consistency'],
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

    /* Group packages by their parent directory two levels above package.json.
       e.g. /workspace/packages/shared/foo/package.json → dir = /workspace/packages/shared/foo
            dirname(dir) = /workspace/packages/shared → group key */
    const groups: Map<string, WorkspacePackage[]> = new Map();

    for (const pkg of packages) {
      const groupKey: string = dirname(pkg.dir);
      const group: WorkspacePackage[] | undefined = groups.get(groupKey);

      if (group) {
        group.push(pkg);
      } else {
        groups.set(groupKey, [pkg]);
      }
    }

    for (const [_groupKey, groupPkgs] of groups) {
      if (groupPkgs.length < 2) {
        continue;
      }

      const types: Set<string> = new Set<string>();

      for (const pkg of groupPkgs) {
        const typeValue: string =
          typeof pkg.packageJson.type === 'string' ? pkg.packageJson.type : 'commonjs';
        types.add(typeValue);
      }

      if (types.size > 1) {
        for (const pkg of groupPkgs) {
          const typeValue: string =
            typeof pkg.packageJson.type === 'string' ? pkg.packageJson.type : 'commonjs';
          results.push(
            createResult(
              'workspace/require-type-field',
              pkg.path,
              1,
              1,
              'error',
              `Inconsistent "type" field: "${typeValue}" (group has mixed types)`,
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
