/**
 * Rule: workspace/no-commit-scope-mismatch
 *
 * Commit message scope should match branch name.
 * Detects when the conventional commit scope in the last commit
 * does not appear as a substring of the current branch name.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags when commit scope does not match the branch name. */
const rule: WorkspaceRule = {
  id: 'workspace/no-commit-scope-mismatch',
  description: 'Commit message scope should match branch name.',
  scope: 'workspace',
  categories: ['workspace', 'git'],
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

    let branch: string;
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (branch === 'main' || branch === 'master' || branch === 'HEAD') {
      return results;
    }

    let subject: string;
    try {
      subject = execSync('git log -1 --pretty=%s', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    const match = /^[a-z]+\(([^)]+)\)/.exec(subject);
    if (!match) {
      return results;
    }

    const scope = match[1] ?? '';

    if (!branch.includes(scope)) {
      results.push(
        createResult(
          'workspace/no-commit-scope-mismatch',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Commit scope "${scope}" does not match branch "${branch}"`,
          {
            tip: 'Align scope with the feature slug in your branch name',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
