/**
 * Rule: workspace/no-unsafe-global-gitconfig
 *
 * Global git configuration must not contain dangerous settings.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags dangerous global git configuration settings. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unsafe-global-gitconfig',
  description: 'Global git configuration must not contain dangerous settings.',
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

    const BLACKLIST: ReadonlyArray<readonly [string, string]> = [
      ['push.default', 'matching'],
      ['core.autocrlf', 'true'],
      ['core.ignorecase', 'true'],
    ] as const;

    for (const [key, badValue] of BLACKLIST) {
      try {
        const value: string = execSync('git config --global --get ' + key, {
          cwd: ctx.rootDir,
          encoding: 'utf8',
        }).trim();

        if (value === badValue) {
          results.push(
            createResult(
              'workspace/no-unsafe-global-gitconfig',
              ctx.rootDir,
              1,
              1,
              'warning',
              `Unsafe global git config: ${key} = ${badValue}`,
              {
                tip: `Run 'git config --global --unset ${key}' or set a safer value`,
              },
            ),
          );
        }
      } catch {
        /* not set — safe */
      }
    }

    return results;
  },
};

export default rule;
