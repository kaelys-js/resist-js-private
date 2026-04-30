/**
 * Rule: workspace/require-vscode-valid-json
 *
 * Ensures .vscode/settings.json contains valid JSON.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates that .vscode/settings.json is parseable JSON. */
const rule: WorkspaceRule = {
  id: 'workspace/require-vscode-valid-json',
  description: '.vscode/settings.json must contain valid JSON.',
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
      if (!filePath.endsWith('.vscode/settings.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);

      try {
        JSON.parse(content);
      } catch {
        results.push(
          createResult(
            'workspace/require-vscode-valid-json',
            filePath,
            1,
            1,
            'error',
            'Invalid JSON syntax in .vscode/settings.json',
            {
              tip: 'Ensure the file uses valid JSON with double-quoted keys',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
