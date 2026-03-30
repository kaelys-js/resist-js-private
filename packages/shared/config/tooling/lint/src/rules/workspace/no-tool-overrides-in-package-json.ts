/**
 * Rule: workspace/no-tool-overrides-in-package-json
 *
 * Workspace package.json files must not contain inline tool config overrides.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Tool config keys that must not appear in package.json. */
const DISALLOWED_KEYS: readonly string[] = ['biome', 'oxlint', 'eslintConfig', 'prettier'];

/** Flags package.json files with inline tool config overrides. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tool-overrides-in-package-json',
  description: 'Workspace package.json files must not contain inline tool config overrides.',
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

    for (const filePath of await ctx.allFiles()) {
      if (basename(filePath) !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const key of DISALLOWED_KEYS) {
        if (key in parsed) {
          results.push(
            createResult(
              'workspace/no-tool-overrides-in-package-json',
              filePath,
              1,
              1,
              'error',
              `Disallowed config key "${key}" found in: ${relativePath}`,
              {
                tip: 'Move tool configuration to a standalone config file.',
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
