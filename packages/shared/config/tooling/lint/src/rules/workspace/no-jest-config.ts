/**
 * Rule: workspace/no-jest-config
 *
 * Workspace must not contain Jest config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Jest config filenames that are forbidden. */
const JEST_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  'jest.config.js',
  'jest.config.cjs',
  'jest.config.mjs',
  'jest.config.ts',
  'jest.config.json',
  'jest.setup.js',
  'jest.setup.ts',
]);

/** Flags Jest config files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-jest-config',
  description: 'Workspace must not contain Jest config files.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (JEST_CONFIG_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-jest-config',
            filePath,
            1,
            1,
            'error',
            `Jest config file found: ${relativePath}`,
            {
              tip: 'Remove Jest config — this project uses Vitest instead.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
