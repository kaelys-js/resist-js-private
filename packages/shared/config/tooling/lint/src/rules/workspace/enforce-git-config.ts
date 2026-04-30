/**
 * Rule: workspace/enforce-git-config
 *
 * Git configuration must match project policy.
 * Checks core.autocrlf, pull.rebase, and push.default settings.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Enforces required git configuration values. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-git-config',
  description: 'Git configuration must match project policy.',
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

    const REQUIRED_CONFIG: ReadonlyArray<readonly [string, string]> = [
      ['core.autocrlf', 'input'],
      ['pull.rebase', 'false'],
      ['push.default', 'simple'],
    ] as const;

    for (const [key, expected] of REQUIRED_CONFIG) {
      let actual: string;

      try {
        actual = execSync(`git config --get ${key}`, { cwd: ctx.rootDir, encoding: 'utf8' }).trim();
      } catch {
        actual = '<unset>';
      }

      if (actual !== expected) {
        results.push(
          createResult(
            'workspace/enforce-git-config',
            ctx.rootDir,
            1,
            1,
            'error',
            `Git config ${key} = '${actual}' (expected: '${expected}')`,
            {
              tip: `Set via: git config --global ${key} '${expected}'`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
