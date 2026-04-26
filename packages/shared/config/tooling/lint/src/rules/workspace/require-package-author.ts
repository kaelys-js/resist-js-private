/**
 * Rule: workspace/require-package-author
 *
 * All package.json files must declare an author field.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures all package.json files declare an author field. */
const rule: WorkspaceRule = {
  id: 'workspace/require-package-author',
  description: 'All package.json files must declare an author field.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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
      const fileName: string = basename(filePath);
      if (fileName !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      const { author } = parsed;
      let hasValidAuthor: boolean = false;

      if (typeof author === 'string' && author.trim().length > 0) {
        hasValidAuthor = true;
      } else if (author !== null && typeof author === 'object') {
        const authorObj: Record<string, unknown> = author as Record<string, unknown>;
        if (typeof authorObj.name === 'string' && authorObj.name.trim().length > 0) {
          hasValidAuthor = true;
        }
      }

      if (!hasValidAuthor) {
        results.push(
          createResult(
            'workspace/require-package-author',
            filePath,
            1,
            1,
            'error',
            `Missing or invalid "author" in ${relativePath}`,
            {
              tip: 'Add an "author" field — e.g. "author": "Your Name" or "author": { "name": "Your Name" }',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
