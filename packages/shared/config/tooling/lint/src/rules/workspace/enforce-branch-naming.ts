/**
 * Rule: workspace/enforce-branch-naming
 *
 * Branch names must use standard prefixes
 * (feature/, fix/, hotfix/, chore/, release/, test/, docs/).
 * This ensures consistent branch naming across the project.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Enforces standard branch naming conventions. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-branch-naming',
  description:
    'Branch names must use standard prefixes (feature/, fix/, hotfix/, chore/, release/, test/, docs/).',
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

    let branch: string;

    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (!branch || branch === 'HEAD') {
      return results;
    }

    if (branch === 'main' || branch === 'master') {
      return results;
    }

    const validPattern: RegExp = /^(feature|fix|hotfix|chore|release|test|docs)\/.+$/;

    if (!validPattern.test(branch)) {
      results.push(
        createResult(
          'workspace/enforce-branch-naming',
          ctx.rootDir,
          1,
          1,
          'error',
          `Branch '${branch}' does not follow naming convention`,
          {
            tip: 'Use a valid prefix: feature/, fix/, hotfix/, chore/, release/, test/, docs/',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
