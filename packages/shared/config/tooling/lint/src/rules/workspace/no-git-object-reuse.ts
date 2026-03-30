/**
 * Rule: workspace/no-git-object-reuse
 *
 * Git object reuse via alternates must be disabled.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags Git object reuse via alternates. */
const rule: WorkspaceRule = {
  id: 'workspace/no-git-object-reuse',
  description: 'Git object reuse via alternates must be disabled.',
  scope: 'workspace',
  categories: ['workspace', 'git', 'safety'],
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

    if (existsSync(join(ctx.rootDir, '.git', 'objects', 'info', 'alternates'))) {
      results.push(
        createResult(
          'workspace/no-git-object-reuse',
          ctx.rootDir,
          1,
          1,
          'error',
          'Git objects/info/alternates file found — object reuse is unsafe',
          {
            tip: 'Do not share Git objects across repos',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
