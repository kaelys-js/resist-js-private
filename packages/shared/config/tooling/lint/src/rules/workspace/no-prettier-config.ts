/**
 * Rule: workspace/no-prettier-config
 *
 * Workspace must not contain Prettier config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Prettier config filenames that are forbidden. */
const PRETTIER_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierrc.toml',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  'prettier.config.ts',
  '.prettierignore',
]);

/** Flags Prettier config files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-prettier-config',
  description: 'Workspace must not contain Prettier config files.',
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      if (PRETTIER_CONFIG_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-prettier-config',
            filePath,
            1,
            1,
            'error',
            `Prettier config file found: ${relativePath}`,
            {
              tip: 'Remove Prettier config — this project uses Biome for formatting instead.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
