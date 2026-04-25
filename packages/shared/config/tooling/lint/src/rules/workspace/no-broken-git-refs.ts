/**
 * Rule: workspace/no-broken-git-refs
 *
 * Git HEAD must resolve and all references must be valid.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags broken git references and unresolvable HEAD. */
const rule: WorkspaceRule = {
  id: 'workspace/no-broken-git-refs',
  description: 'Git HEAD must resolve and all references must be valid.',
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
      try {
        execSync('git rev-parse --verify HEAD', {
          cwd: ctx.rootDir,
          encoding: 'utf8',
        });
      } catch {
        results.push(
          createResult(
            'workspace/no-broken-git-refs',
            ctx.rootDir,
            1,
            1,
            'error',
            'HEAD does not resolve to a valid commit',
            {
              tip: 'Verify your .git directory is intact and HEAD points to a valid ref',
            },
          ),
        );
      }

      try {
        const fsckOutput: string = execSync('git fsck --no-reflogs --no-progress 2>&1', {
          cwd: ctx.rootDir,
          encoding: 'utf8',
        });

        const fsckLines: string[] = fsckOutput.split('\n');
        for (const line of fsckLines) {
          if (line.includes('broken') || line.includes('dangling') || line.includes('missing')) {
            results.push(
              createResult(
                'workspace/no-broken-git-refs',
                ctx.rootDir,
                1,
                1,
                'error',
                `Git fsck issue: ${line.trim()}`,
                {
                  tip: 'Run git fsck and git gc to repair the repository',
                },
              ),
            );
          }
        }
      } catch {
        /* fsck failed — skip */
      }
    } catch {
      /* git not available — skip */
    }

    return results;
  },
};

export default rule;
