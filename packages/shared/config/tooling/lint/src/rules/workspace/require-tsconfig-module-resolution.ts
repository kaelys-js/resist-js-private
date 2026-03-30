/**
 * Rule: workspace/require-tsconfig-module-resolution
 *
 * When module is ESNext, moduleResolution must be bundler.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Requires moduleResolution bundler when module is ESNext. */
const rule: WorkspaceRule = {
  id: 'workspace/require-tsconfig-module-resolution',
  description: 'When module is ESNext, moduleResolution must be bundler.',
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
      const relativePath: string = relative(ctx.rootDir, filePath);

      const moduleValue: unknown = compilerOptions.module;
      if (moduleValue !== 'ESNext') {
        continue;
      }

      const moduleResolution: unknown = compilerOptions.moduleResolution;
      if (moduleResolution !== 'bundler') {
        results.push(
          createResult(
            'workspace/require-tsconfig-module-resolution',
            filePath,
            1,
            1,
            'warning',
            `ESNext module requires moduleResolution "bundler" in ${relativePath}`,
            {
              tip: 'Add "moduleResolution": "bundler" when using "module": "ESNext"',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
