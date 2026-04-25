/**
 * Rule: workspace/no-tsconfig-import-inconsistency
 *
 * When allowSyntheticDefaultImports is true, esModuleInterop must also be true.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags inconsistent allowSyntheticDefaultImports without esModuleInterop. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-import-inconsistency',
  description: 'When allowSyntheticDefaultImports is true, esModuleInterop must also be true.',
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
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;

      if (compilerOptions.allowSyntheticDefaultImports !== true) {
        continue;
      }

      if (compilerOptions.esModuleInterop !== true) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-tsconfig-import-inconsistency',
            filePath,
            1,
            1,
            'warning',
            `allowSyntheticDefaultImports is true but esModuleInterop is not in ${relativePath}`,
            {
              tip: 'Set "esModuleInterop": true when using "allowSyntheticDefaultImports": true',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
