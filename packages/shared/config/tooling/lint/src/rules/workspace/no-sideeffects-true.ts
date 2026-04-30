/**
 * Rule: workspace/no-sideeffects-true
 *
 * Package.json must not set "sideEffects": true which disables tree-shaking.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags package.json files that set sideEffects to true. */
const rule: WorkspaceRule = {
  id: 'workspace/no-sideeffects-true',
  description: 'Package.json must not set "sideEffects": true which disables tree-shaking.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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

      if (name !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      if (parsed.sideEffects === true) {
        results.push(
          createResult(
            'workspace/no-sideeffects-true',
            filePath,
            1,
            1,
            'warning',
            `Tree-shaking is disabled in ${relativePath} — 'sideEffects: true' disables module pruning`,
            {
              tip: 'Use an array of side-effectful files or omit the field: "sideEffects": ["./src/polyfills.ts"]',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
