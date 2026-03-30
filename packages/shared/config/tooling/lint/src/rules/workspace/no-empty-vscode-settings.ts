/**
 * Rule: workspace/no-empty-vscode-settings
 *
 * Ensures .vscode/settings.json is not empty when it exists.
 * If the file is missing, this rule skips (handled by require-vscode-settings).
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags empty .vscode/settings.json files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-empty-vscode-settings',
  description: '.vscode/settings.json must not be empty.',
  scope: 'workspace',
  categories: ['workspace', 'editor'],
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
    const settingsPath: string = join(ctx.rootDir, '.vscode', 'settings.json');

    const exists: boolean = await ctx.fileExists(settingsPath);
    if (!exists) {
      return [];
    }

    const content: string = await ctx.readFile(settingsPath);
    if (content.trim().length === 0) {
      return [
        createResult(
          'workspace/no-empty-vscode-settings',
          settingsPath,
          1,
          1,
          'error',
          '.vscode/settings.json exists but is empty — add editor configuration or remove the file',
          {
            tip: 'Add shared editor settings (e.g. formatOnSave, tabSize) or remove the file',
          },
        ),
      ];
    }

    return [];
  },
};

export default rule;
