/**
 * Rule: workspace/require-vscode-settings
 *
 * Ensures .vscode/settings.json exists in the workspace root.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Requires .vscode/settings.json to exist. */
const rule: WorkspaceRule = {
  id: 'workspace/require-vscode-settings',
  description: '.vscode/settings.json must exist for consistent editor configuration.',
  scope: 'workspace',
  categories: ['workspace', 'editor'],
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
    const settingsPath: string = join(ctx.rootDir, '.vscode', 'settings.json');

    const exists: boolean = await ctx.fileExists(settingsPath);
    if (!exists) {
      return [
        createResult(
          'workspace/require-vscode-settings',
          settingsPath,
          1,
          1,
          'error',
          'Missing .vscode/settings.json — required for consistent editor configuration',
          {
            tip: 'Create .vscode/settings.json with shared editor settings for the workspace',
          },
        ),
      ];
    }

    return [];
  },
};

export default rule;
