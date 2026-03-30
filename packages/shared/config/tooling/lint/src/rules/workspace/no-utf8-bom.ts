/**
 * Rule: workspace/no-utf8-bom
 *
 * Files must not contain a UTF-8 BOM (Byte Order Mark).
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags files that start with the UTF-8 BOM character. */
const rule: WorkspaceRule = {
  id: 'workspace/no-utf8-bom',
  description: 'Files must not contain a UTF-8 BOM (Byte Order Mark).',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
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
      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.startsWith('\uFEFF')) {
        results.push(
          createResult(
            'workspace/no-utf8-bom',
            filePath,
            1,
            1,
            'error',
            `File contains UTF-8 BOM: ${relative(ctx.rootDir, filePath)}`,
            {
              tip: 'Remove the UTF-8 BOM byte sequence (EF BB BF) from the file',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
