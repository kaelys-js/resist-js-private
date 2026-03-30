/**
 * Rule: workspace/validate-makefiles
 *
 * Checks Makefiles for CRLF line endings and spaces-instead-of-tabs
 * in recipe lines.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates Makefile syntax. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-makefiles',
  description: 'Makefiles must use tabs for recipes and LF line endings.',
  scope: 'workspace',
  categories: ['workspace', 'build'],
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
      if (name !== 'Makefile' && name !== 'makefile' && !name.endsWith('.mk')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);

      /* Check for CRLF line endings. */
      if (content.includes('\r\n')) {
        results.push(
          createResult(
            'workspace/validate-makefiles',
            filePath,
            1,
            1,
            'error',
            `Makefile ${relativePath} uses CRLF line endings — must use LF`,
            {
              tip: 'Convert line endings to LF (Unix-style)',
            },
          ),
        );
      }

      /* Check for spaces instead of tabs in recipe lines. */
      const lines: string[] = content.split('\n');
      let inRecipe: boolean = false;

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        /* A recipe line follows a target: line and starts with tab or spaces. */
        if (line.match(/^[a-zA-Z0-9_.%-]+\s*:/) !== null) {
          inRecipe = true;
          continue;
        }

        if (inRecipe) {
          if (line.startsWith('    ') && !line.startsWith('\t')) {
            results.push(
              createResult(
                'workspace/validate-makefiles',
                filePath,
                i + 1,
                1,
                'error',
                `Makefile ${relativePath} line ${String(i + 1)} uses spaces instead of tab in recipe`,
                {
                  tip: 'Makefile recipes must use a leading tab character, not spaces',
                },
              ),
            );
          }

          if (line.trim().length === 0) {
            inRecipe = false;
          }
        }
      }
    }

    return results;
  },
};

export default rule;
