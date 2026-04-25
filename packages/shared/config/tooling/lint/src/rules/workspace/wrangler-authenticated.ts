/**
 * Rule: workspace/wrangler-authenticated
 *
 * Wrangler CLI must be authenticated via wrangler login.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Wrangler CLI must be authenticated via wrangler login. */
const rule: WorkspaceRule = {
  id: 'workspace/wrangler-authenticated',
  description: 'Wrangler CLI must be authenticated via wrangler login.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
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

    try {
      execSync('wrangler whoami', { cwd: ctx.rootDir, stdio: 'pipe' });
    } catch {
      results.push(
        createResult(
          'workspace/wrangler-authenticated',
          ctx.rootDir,
          1,
          1,
          'warning',
          'Wrangler is not authenticated with Cloudflare',
          {
            tip: "Run 'wrangler login' to authenticate and link your account",
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
