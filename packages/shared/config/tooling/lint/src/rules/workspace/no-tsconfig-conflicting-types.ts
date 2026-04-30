/**
 * Rule: workspace/no-tsconfig-conflicting-types
 *
 * TypeScript config must not include both "node" and other global types.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags conflicting TypeScript types in tsconfig files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-conflicting-types',
  description: 'TypeScript config must not include both "node" and other global types.',
  scope: 'workspace',
  categories: ['workspace', 'tsconfig'],
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

      if (!name.includes('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;
      const relativePath: string = relative(ctx.rootDir, filePath);
      const { types } = compilerOptions;

      if (!Array.isArray(types) || types.length < 2) {
        continue;
      }

      const typeStrings: string[] = types.filter(
        (t: unknown): t is string => typeof t === 'string',
      );
      const hasNode: boolean = typeStrings.includes('node');
      const otherTypes: string[] = typeStrings.filter((t: string) => t !== 'node');

      if (hasNode && otherTypes.length > 0) {
        results.push(
          createResult(
            'workspace/no-tsconfig-conflicting-types',
            filePath,
            1,
            1,
            'warning',
            `Conflicting TypeScript types in ${relativePath} — includes 'node' and other global types: ${typeStrings.join(', ')}`,
            {
              tip: 'Avoid mixing "node" with other ambient globals unless isolated via projectReferences',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
