/**
 * Rule: workspace/tsconfig-paths-resolve
 *
 * Verifies each compilerOptions.paths value resolves to an existing file or directory.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Verifies tsconfig path aliases resolve to existing locations. */
const rule: WorkspaceRule = {
  id: 'workspace/tsconfig-paths-resolve',
  description:
    'Verifies each compilerOptions.paths value resolves to an existing file or directory.',
  scope: 'workspace',
  categories: ['workspace', 'tsconfig'],
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

      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;
      const relativePath: string = relative(ctx.rootDir, filePath);
      const configDir: string = dirname(filePath);

      const { paths } = compilerOptions;

      if (paths === undefined || paths === null || typeof paths !== 'object') {
        continue;
      }

      const pathEntries: Record<string, unknown> = paths as Record<string, unknown>;

      for (const aliasKey of Object.keys(pathEntries)) {
        const values: unknown = pathEntries[aliasKey];

        if (!Array.isArray(values)) {
          continue;
        }

        for (const value of values) {
          if (typeof value !== 'string') {
            continue;
          }

          const stripped: string = value.replace(/\*$/, '').replace(/\/$/, '');

          if (stripped === '') {
            continue;
          }

          const resolvedPath: string = join(configDir, stripped);
          const dirExists: boolean = await ctx.dirExists(resolvedPath);
          const fileExists: boolean = await ctx.fileExists(resolvedPath);

          if (!dirExists && !fileExists) {
            results.push(
              createResult(
                'workspace/tsconfig-paths-resolve',
                filePath,
                1,
                1,
                'error',
                `Path alias "${aliasKey}" does not resolve: "${value}" in ${relativePath}`,
                {
                  tip: `Ensure the path "${stripped}" exists relative to the tsconfig file`,
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
