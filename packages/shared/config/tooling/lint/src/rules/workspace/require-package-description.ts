/**
 * Rule: workspace/require-package-description
 *
 * Ensures each package.json includes a non-empty description field.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures each package.json includes a non-empty description. */
const rule: WorkspaceRule = {
  id: 'workspace/require-package-description',
  description: 'Ensures each package.json includes a non-empty description field.',
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

      const { description } = parsed;
      if (typeof description !== 'string' || description.trim().length === 0) {
        results.push(
          createResult(
            'workspace/require-package-description',
            filePath,
            1,
            1,
            'error',
            `Missing or empty "description" in ${relativePath}`,
            {
              tip: 'Add a short summary of what this package does',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
