/**
 * Rule: workspace/validate-package-entrypoints
 *
 * Verifies that declared package.json entrypoints (main, module, exports) resolve to existing files.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Collects all string leaf values from an exports object recursively. */
function collectExportPaths(obj: unknown, paths: string[]): void {
  if (typeof obj === 'string') {
    paths.push(obj);
    return;
  }

  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      collectExportPaths(value, paths);
    }
  }
}

/** Verifies package.json entrypoints resolve to existing files. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-package-entrypoints',
  description:
    'Verifies that declared package.json entrypoints (main, module, exports) resolve to existing files.',
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
      const pkgDir: string = dirname(filePath);

      for (const key of ['main', 'module'] as const) {
        const entryValue: unknown = parsed[key];
        if (typeof entryValue === 'string' && entryValue.length > 0) {
          const resolvedPath: string = join(pkgDir, entryValue);
          const exists: boolean = await ctx.fileExists(resolvedPath);
          if (!exists) {
            results.push(
              createResult(
                'workspace/validate-package-entrypoints',
                filePath,
                1,
                1,
                'error',
                `Missing ${key} entry file "${entryValue}" in ${relativePath}`,
                {
                  tip: `Ensure the file "${entryValue}" exists relative to the package directory`,
                },
              ),
            );
          }
        }
      }

      const exportsValue: unknown = parsed.exports;
      if (exportsValue !== undefined && exportsValue !== null) {
        const exportPaths: string[] = [];
        collectExportPaths(exportsValue, exportPaths);

        for (const exportPath of exportPaths) {
          if (exportPath.startsWith('./')) {
            const resolvedPath: string = join(pkgDir, exportPath);
            const exists: boolean = await ctx.fileExists(resolvedPath);
            if (!exists) {
              results.push(
                createResult(
                  'workspace/validate-package-entrypoints',
                  filePath,
                  1,
                  1,
                  'error',
                  `Invalid export path "${exportPath}" in ${relativePath} — file does not exist`,
                  {
                    tip: `Ensure the file "${exportPath}" exists relative to the package directory`,
                  },
                ),
              );
            }
          }
        }
      }
    }

    return results;
  },
};

export default rule;
