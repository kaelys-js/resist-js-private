/**
 * Rule: workspace/require-vscode-folder
 *
 * Ensures the project root has a `.vscode` directory.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Checks that .vscode directory exists at project root. */
const rule: WorkspaceRule = {
  id: 'workspace/require-vscode-folder',
  description: '.vscode directory must exist at project root.',
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
    const vscodePath: string = join(ctx.rootDir, '.vscode');

    const exists: boolean = await ctx.dirExists(vscodePath);
    if (exists) {
      return [];
    }

    return [
      createResult(
        'workspace/require-vscode-folder',
        vscodePath,
        1,
        1,
        'warning',
        'Missing .vscode directory at project root',
        {
          tip: 'Add a shared .vscode folder with workspace settings',
        },
      ),
    ];
  },
};

export default rule;
