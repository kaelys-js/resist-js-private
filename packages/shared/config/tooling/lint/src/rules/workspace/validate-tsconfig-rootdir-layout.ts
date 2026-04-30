/**
 * Rule: workspace/validate-tsconfig-rootdir-layout
 *
 * Warns when compilerOptions.rootDir in tsconfig.json points outside
 * standard layout directories (src/, packages/, apps/).
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Standard rootDir values that are acceptable. */
const STANDARD_ROOTDIRS: readonly string[] = [
  'src',
  'src/',
  './src',
  './src/',
  'packages',
  'packages/',
  './packages',
  './packages/',
  'apps',
  'apps/',
  './apps',
  './apps/',
  '.',
  './',
];

/** Warns when rootDir is outside standard layout directories. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-tsconfig-rootdir-layout',
  description: 'TSConfig rootDir should reference standard layout directories.',
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

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let parsed: Record<string, unknown>;

      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      const { compilerOptions } = parsed;

      if (typeof compilerOptions !== 'object' || compilerOptions === null) {
        continue;
      }

      const options: Record<string, unknown> = compilerOptions as Record<string, unknown>;
      const { rootDir } = options;

      if (typeof rootDir !== 'string') {
        continue;
      }

      const isStandard: boolean = STANDARD_ROOTDIRS.some(
        (standard: string): boolean => rootDir === standard,
      );

      if (!isStandard) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/validate-tsconfig-rootdir-layout',
            filePath,
            1,
            1,
            'warning',
            `Non-standard rootDir '${rootDir}' in ${relativePath} — expected src/, packages/, or apps/`,
            {
              tip: 'Use src/, packages/, apps/, or . as rootDir',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
