/**
 * Rule: workspace/no-yarn-files
 *
 * Workspace must not contain Yarn-related files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Yarn artifact filenames that are forbidden. */
const YARN_FILE_NAMES: ReadonlySet<string> = new Set<string>([
  'yarn.lock',
  '.yarnrc',
  '.yarnrc.yml',
  '.yarnrc.yaml',
  '.yarnrc.json',
  '.yarnignore',
  'yarn-error.log',
  'yarn-debug.log',
  'install-state.gz',
]);

/** Flags Yarn artifact files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-yarn-files',
  description: 'Workspace must not contain Yarn-related files.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

      if (YARN_FILE_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-yarn-files',
            filePath,
            1,
            1,
            'error',
            `Yarn artifact found: ${relativePath}`,
            {
              tip: 'Remove Yarn files — this project uses pnpm exclusively.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
