/**
 * Rule: workspace/no-leftover-sqlite
 *
 * Detect leftover Wrangler D1 SQLite artifacts (.wrangler/state/*.sqlite*)
 * that are transient local dev artifacts and should never be committed.
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Matches paths containing .wrangler/state/ directory. */
const WRANGLER_STATE_RE: RegExp = /[/\\]\.wrangler[/\\]state[/\\]/;

/** Matches filenames containing .sqlite (covers .sqlite, .sqlite-wal, .sqlite-shm). */
const SQLITE_RE: RegExp = /\.sqlite/;

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-leftover-sqlite',
  description: 'Detect leftover Wrangler D1 SQLite artifacts (.wrangler/state/*.sqlite*)',
  scope: 'workspace',
  categories: ['workspace', 'cloudflare'],
  stages: ['lint', 'ci'],
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      const inWranglerState: boolean = WRANGLER_STATE_RE.test(filePath);
      const isSqlite: boolean = SQLITE_RE.test(name);

      if (inWranglerState && isSqlite) {
        results.push(
          createResult(
            'workspace/no-leftover-sqlite',
            filePath,
            1,
            1,
            'warning',
            `Leftover Wrangler SQLite artifact: ${name}`,
            {
              tip: 'Remove .wrangler/state/ artifacts before commit or CI',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
