/**
 * Rule: workspace/no-git-stdin-in-ci
 *
 * Interactive git editors must not be configured.
 * Detects when core.editor or sequence.editor is set to an interactive editor
 * like vim or nano, which would block CI pipelines.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags when interactive git editors are configured. */
const rule: WorkspaceRule = {
  id: 'workspace/no-git-stdin-in-ci',
  description: 'Interactive git editors must not be configured.',
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

    for (const key of ['core.editor', 'sequence.editor'] as const) {
      let value: string;

      try {
        value = execSync(`git config --global --get ${key}`, {
          cwd: ctx.rootDir,
          encoding: 'utf8',
        }).trim();
      } catch {
        continue;
      }

      if (/vim|nano/i.test(value)) {
        results.push(
          createResult(
            'workspace/no-git-stdin-in-ci',
            ctx.rootDir,
            1,
            1,
            'warning',
            `Interactive git editor configured: ${key} = ${value}`,
            {
              tip: "Set editor to 'true' for non-interactive usage",
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
