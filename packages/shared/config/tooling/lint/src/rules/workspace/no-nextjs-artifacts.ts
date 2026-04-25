/**
 * Rule: workspace/no-nextjs-artifacts
 *
 * Workspace must not contain Next.js configuration or build artifacts.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Next.js config filenames that are forbidden. */
const NEXTJS_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  'next.config.js',
  'next.config.ts',
  'next.config.mjs',
  'next-env.d.ts',
]);

/** Flags Next.js artifacts in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-nextjs-artifacts',
  description: 'Workspace must not contain Next.js configuration or build artifacts.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
      const relativePath: string = relative(ctx.rootDir, filePath);
      const isBlocked: boolean = NEXTJS_CONFIG_NAMES.has(name) || relativePath.includes('/.next/');

      if (isBlocked) {
        results.push(
          createResult(
            'workspace/no-nextjs-artifacts',
            filePath,
            1,
            1,
            'error',
            `Next.js artifact not allowed: ${relativePath}`,
            {
              tip: 'Remove Next.js files — use SvelteKit or the approved framework',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
