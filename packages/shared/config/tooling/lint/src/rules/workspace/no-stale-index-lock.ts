/**
 * Rule: workspace/no-stale-index-lock
 *
 * No orphaned .git/index.lock files should exist.
 * These are left behind when a git process crashes or is killed.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags orphaned .git/index.lock files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-stale-index-lock',
  description: 'No orphaned .git/index.lock files should exist.',
  scope: 'workspace',
  categories: ['workspace', 'git'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule reads filesystem directly via node:fs (image/symlink inspection). */
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

    if (existsSync(join(ctx.rootDir, '.git', 'index.lock'))) {
      results.push(
        createResult(
          'workspace/no-stale-index-lock',
          ctx.rootDir,
          1,
          1,
          'error',
          'Orphaned .git/index.lock file detected',
          {
            tip: 'Remove it with: rm .git/index.lock (ensure no git process is running first)',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
