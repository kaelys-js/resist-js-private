/**
 * Rule: workspace/no-env-files
 *
 * Workspace must not contain committed .env files with real secrets.
 * .env.example and .env.template are allowed.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Basenames that are explicitly safe (templates/examples). */
const ALLOWED_ENV_BASENAMES: ReadonlySet<string> = new Set(['.env.example', '.env.template']);

/**
 * Returns true if the given basename is a flagged env file.
 * Flags: .env (bare), .env.local, .env.production, .env.development,
 * .env.staging, .env.test, and any other .env.* variant not in the allow-list.
 */
function isFlaggedEnvFile(name: string): boolean {
  if (ALLOWED_ENV_BASENAMES.has(name)) {
    return false;
  }
  if (name === '.env') {
    return true;
  }
  if (name.startsWith('.env.')) {
    return true;
  }
  return false;
}

/** Flags committed .env files that likely contain real secrets. */
const rule: WorkspaceRule = {
  id: 'workspace/no-env-files',
  description: 'Workspace must not contain committed .env files with real secrets.',
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
      const name: string = basename(filePath);

      if (isFlaggedEnvFile(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-env-files',
            filePath,
            1,
            1,
            'error',
            `Committed .env file found: ${relativePath}`,
            {
              tip: 'Add to .gitignore and use .env.example for documentation',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
