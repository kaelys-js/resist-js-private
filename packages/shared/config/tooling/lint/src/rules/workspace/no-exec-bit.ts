/**
 * Rule: workspace/no-exec-bit
 *
 * Non-script files must not have the executable permission bit set.
 *
 * @module
 */

import { stat } from 'node:fs/promises';
import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags non-script files that have the executable permission bit. */
const rule: WorkspaceRule = {
  id: 'workspace/no-exec-bit',
  description: 'Non-script files must not have executable permission.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    for (const file of await ctx.allFiles()) {
      /* Skip shell scripts and files in scripts directories */
      if (file.endsWith('.sh') || file.includes('/scripts/')) {
        continue;
      }

      try {
        const statResult: Awaited<ReturnType<typeof stat>> = await stat(file);
        if ((statResult.mode & 0o111) !== 0) {
          const relativePath: string = relative(ctx.rootDir, file);
          results.push(
            createResult(
              'workspace/no-exec-bit',
              file,
              1,
              1,
              'error',
              `Non-script file has executable permission: ${relativePath}`,
              {
                tip: `Remove executable permission: chmod -x ${file}`,
              },
            ),
          );
        }
      } catch {
        /* stat failed — skip the file */
        continue;
      }
    }

    return results;
  },
};

export default rule;
