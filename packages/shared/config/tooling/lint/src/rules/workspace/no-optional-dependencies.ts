/**
 * Rule: workspace/no-optional-dependencies
 *
 * Disallows use of optionalDependencies in package.json.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Disallows optionalDependencies in package.json files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-optional-dependencies',
  description: 'Disallows use of optionalDependencies in package.json.',
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

      const optDeps: unknown = parsed.optionalDependencies;

      if (
        optDeps !== undefined &&
        optDeps !== null &&
        typeof optDeps === 'object' &&
        Object.keys(optDeps as Record<string, unknown>).length > 0
      ) {
        results.push(
          createResult(
            'workspace/no-optional-dependencies',
            filePath,
            1,
            1,
            'error',
            `optionalDependencies is not allowed in ${relativePath}`,
            {
              tip: 'Move dependencies to "dependencies" or "devDependencies" instead',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
