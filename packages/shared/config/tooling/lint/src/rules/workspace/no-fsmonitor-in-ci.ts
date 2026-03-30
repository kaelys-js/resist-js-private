/**
 * Rule: workspace/no-fsmonitor-in-ci
 *
 * Git fsmonitor must not be enabled (causes issues in CI).
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags core.fsmonitor being enabled. */
const rule: WorkspaceRule = {
  id: 'workspace/no-fsmonitor-in-ci',
  description: 'Git fsmonitor must not be enabled (causes issues in CI).',
  scope: 'workspace',
  categories: ['workspace', 'git'],
  stages: ['lint', 'check'],
  fixable: false,
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

    let output: string;
    try {
      output = execSync('git config --get core.fsmonitor', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return results;
    }

    if (output !== '') {
      results.push(
        createResult(
          'workspace/no-fsmonitor-in-ci',
          ctx.rootDir,
          1,
          1,
          'warning',
          'core.fsmonitor is enabled — may cause issues in CI',
          {
            tip: 'Disable via: git config --unset core.fsmonitor',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
