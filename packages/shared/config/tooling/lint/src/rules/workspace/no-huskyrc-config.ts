/**
 * Rule: workspace/no-huskyrc-config
 *
 * Workspace must not contain inline Husky config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of inline Husky config filenames that are forbidden. */
const HUSKYRC_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  '.huskyrc',
  '.huskyrc.js',
  '.huskyrc.json',
]);

/** Flags inline Husky config files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-huskyrc-config',
  description: 'Workspace must not contain inline Husky config files.',
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
      if (HUSKYRC_CONFIG_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-huskyrc-config',
            filePath,
            1,
            1,
            'error',
            `Inline Husky config file found: ${relativePath}`,
            {
              tip: 'Remove inline Husky config — use .husky/ folder with shell script hooks instead.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
