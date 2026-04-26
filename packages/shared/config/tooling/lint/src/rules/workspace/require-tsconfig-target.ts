/**
 * Rule: workspace/require-tsconfig-target
 *
 * All tsconfig files must set a modern target (ES2022 or ESNext).
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Allowed values for the compilerOptions.target field. */
const ALLOWED_TARGETS: ReadonlySet<string> = new Set<string>(['ES2022', 'ESNext']);

/** Requires a modern target in all tsconfig files. */
const rule: WorkspaceRule = {
  id: 'workspace/require-tsconfig-target',
  description: 'All tsconfig files must set target to ES2022 or ESNext.',
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

      const { target } = compilerOptions;
      if (typeof target !== 'string' || !ALLOWED_TARGETS.has(target)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        const found: string = typeof target === 'string' ? target : 'none';
        results.push(
          createResult(
            'workspace/require-tsconfig-target',
            filePath,
            1,
            1,
            'warning',
            `tsconfig target is "${found}" — expected ES2022 or ESNext — ${relativePath}`,
            {
              tip: 'Set "target" to "ES2022" or "ESNext" for modern syntax support',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
