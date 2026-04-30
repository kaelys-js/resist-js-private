/**
 * Rule: workspace/pr-branch-commit-mismatch
 *
 * Branch name prefix must appear in commit messages.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Branches that are exempt from prefix matching. */
const EXEMPT_BRANCHES: ReadonlySet<string> = new Set([
  'main',
  'master',
  'develop',
  'staging',
  'production',
]);

/** Branch name prefix must appear in commit messages. */
const rule: WorkspaceRule = {
  id: 'workspace/pr-branch-commit-mismatch',
  description: 'Branch name prefix must appear in commit messages.',
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

    const sourceBranch: string | undefined = process.env['MR_SOURCE_BRANCH'];

    if (sourceBranch === undefined) {
      return Promise.resolve(results);
    }

    const commits: string | undefined = process.env['MR_COMMITS'];

    if (commits === undefined) {
      return Promise.resolve(results);
    }

    if (EXEMPT_BRANCHES.has(sourceBranch)) {
      return Promise.resolve(results);
    }

    const [prefix]: string[] = sourceBranch.split(/[/-]/);

    if (prefix === undefined || prefix === '') {
      return Promise.resolve(results);
    }

    const commitMessages: string[] = commits.split('\n').filter(Boolean);
    const prefixPattern: RegExp = new RegExp(`${prefix}[:(]`);

    for (const message of commitMessages) {
      if (!prefixPattern.test(message)) {
        results.push(
          createResult(
            'workspace/pr-branch-commit-mismatch',
            ctx.rootDir,
            1,
            1,
            'error',
            `Commit message does not match branch prefix '${prefix}': "${message}"`,
            {
              tip: `Commit messages should start with '${prefix}:' or '${prefix}(' to match the branch name`,
            },
          ),
        );
        break;
      }
    }

    return Promise.resolve(results);
  },
};

export default rule;
