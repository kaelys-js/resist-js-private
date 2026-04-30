/**
 * Rule: workspace/no-uncommitted-patches
 *
 * No stray .patch or .diff files should exist in the workspace.
 * Detects leftover patch/diff files that should be applied, committed,
 * or deleted.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags stray .patch or .diff files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-uncommitted-patches',
  description: 'No stray .patch or .diff files should exist in the workspace.',
  scope: 'workspace',
  categories: ['workspace', 'git'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;

    return ctx.allFiles();
  },

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

    const allFiles = await ctx.allFiles();

    for (const file of allFiles) {
      if (file.endsWith('.patch') || file.endsWith('.diff')) {
        results.push(
          createResult(
            'workspace/no-uncommitted-patches',
            file,
            1,
            1,
            'warning',
            `Stray patch/diff file found: ${file}`,
            {
              tip: 'Apply, commit, or delete patch files',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
