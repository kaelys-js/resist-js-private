/**
 * Rule: workspace/validate-db-name-safety
 *
 * D1 database names must be shell-safe identifiers.
 * Checks wrangler.json / wrangler.jsonc for database_name values
 * that do not match the safe pattern ^[a-zA-Z][a-zA-Z0-9_-]*$.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Wrangler config filenames to check. */
const WRANGLER_FILES: ReadonlySet<string> = new Set(['wrangler.json', 'wrangler.jsonc']);

/** Pattern for shell-safe database names. */
const SAFE_DB_NAME_PATTERN: RegExp = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/**
 * Extract d1_databases entries from a config object.
 *
 * @param {Record<string, unknown>} obj - Parsed config object
 * @returns {unknown[]} Array of d1_databases entries
 */
function getD1Databases(obj: Record<string, unknown>): unknown[] {
  const val: unknown = obj.d1_databases;
  return Array.isArray(val) ? (val as unknown[]) : [];
}

/** Validates D1 database names are shell-safe identifiers. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-db-name-safety',
  description: 'D1 database names must be shell-safe identifiers.',
  scope: 'workspace',
  categories: ['workspace', 'wrangler'],
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
      const name: string = basename(filePath);

      if (!WRANGLER_FILES.has(name)) {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let config: Record<string, unknown>;
      try {
        config = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      /* Check top-level d1_databases */
      for (const item of getD1Databases(config)) {
        const entry: Record<string, unknown> = item as Record<string, unknown>;
        if (
          typeof entry.database_name === 'string' &&
          !SAFE_DB_NAME_PATTERN.test(entry.database_name)
        ) {
          results.push(
            createResult(
              'workspace/validate-db-name-safety',
              filePath,
              1,
              1,
              'error',
              `Database name '${entry.database_name}' is not shell-safe — must match ^[a-zA-Z][a-zA-Z0-9_-]*$ in ${relativePath}`,
              {
                tip: 'Use only letters, digits, hyphens, and underscores; start with a letter',
              },
            ),
          );
        }
      }

      /* Check env-level d1_databases */
      const env: unknown = config.env;
      if (typeof env === 'object' && env !== null) {
        const envObj: Record<string, unknown> = env as Record<string, unknown>;
        for (const envName of Object.keys(envObj)) {
          const envConfig: unknown = envObj[envName];
          if (typeof envConfig === 'object' && envConfig !== null) {
            for (const item of getD1Databases(envConfig as Record<string, unknown>)) {
              const entry: Record<string, unknown> = item as Record<string, unknown>;
              if (
                typeof entry.database_name === 'string' &&
                !SAFE_DB_NAME_PATTERN.test(entry.database_name)
              ) {
                results.push(
                  createResult(
                    'workspace/validate-db-name-safety',
                    filePath,
                    1,
                    1,
                    'error',
                    `Database name '${entry.database_name}' is not shell-safe — must match ^[a-zA-Z][a-zA-Z0-9_-]*$ in ${relativePath} (env: ${envName})`,
                    {
                      tip: 'Use only letters, digits, hyphens, and underscores; start with a letter',
                    },
                  ),
                );
              }
            }
          }
        }
      }
    }

    return results;
  },
};

export default rule;
