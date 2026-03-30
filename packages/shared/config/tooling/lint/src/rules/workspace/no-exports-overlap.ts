/**
 * Rule: workspace/no-exports-overlap
 *
 * Ensures no two package.json files define the same resolved export path.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Detects overlapping export paths across workspace packages. */
const rule: WorkspaceRule = {
  id: 'workspace/no-exports-overlap',
  description: 'No two packages may define the same resolved export path.',
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

    /* Pass 1: Collect all package.json file paths. */
    const packageJsonPaths: string[] = [];
    for (const filePath of await ctx.allFiles()) {
      const fileName: string = basename(filePath);
      if (fileName === 'package.json') {
        packageJsonPaths.push(filePath);
      }
    }

    /* Pass 2: Parse each package.json, extract exports, detect conflicts. */
    const exportMap: Map<string, string> = new Map<string, string>();

    for (const pkgPath of packageJsonPaths) {
      const content: string = await ctx.readFile(pkgPath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const name: unknown = parsed.name;
      const exports: unknown = parsed.exports;

      if (typeof name !== 'string' || exports === undefined || exports === null) {
        continue;
      }

      if (typeof exports !== 'object' || Array.isArray(exports)) {
        continue;
      }

      const exportsRecord: Record<string, unknown> = exports as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, pkgPath);

      for (const exportKey of Object.keys(exportsRecord)) {
        const resolvedPath: string = name + '/' + exportKey;
        const existing: string | undefined = exportMap.get(resolvedPath);

        if (existing !== undefined) {
          results.push(
            createResult(
              'workspace/no-exports-overlap',
              pkgPath,
              1,
              1,
              'error',
              `Export path conflict: ${resolvedPath} defined in both ${existing} and ${relativePath}`,
              {
                tip: 'Rename exports or isolate via scoped export keys',
              },
            ),
          );
        } else {
          exportMap.set(resolvedPath, relativePath);
        }
      }
    }

    return results;
  },
};

export default rule;
