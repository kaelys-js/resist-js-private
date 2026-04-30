/**
 * Rule: workspace/no-tracked-env-files
 *
 * .env files must not be tracked in git (except .env.example).
 * Detects committed .env files that may contain secrets or
 * environment-specific configuration.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags .env files tracked in git (excluding .env.example). */
const rule: WorkspaceRule = {
  id: 'workspace/no-tracked-env-files',
  description: '.env files must not be tracked in git (except .env.example).',
  scope: 'workspace',
  categories: ['workspace', 'git', 'safety'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
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

    let output: string;

    try {
      output = execSync('git ls-files', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    const files = output.split('\n').filter(Boolean);

    for (const file of files) {
      if (/^\.env($|\..*)/.test(file) && file !== '.env.example') {
        results.push(
          createResult(
            'workspace/no-tracked-env-files',
            file,
            1,
            1,
            'error',
            `Committed .env file detected: ${file}`,
            {
              tip: 'Do not commit real .env files — use .env.example and .gitignore instead',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
