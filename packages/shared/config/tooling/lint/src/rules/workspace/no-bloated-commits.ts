/**
 * Rule: workspace/no-bloated-commits
 *
 * Individual commits must not touch more than 100 files.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags commits that touch too many files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-bloated-commits',
  description: 'Individual commits must not touch more than 100 files.',
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
      output = execSync('git diff --name-only HEAD~1 HEAD', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      });
    } catch {
      return results;
    }

    const count: number = output.split('\n').filter(Boolean).length;

    if (count > 100) {
      results.push(
        createResult(
          'workspace/no-bloated-commits',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Last commit touches ${count} files — consider splitting`,
          {
            tip: 'Split large changes into focused commits',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
