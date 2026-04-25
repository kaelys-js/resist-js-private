/**
 * Rule: workspace/no-orphaned-git-refs
 *
 * All git refs must point to valid, reachable objects.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags git refs that point to invalid or unreachable objects. */
const rule: WorkspaceRule = {
  id: 'workspace/no-orphaned-git-refs',
  description: 'All git refs must point to valid, reachable objects.',
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

    try {
      const refOutput: string = execSync("git for-each-ref --format='%(refname) %(objectname)'", {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      });

      const refLines: string[] = refOutput.split('\n').filter(Boolean);

      for (const line of refLines) {
        const parts: string[] = line.split(' ');
        const refname: string = parts[0] ?? '';
        const hash: string = parts[1] ?? '';

        if (!refname || !hash) {
          continue;
        }

        try {
          execSync('git cat-file -e ' + hash + '^{commit}', {
            cwd: ctx.rootDir,
            encoding: 'utf8',
          });
        } catch {
          results.push(
            createResult(
              'workspace/no-orphaned-git-refs',
              ctx.rootDir,
              1,
              1,
              'error',
              `Broken git ref: ${refname} → ${hash}`,
              {
                tip: 'Run git gc --prune=now to clean up orphaned refs',
              },
            ),
          );
        }
      }
    } catch {
      /* git not available — skip */
    }

    return results;
  },
};

export default rule;
