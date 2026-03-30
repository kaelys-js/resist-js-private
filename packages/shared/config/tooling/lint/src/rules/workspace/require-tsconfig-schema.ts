/**
 * Rule: workspace/require-tsconfig-schema
 *
 * All tsconfig files must include the correct $schema URL for IDE support.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** The required $schema URL for tsconfig files. */
const REQUIRED_SCHEMA: string = 'https://json.schemastore.org/tsconfig';

/** Requires tsconfig files to include the correct $schema URL. */
const rule: WorkspaceRule = {
  id: 'workspace/require-tsconfig-schema',
  description: 'All tsconfig files must include the correct $schema URL.',
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const schema: unknown = parsed['$schema'];
      const relativePath: string = relative(ctx.rootDir, filePath);

      if (schema === undefined || schema === null) {
        results.push(
          createResult(
            'workspace/require-tsconfig-schema',
            filePath,
            1,
            1,
            'error',
            `Missing $schema in ${relativePath}`,
            {
              tip: 'Add "$schema": "https://json.schemastore.org/tsconfig" for IDE support',
            },
          ),
        );
      } else if (schema !== REQUIRED_SCHEMA) {
        results.push(
          createResult(
            'workspace/require-tsconfig-schema',
            filePath,
            1,
            1,
            'error',
            `Incorrect $schema in ${relativePath}`,
            {
              tip: 'Add "$schema": "https://json.schemastore.org/tsconfig" for IDE support',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
