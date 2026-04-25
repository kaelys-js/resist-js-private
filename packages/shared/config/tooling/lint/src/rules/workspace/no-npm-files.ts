/**
 * Rule: workspace/no-npm-files
 *
 * Workspace must not contain npm-related files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of npm artifact filenames that are forbidden. */
const NPM_FILE_NAMES: ReadonlySet<string> = new Set<string>([
  '.npmrc',
  '.npmignore',
  '.npm-package.json',
  'npm-debug.log',
]);

/** Flags npm artifact files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-npm-files',
  description: 'Workspace must not contain npm-related files.',
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
      if (NPM_FILE_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-npm-files',
            filePath,
            1,
            1,
            'error',
            `npm artifact found: ${relativePath}`,
            {
              tip: 'Remove npm files — this project uses pnpm exclusively.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
