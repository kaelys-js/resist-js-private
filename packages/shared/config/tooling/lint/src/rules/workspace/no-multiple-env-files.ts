/**
 * Rule: workspace/no-multiple-env-files
 *
 * Detects multiple .env.* files at the workspace root beyond .env.example.
 *
 * @module
 */

import { basename, dirname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Allowed .env file names. */
const ALLOWED_ENV_FILES: ReadonlySet<string> = new Set<string>([
  '.env',
  '.env.example',
  '.env.template',
]);

/** Detects extra .env files at root. */
const rule: WorkspaceRule = {
  id: 'workspace/no-multiple-env-files',
  description: 'Workspace root should not have multiple .env.* files.',
  scope: 'workspace',
  categories: ['workspace', 'config'],
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
      const name: string = basename(filePath);
      const relDir: string = dirname(relative(ctx.rootDir, filePath));

      /* Only check root-level files. */
      if (relDir !== '.') {
        continue;
      }

      /* Only check .env* files. */
      if (!name.startsWith('.env')) {
        continue;
      }

      if (!ALLOWED_ENV_FILES.has(name)) {
        results.push(
          createResult(
            'workspace/no-multiple-env-files',
            filePath,
            1,
            1,
            'warning',
            `Extra environment file '${name}' at workspace root — may cause confusion`,
            {
              tip: 'Use .env and .env.example only; load env-specific values from a secret manager',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
