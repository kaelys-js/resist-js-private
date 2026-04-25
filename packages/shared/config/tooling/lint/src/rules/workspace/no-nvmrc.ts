/**
 * Rule: workspace/no-nvmrc
 *
 * Workspace must not contain .nvmrc or .node-version files.
 * Node version is managed via package.json engines or volta.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Basenames that indicate an nvm/node-version pin file. */
const FLAGGED_BASENAMES: ReadonlySet<string> = new Set(['.nvmrc', '.node-version']);

/** Flags .nvmrc and .node-version files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-nvmrc',
  description: 'Workspace must not contain .nvmrc or .node-version files.',
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

      if (FLAGGED_BASENAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-nvmrc',
            filePath,
            1,
            1,
            'error',
            `Node version pin file found: ${relativePath}`,
            {
              tip: 'Use package.json "engines" field or volta to pin Node version instead',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
