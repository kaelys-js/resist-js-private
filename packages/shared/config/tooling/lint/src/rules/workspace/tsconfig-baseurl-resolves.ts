/**
 * Rule: workspace/tsconfig-baseurl-resolves
 *
 * compilerOptions.baseUrl must resolve to an existing directory.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Tsconfig filenames to check. */
const TSCONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  'tsconfig.json',
  'tsconfig.base.json',
]);

/** Ensures compilerOptions.baseUrl resolves to an existing directory. */
const rule: WorkspaceRule = {
  id: 'workspace/tsconfig-baseurl-resolves',
  description: 'compilerOptions.baseUrl must resolve to an existing directory.',
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
      if (!TSCONFIG_NAMES.has(name)) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;
      const relativePath: string = relative(ctx.rootDir, filePath);
      const { baseUrl } = compilerOptions;

      if (typeof baseUrl !== 'string' || baseUrl === '') {
        continue;
      }

      const resolvedPath: string = join(dirname(filePath), baseUrl);
      const dirExists: boolean = await ctx.dirExists(resolvedPath);

      if (!dirExists) {
        results.push(
          createResult(
            'workspace/tsconfig-baseurl-resolves',
            filePath,
            1,
            1,
            'error',
            `baseUrl "${baseUrl}" in ${relativePath} does not resolve to a directory`,
            {
              tip: 'Ensure the baseUrl folder exists relative to its tsconfig',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
