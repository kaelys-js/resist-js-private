/**
 * Rule: workspace/no-commitlint-config
 *
 * Workspace must not contain Commitlint config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Commitlint config filenames that are forbidden. */
const COMMITLINT_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  '.commitlintrc',
  '.commitlintrc.json',
  '.commitlintrc.js',
  '.commitlintrc.cjs',
  'commitlint.config.js',
  'commitlint.config.cjs',
]);

/** Flags Commitlint config files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-commitlint-config',
  description: 'Workspace must not contain Commitlint config files.',
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
      if (COMMITLINT_CONFIG_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-commitlint-config',
            filePath,
            1,
            1,
            'error',
            `Commitlint config file found: ${relativePath}`,
            {
              tip: 'Remove Commitlint config — use the project approved commit strategy.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
