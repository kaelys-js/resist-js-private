/**
 * Rule: workspace/require-private-internal-packages
 *
 * Internal workspace packages must have "private": true.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures internal workspace packages under /packages/ have "private": true. */
const rule: WorkspaceRule = {
  id: 'workspace/require-private-internal-packages',
  description: 'Internal workspace packages must have "private": true.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      if (name !== 'package.json') {
        continue;
      }

      if (!filePath.includes('/packages/')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      if (parsed.private !== true) {
        results.push(
          createResult(
            'workspace/require-private-internal-packages',
            filePath,
            1,
            1,
            'error',
            `Internal package is missing "private": true — ${relativePath}`,
            {
              tip: 'Add "private": true to prevent accidental npm publish',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
