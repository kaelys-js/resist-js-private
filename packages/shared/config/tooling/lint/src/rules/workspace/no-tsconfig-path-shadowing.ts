/**
 * Rule: workspace/no-tsconfig-path-shadowing
 *
 * Path aliases in tsconfig must not shadow well-known node_modules packages.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of well-known packages that path aliases must not shadow. */
const SHADOWED_PACKAGES: ReadonlySet<string> = new Set<string>([
  'react',
  'vite',
  'next',
  'vue',
  'svelte',
  'express',
]);

/** Detects tsconfig path aliases that shadow well-known node_modules packages. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-path-shadowing',
  description: 'Path aliases in tsconfig must not shadow well-known node_modules packages.',
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
      const paths: Record<string, unknown> = (compilerOptions.paths ?? {}) as Record<
        string,
        unknown
      >;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const key of Object.keys(paths)) {
        const stripped: string = key.replace(/\/\*$/, '');
        const isShadowed: boolean =
          SHADOWED_PACKAGES.has(stripped) ||
          stripped === '@types' ||
          stripped.startsWith('@types/');

        if (isShadowed) {
          results.push(
            createResult(
              'workspace/no-tsconfig-path-shadowing',
              filePath,
              1,
              1,
              'warning',
              `Path alias "${key}" may shadow node_modules package in ${relativePath}`,
              {
                tip: `Avoid aliasing names that match core packages — use "@internal/${stripped}" instead`,
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
