/**
 * Rule: workspace/valid-bin-targets
 *
 * Ensures every bin target listed in a workspace package's package.json
 * actually exists on disk.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

/** Flags bin entries that reference missing files. */
const rule: WorkspaceRule = {
  id: 'workspace/valid-bin-targets',
  description: 'Every bin target in package.json must point to an existing file.',
  scope: 'workspace',
  categories: ['package', 'safety'],
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
      const bin: unknown = pkg.packageJson.bin;

      if (bin === undefined || bin === null) {
        continue;
      }

      if (typeof bin === 'string') {
        const resolvedPath: string = join(pkg.dir, bin);
        const exists: boolean = await ctx.fileExists(resolvedPath);
        if (!exists) {
          results.push(
            createResult(
              'workspace/valid-bin-targets',
              pkg.path,
              1,
              1,
              'error',
              `Missing bin target in ${pkg.path}: "${bin}" does not exist`,
            ),
          );
        }
        continue;
      }

      if (typeof bin === 'object') {
        const binMap: Record<string, unknown> = bin as Record<string, unknown>;
        for (const [_name, binPath] of Object.entries(binMap)) {
          if (typeof binPath !== 'string') {
            continue;
          }
          const resolvedPath: string = join(pkg.dir, binPath);
          const exists: boolean = await ctx.fileExists(resolvedPath);
          if (!exists) {
            results.push(
              createResult(
                'workspace/valid-bin-targets',
                pkg.path,
                1,
                1,
                'error',
                `Missing bin target in ${pkg.path}: "${binPath}" does not exist`,
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
