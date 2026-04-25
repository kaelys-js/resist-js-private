/**
 * Rule: workspace/no-broken-git-head
 *
 * .git/HEAD must point to a valid reference or commit.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags broken or missing .git/HEAD references. */
const rule: WorkspaceRule = {
  id: 'workspace/no-broken-git-head',
  description: '.git/HEAD must point to a valid reference or commit.',
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

    const headPath: string = join(ctx.rootDir, '.git', 'HEAD');

    if (!existsSync(headPath)) {
      results.push(
        createResult(
          'workspace/no-broken-git-head',
          ctx.rootDir,
          1,
          1,
          'error',
          'Missing .git/HEAD file',
          {
            tip: 'Re-initialize the repository with git init or restore from a backup',
          },
        ),
      );
      return results;
    }

    const content: string = readFileSync(headPath, 'utf8').trim();

    if (content.startsWith('ref: ')) {
      const ref: string = content.slice(5);
      if (!existsSync(join(ctx.rootDir, '.git', ref))) {
        results.push(
          createResult(
            'workspace/no-broken-git-head',
            ctx.rootDir,
            1,
            1,
            'error',
            `HEAD points to non-existent ref: ${ref}`,
            {
              tip: 'The branch reference is missing — create it or checkout an existing branch',
            },
          ),
        );
      }
    } else {
      try {
        execSync('git cat-file -e ' + content + '^{commit}', {
          cwd: ctx.rootDir,
          encoding: 'utf8',
        });
      } catch {
        results.push(
          createResult(
            'workspace/no-broken-git-head',
            ctx.rootDir,
            1,
            1,
            'error',
            `Detached HEAD points to invalid commit: ${content}`,
            {
              tip: 'Checkout a valid branch or commit to fix the detached HEAD state',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
