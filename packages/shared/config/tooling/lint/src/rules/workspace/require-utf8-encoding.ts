/**
 * Rule: workspace/require-utf8-encoding
 *
 * Files must be encoded in UTF-8. Detects the Unicode replacement character
 * which indicates Node could not decode the bytes as valid UTF-8.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags files containing the Unicode replacement character (non-UTF-8 encoding). */
const rule: WorkspaceRule = {
  id: 'workspace/require-utf8-encoding',
  description: 'Files must be encoded in UTF-8.',
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

    for await (const filePath of ctx.allFiles()) {
      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (content.includes('\uFFFD')) {
        results.push(
          createResult(
            'workspace/require-utf8-encoding',
            filePath,
            1,
            1,
            'error',
            `File contains non-UTF-8 encoding: ${relative(ctx.rootDir, filePath)}`,
            {
              tip: 'Convert the file to UTF-8 encoding',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
