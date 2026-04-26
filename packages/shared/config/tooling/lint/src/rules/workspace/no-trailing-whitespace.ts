/**
 * Rule: workspace/no-trailing-whitespace
 *
 * Lines must not end with trailing whitespace (spaces or tabs).
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags lines that end with trailing spaces or tabs. */
const rule: WorkspaceRule = {
  id: 'workspace/no-trailing-whitespace',
  description: 'Lines must not end with trailing whitespace.',
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
      for (const [i, line] of lines.entries()) {
        if (/[ \t]+$/.test(line)) {
          const lineNum: number = i + 1;
          results.push(
            createResult(
              'workspace/no-trailing-whitespace',
              filePath,
              lineNum,
              1,
              'warning',
              `Trailing whitespace at line ${String(lineNum)}: ${relative(ctx.rootDir, filePath)}`,
              {
                tip: 'Remove trailing spaces and tabs from line endings',
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
