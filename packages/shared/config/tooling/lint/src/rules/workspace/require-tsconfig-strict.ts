/**
 * Rule: workspace/require-tsconfig-strict
 *
 * All tsconfig files must enable strict mode for full type safety.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Requires strict: true in all tsconfig files. */
const rule: WorkspaceRule = {
  id: 'workspace/require-tsconfig-strict',
  description: 'All tsconfig files must enable strict mode.',
  scope: 'workspace',
  categories: ['workspace', 'tsconfig'],
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;

      if (compilerOptions.strict !== true) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/require-tsconfig-strict',
            filePath,
            1,
            1,
            'error',
            `tsconfig missing "strict": true — ${relativePath}`,
            {
              tip: 'Add "strict": true under compilerOptions for full type safety',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
