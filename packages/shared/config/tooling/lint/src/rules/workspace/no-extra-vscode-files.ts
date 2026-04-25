/**
 * Rule: workspace/no-extra-vscode-files
 *
 * Only settings.json and extensions.json are allowed in .vscode/.
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of allowed filenames inside .vscode/. */
const ALLOWED_FILES: ReadonlySet<string> = new Set<string>(['settings.json', 'extensions.json']);

/** Flags disallowed files inside the .vscode directory. */
const rule: WorkspaceRule = {
  id: 'workspace/no-extra-vscode-files',
  description: '.vscode directory may only contain settings.json and extensions.json.',
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
      if (!filePath.includes('/.vscode/')) {
        continue;
      }

      const filename: string = basename(filePath);
      if (!ALLOWED_FILES.has(filename)) {
        results.push(
          createResult(
            'workspace/no-extra-vscode-files',
            filePath,
            1,
            1,
            'error',
            `Disallowed file in .vscode/: ${filename} — only settings.json and extensions.json should be tracked`,
            {
              tip: 'Remove this file or add it to .gitignore',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
