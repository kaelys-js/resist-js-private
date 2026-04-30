/**
 * Rule: workspace/no-empty-files
 *
 * Files must not be empty, unless they are allowed placeholders
 * (.gitignore, .env, .keep, .gitkeep).
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Filenames that are allowed to be empty. */
const ALLOWED_EMPTY: ReadonlySet<string> = new Set(['.gitignore', '.env', '.keep', '.gitkeep']);

/** Flags files that are completely empty (0 bytes). */
const rule: WorkspaceRule = {
  id: 'workspace/no-empty-files',
  description: 'Files must not be empty unless they are allowed placeholders.',
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
      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content === '' && !ALLOWED_EMPTY.has(basename(filePath))) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-empty-files',
            filePath,
            1,
            1,
            'warning',
            `Unexpected empty file: ${relativePath}`,
            {
              tip: 'Remove unused placeholders or ensure files are properly generated',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
