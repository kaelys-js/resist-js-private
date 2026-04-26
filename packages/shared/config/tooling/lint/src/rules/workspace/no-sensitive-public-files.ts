/**
 * Rule: workspace/no-sensitive-public-files
 *
 * Blocks sensitive files (.env, .sql, .bak) from being placed in
 * public/ directories.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Sensitive file extensions that must not appear in public directories. */
const SENSITIVE_EXTENSIONS: readonly string[] = ['.env', '.sql', '.bak'];

/** Flags sensitive files found inside public/ directories. */
const rule: WorkspaceRule = {
  id: 'workspace/no-sensitive-public-files',
  description: 'Blocks sensitive files in public/ directories.',
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
      if (!filePath.includes('/public/')) {
        continue;
      }

      const fileName: string = basename(filePath);

      const isSensitive: boolean = SENSITIVE_EXTENSIONS.some((ext: string): boolean =>
        fileName.endsWith(ext),
      );

      if (isSensitive) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-sensitive-public-files',
            filePath,
            1,
            1,
            'error',
            `Sensitive file in public directory: ${relativePath}`,
            {
              tip: 'Never expose .env, .sql, or .bak files inside public/',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
