/**
 * Rule: workspace/pr-no-merge-commits
 *
 * PR must not contain merge commits — rebase instead.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns indicating a merge commit message. */
const MERGE_PATTERNS: ReadonlyArray<RegExp> = [/^Merge branch /, /^Merge remote-tracking /];

/** PR must not contain merge commits — rebase instead. */
const rule: WorkspaceRule = {
  id: 'workspace/pr-no-merge-commits',
  description: 'PR must not contain merge commits — rebase instead.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on CI environment variables (process.env). */
  check(context: unknown): Promise<
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

    const commits: string | undefined = process.env['MR_COMMITS'];
    if (commits === undefined) {
      return Promise.resolve(results);
    }

    const commitMessages: Array<string> = commits.split('\n').filter(Boolean);

    for (const message of commitMessages) {
      const isMergeCommit: boolean = MERGE_PATTERNS.some((p: RegExp) => p.test(message));
      if (isMergeCommit) {
        results.push(
          createResult(
            'workspace/pr-no-merge-commits',
            ctx.rootDir,
            1,
            1,
            'error',
            `Merge commit detected: "${message}"`,
            {
              tip: 'Rebase to remove merge commits before merging the PR',
            },
          ),
        );
      }
    }

    return Promise.resolve(results);
  },
};

export default rule;
