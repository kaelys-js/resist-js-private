/**
 * Rule: workspace/no-binary-files
 *
 * Binary files should not be committed to version control.
 *
 * @module
 */

import { extname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Extensions of binary files that should not be committed. */
const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  '.exe',
  '.bin',
  '.o',
  '.a',
  '.so',
  '.dll',
  '.dylib',
  '.class',
  '.jar',
  '.pyc',
]);

/** Flags binary files that should not be committed. */
const rule: WorkspaceRule = {
  id: 'workspace/no-binary-files',
  description: 'Binary files should not be committed to version control.',
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

    for (const filePath of await ctx.allFiles()) {
      const ext: string = extname(filePath);

      if (BINARY_EXTENSIONS.has(ext)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-binary-files',
            filePath,
            1,
            1,
            'error',
            `Binary file should not be committed: ${relativePath}`,
            {
              tip: 'Remove binary files from version control — build from source',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
