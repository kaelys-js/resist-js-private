/**
 * Rule: workspace/enforce-conventional-commits
 *
 * Commit messages must follow the Conventional Commits format.
 * This ensures a consistent and parseable commit history
 * for changelogs and automated versioning.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates that recent commit messages follow Conventional Commits format. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-conventional-commits',
  description: 'Commit messages must follow Conventional Commits format.',
  scope: 'workspace',
  categories: ['workspace', 'git', 'naming'],
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

    let logOutput: string;
    try {
      logOutput = execSync("git log --pretty=format:'%h %s' -30", {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      });
    } catch {
      return results;
    }

    const lines: string[] = logOutput.split('\n').filter((line: string) => line.trim() !== '');
    const conventionalPattern: RegExp =
      /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([a-z0-9._-]+\))?: .+/;

    for (const line of lines) {
      const spaceIdx: number = line.indexOf(' ');
      if (spaceIdx === -1) {
        continue;
      }

      const hash: string = line.slice(0, spaceIdx);
      const msg: string = line.slice(spaceIdx + 1);

      if (!conventionalPattern.test(msg)) {
        results.push(
          createResult(
            'workspace/enforce-conventional-commits',
            ctx.rootDir,
            1,
            1,
            'error',
            `Invalid commit message format: ${hash} — ${msg}`,
            {
              tip: 'Use Conventional Commits: type(scope): description',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
