/**
 * Rule: workspace/no-postinstall-scripts
 *
 * Workspace package.json files must not contain postinstall scripts.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags package.json files with postinstall scripts. */
const rule: WorkspaceRule = {
  id: 'workspace/no-postinstall-scripts',
  description: 'Workspace package.json files must not contain postinstall scripts.',
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
      if (basename(filePath) !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const scripts: Record<string, unknown> | undefined = parsed['scripts'] as
        | Record<string, unknown>
        | undefined;

      if (scripts && typeof scripts['postinstall'] === 'string') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-postinstall-scripts',
            filePath,
            1,
            1,
            'error',
            `postinstall script found in: ${relativePath}`,
            {
              tip: 'Move postinstall logic to a build or prepare script if needed.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
