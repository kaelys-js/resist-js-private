/**
 * Rule: workspace/require-lockfile
 *
 * Ensures pnpm-lock.yaml exists and is well-formed.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/require-lockfile',
  description: 'pnpm-lock.yaml must exist and contain a valid lockfileVersion.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
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
    const lockfilePath: string = join(ctx.rootDir, 'pnpm-lock.yaml');

    const exists: boolean = await ctx.fileExists(lockfilePath);
    if (!exists) {
      return [
        createResult(
          'workspace/require-lockfile',
          lockfilePath,
          1,
          1,
          'error',
          'Missing pnpm-lock.yaml — required for deterministic installs',
          {
            tip: 'Run "pnpm install" to generate a lockfile',
          },
        ),
      ];
    }

    const content: string = await ctx.readFile(lockfilePath);
    if (content.trim().length === 0 || !content.includes('lockfileVersion')) {
      return [
        createResult(
          'workspace/require-lockfile',
          lockfilePath,
          1,
          1,
          'error',
          'pnpm-lock.yaml appears malformed — missing lockfileVersion',
          {
            tip: 'Delete pnpm-lock.yaml and run "pnpm install" to regenerate',
          },
        ),
      ];
    }

    return [];
  },
};

export default rule;
