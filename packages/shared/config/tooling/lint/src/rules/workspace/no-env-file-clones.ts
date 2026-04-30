/**
 * Rule: workspace/no-env-file-clones
 *
 * Workspace must not contain suspicious .env clone files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching suspicious .env clones like .env.bak, .env.copy, .env2, etc. */
const ENV_CLONE_PATTERN: RegExp = /^\.env(\.(copy|bak|old|save|tmp)|[0-9]+)$/;

/** Flags suspicious .env clone files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-env-file-clones',
  description: 'Workspace must not contain suspicious .env clone files.',
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);

      if (ENV_CLONE_PATTERN.test(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-env-file-clones',
            filePath,
            1,
            1,
            'error',
            `Suspicious .env clone found: ${relativePath}`,
            {
              tip: 'Remove duplicate or backup .env files to prevent accidental usage.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
