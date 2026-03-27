/**
 * Rule: workspace/no-babel-config
 *
 * Workspace must not contain Babel config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Babel config filenames that are forbidden. */
const BABEL_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  '.babelrc',
  '.babelrc.json',
  '.babelrc.js',
  'babel.config.js',
  'babel.config.cjs',
]);

/** Flags Babel config files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-babel-config',
  description: 'Workspace must not contain Babel config files.',
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
      if (BABEL_CONFIG_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-babel-config',
            filePath,
            1,
            1,
            'error',
            `Babel config file found: ${relativePath}`,
            {
              tip: 'Remove Babel config — this project uses native ESM and Biome.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
