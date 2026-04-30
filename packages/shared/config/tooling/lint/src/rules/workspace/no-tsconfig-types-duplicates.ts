/**
 * Rule: workspace/no-tsconfig-types-duplicates
 *
 * The compilerOptions.types array must not contain duplicate entries.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Detects duplicate entries in compilerOptions.types arrays. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-types-duplicates',
  description: 'The compilerOptions.types array must not contain duplicate entries.',
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

      if (!Array.isArray(compilerOptions.types)) {
        continue;
      }

      const types: string[] = compilerOptions.types as string[];
      const seen: Set<string> = new Set<string>();
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const entry of types) {
        if (seen.has(entry)) {
          results.push(
            createResult(
              'workspace/no-tsconfig-types-duplicates',
              filePath,
              1,
              1,
              'warning',
              `Duplicate type "${entry}" in compilerOptions.types in ${relativePath}`,
              {
                tip: `Remove the duplicate "${entry}" from the types array`,
              },
            ),
          );
        } else {
          seen.add(entry);
        }
      }
    }

    return results;
  },
};

export default rule;
