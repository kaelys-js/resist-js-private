/**
 * Rule: workspace/no-excess-trailing-newlines
 *
 * Source files must not end with 3 or more consecutive newlines.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** File extensions to check for excess trailing newlines. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.js',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.svelte',
  '.css',
  '.html',
]);

/** Flags files that end with 3+ consecutive newlines. */
const rule: WorkspaceRule = {
  id: 'workspace/no-excess-trailing-newlines',
  description: 'Source files must not end with excess trailing newlines.',
  scope: 'workspace',
  categories: ['workspace', 'encoding'],
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
      /* Check extension */
      const lastDot: number = filePath.lastIndexOf('.');
      if (lastDot < 0) {
        continue;
      }
      const ext: string = filePath.slice(lastDot);
      if (!SOURCE_EXTENSIONS.has(ext)) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.endsWith('\n\n\n')) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-excess-trailing-newlines',
            filePath,
            1,
            1,
            'warning',
            `File has excess trailing newlines: ${relativePath}`,
            {
              tip: 'Ensure files end with exactly one newline',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
