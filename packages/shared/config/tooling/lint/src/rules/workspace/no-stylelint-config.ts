/**
 * Rule: workspace/no-stylelint-config
 *
 * Workspace must not contain Stylelint config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Stylelint config filenames that are forbidden. */
const STYLELINT_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  '.stylelintrc',
  '.stylelintrc.json',
  '.stylelintrc.yaml',
  '.stylelintrc.yml',
  '.stylelintrc.js',
  'stylelint.config.js',
  'stylelint.config.cjs',
]);

/** Flags Stylelint config files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-stylelint-config',
  description: 'Workspace must not contain Stylelint config files.',
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
      if (STYLELINT_CONFIG_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-stylelint-config',
            filePath,
            1,
            1,
            'error',
            `Stylelint config file found: ${relativePath}`,
            {
              tip: 'Remove Stylelint config — this project uses Biome for formatting.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
