/**
 * Rule: workspace/no-migration-tempfiles
 *
 * Rejects temporary files (*.bak, *.tmp, *.swp, *~) inside migrations/ directories.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Temp file extensions to reject. */
const TEMP_EXTENSIONS: ReadonlyArray<string> = ['.bak', '.tmp', '.swp'];

/** Rejects temp files in migrations directories. */
const rule: WorkspaceRule = {
  id: 'workspace/no-migration-tempfiles',
  description: 'Migration directories must not contain temporary files.',
  scope: 'workspace',
  categories: ['workspace', 'migrations'],
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
      /* Only check files inside migrations/ directories. */
      if (!filePath.includes('/migrations/')) {
        continue;
      }

      const name: string = basename(filePath);

      /* Check for temp extensions. */
      const hasTempExt: boolean = TEMP_EXTENSIONS.some((ext: string): boolean =>
        name.endsWith(ext),
      );

      /* Check for ~ suffix (vim backup). */
      const hasTildeSuffix: boolean = name.endsWith('~');

      if (hasTempExt || hasTildeSuffix) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-migration-tempfiles',
            filePath,
            1,
            1,
            'error',
            `Temporary file '${name}' found in migrations directory: ${relativePath}`,
            {
              tip: 'Remove temporary files from migrations directories',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
