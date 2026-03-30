/**
 * Rule: workspace/no-linter-config-override
 *
 * Nested linter configs are not allowed without explicit override permission.
 *
 * @module
 */

import { basename, relative } from 'node:path';
import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Linter config filenames to check. */
const LINTER_CONFIGS: ReadonlySet<string> = new Set<string>(['biome.json', '.oxlintrc.json']);

/** Flags nested linter configs that lack an explicit override permission marker. */
const rule: WorkspaceRule = {
  id: 'workspace/no-linter-config-override',
  description: 'Nested linter configs are not allowed without explicit override permission.',
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
      if (!LINTER_CONFIGS.has(name)) {
        continue;
      }

      if (
        filePath === join(ctx.rootDir, 'biome.json') ||
        filePath === join(ctx.rootDir, '.oxlintrc.json')
      ) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;

      if (parsed['// override'] !== 'allowed') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-linter-config-override',
            filePath,
            1,
            1,
            'error',
            `Linter config override without permission: ${relativePath}`,
            {
              tip: 'If intentional, add "// override": "allowed" to the config file',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
