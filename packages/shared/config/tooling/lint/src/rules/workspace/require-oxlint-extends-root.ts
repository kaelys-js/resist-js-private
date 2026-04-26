/**
 * Rule: workspace/require-oxlint-extends-root
 *
 * Nested .oxlintrc.json files must extend the root config.
 *
 * @module
 */

import { basename, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures nested .oxlintrc.json files extend the root config. */
const rule: WorkspaceRule = {
  id: 'workspace/require-oxlint-extends-root',
  description: 'Nested .oxlintrc.json files must extend the root config.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
      if (name !== '.oxlintrc.json') {
        continue;
      }

      if (filePath === join(ctx.rootDir, '.oxlintrc.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;

      if (parsed.extends === undefined || parsed.extends === null) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/require-oxlint-extends-root',
            filePath,
            1,
            1,
            'error',
            `.oxlintrc.json missing 'extends' key: ${relativePath}`,
            {
              tip: "Add an 'extends' key pointing to the root .oxlintrc.json",
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
