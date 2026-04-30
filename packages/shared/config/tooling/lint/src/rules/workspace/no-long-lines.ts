/**
 * Rule: workspace/no-long-lines
 *
 * Lines must not exceed 160 characters.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Maximum allowed line length. */
const MAX_LINE_LENGTH: number = 160;

/** Lines must not exceed 160 characters. */
const rule: WorkspaceRule = {
  id: 'workspace/no-long-lines',
  description: 'Lines must not exceed 160 characters.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
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
      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lines: string[] = content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        if (line.length > MAX_LINE_LENGTH) {
          const lineNum: number = i + 1;
          results.push(
            createResult(
              'workspace/no-long-lines',
              filePath,
              lineNum,
              1,
              'warning',
              `Line ${String(lineNum)} is ${String(line.length)} characters (max ${String(MAX_LINE_LENGTH)}): ${relative(ctx.rootDir, filePath)}`,
              {
                tip: `Break long lines to stay within the ${String(MAX_LINE_LENGTH)} character limit`,
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
