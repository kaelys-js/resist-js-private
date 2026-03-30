/**
 * Rule: workspace/require-biome-extends-root
 *
 * Nested biome.json files must extend the root biome.json.
 *
 * @module
 */

import { basename, relative } from 'node:path';
import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures nested biome.json files extend the root biome.json. */
const rule: WorkspaceRule = {
  id: 'workspace/require-biome-extends-root',
  description: 'Nested biome.json files must extend the root biome.json.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
      if (name !== 'biome.json') {
        continue;
      }

      if (filePath === join(ctx.rootDir, 'biome.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;

      if (parsed.extends === undefined || parsed.extends === null) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/require-biome-extends-root',
            filePath,
            1,
            1,
            'error',
            `biome.json missing 'extends' key: ${relativePath}`,
            {
              tip: "Add an 'extends' key pointing to the root biome.json",
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
