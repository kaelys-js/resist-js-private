/**
 * Rule: workspace/no-mixed-indentation
 *
 * Source files must not mix tabs and spaces for indentation.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** File extensions to check for mixed indentation. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.js',
  '.json',
  '.yaml',
  '.yml',
  '.svelte',
  '.css',
  '.html',
]);

/** Pattern matching a line that starts with tab(s) followed by space(s). */
const MIXED_INDENT_RE: RegExp = /^\t+ +/;

/** Flags files with mixed tab and space indentation. */
const rule: WorkspaceRule = {
  id: 'workspace/no-mixed-indentation',
  description: 'Source files must not mix tabs and spaces for indentation.',
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

      const lines: string[] = content.split('\n');
      let hasMixed: boolean = false;

      for (const line of lines) {
        if (MIXED_INDENT_RE.test(line)) {
          hasMixed = true;
          break;
        }
      }

      if (hasMixed) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-mixed-indentation',
            filePath,
            1,
            1,
            'error',
            `Mixed tab and space indentation: ${relativePath}`,
            {
              tip: 'Use either all spaces or all tabs — never mix them',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
