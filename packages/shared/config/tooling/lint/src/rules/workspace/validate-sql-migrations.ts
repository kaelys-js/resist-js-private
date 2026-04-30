/**
 * Rule: workspace/validate-sql-migrations
 *
 * Validates SQL migration files: ensures only .sql files exist in migrations/,
 * detects duplicate filenames, and checks for BOM markers.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** BOM byte sequence as string. */
const BOM: string = '\uFEFF';

/** Validates SQL migration files. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-sql-migrations',
  description: 'SQL migration files must be valid .sql without BOM or duplicates.',
  scope: 'workspace',
  categories: ['workspace', 'migrations'],
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

    /* Track migration filenames for duplicate detection. */
    const migrationNames: Map<string, string> = new Map();

    for (const filePath of await ctx.allFiles()) {
      if (!filePath.includes('/migrations/')) {
        continue;
      }

      const name: string = basename(filePath);
      const relativePath: string = relative(ctx.rootDir, filePath);

      /* Check for non-.sql files. */
      if (!name.endsWith('.sql')) {
        results.push(
          createResult(
            'workspace/validate-sql-migrations',
            filePath,
            1,
            1,
            'error',
            `Non-SQL file '${name}' found in migrations directory: ${relativePath}`,
            {
              tip: 'Only .sql files should exist in migrations/ directories',
            },
          ),
        );
        continue;
      }

      /* Check for duplicate names. */
      const existingPath: string | undefined = migrationNames.get(name);

      if (existingPath === undefined) {
        migrationNames.set(name, filePath);
      } else {
        const relExisting: string = relative(ctx.rootDir, existingPath);
        results.push(
          createResult(
            'workspace/validate-sql-migrations',
            filePath,
            1,
            1,
            'error',
            `Duplicate migration filename '${name}' in ${relativePath} — also exists at ${relExisting}`,
            {
              tip: 'Migration filenames must be unique across the project',
            },
          ),
        );
      }

      /* Check for BOM. */
      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.startsWith(BOM)) {
        results.push(
          createResult(
            'workspace/validate-sql-migrations',
            filePath,
            1,
            1,
            'error',
            `BOM (byte order mark) detected in ${relativePath} — use UTF-8 without BOM`,
            {
              tip: 'Remove the BOM from the beginning of the file',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
