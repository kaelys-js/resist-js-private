/**
 * Rule: workspace/no-large-files
 *
 * Source files should not exceed 1000 lines.
 *
 * @module
 */

import { extname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Source file extensions to check for line count. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.js',
  '.svelte',
  '.css',
  '.json',
  '.yaml',
  '.yml',
  '.md',
]);

/** Maximum number of lines allowed in a source file. */
const MAX_LINES: number = 1000;

/** Flags source files that exceed 1000 lines. */
const rule: WorkspaceRule = {
  id: 'workspace/no-large-files',
  description: 'Source files should not exceed 1000 lines.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    for await (const filePath of ctx.allFiles()) {
      const ext: string = extname(filePath);

      if (!SOURCE_EXTENSIONS.has(ext)) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lineCount: number = content.split('\n').length;

      if (lineCount > MAX_LINES) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-large-files',
            filePath,
            1,
            1,
            'warning',
            `File exceeds 1000 lines (${String(lineCount)} lines): ${relativePath}`,
            {
              tip: 'Consider breaking large files into smaller modules',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
