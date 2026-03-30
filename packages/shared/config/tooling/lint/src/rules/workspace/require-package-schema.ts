/**
 * Rule: workspace/require-package-schema
 *
 * All package.json files must declare the correct $schema reference.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Expected $schema value for package.json. */
const EXPECTED_SCHEMA: string = 'https://json.schemastore.org/package.json';

/** Ensures all package.json files declare the correct $schema. */
const rule: WorkspaceRule = {
  id: 'workspace/require-package-schema',
  description: 'All package.json files must declare the correct $schema reference.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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
      const fileName: string = basename(filePath);
      if (fileName !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      const schema: unknown = parsed['$schema'];
      if (typeof schema !== 'string' || schema.length === 0) {
        results.push(
          createResult(
            'workspace/require-package-schema',
            filePath,
            1,
            1,
            'error',
            `Missing "$schema" in ${relativePath}`,
            {
              tip: `Add "$schema": "${EXPECTED_SCHEMA}" to your package.json`,
            },
          ),
        );
      } else if (schema !== EXPECTED_SCHEMA) {
        results.push(
          createResult(
            'workspace/require-package-schema',
            filePath,
            1,
            1,
            'error',
            `Invalid "$schema" in ${relativePath} — found "${schema}"`,
            {
              tip: `Set "$schema" to "${EXPECTED_SCHEMA}"`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
