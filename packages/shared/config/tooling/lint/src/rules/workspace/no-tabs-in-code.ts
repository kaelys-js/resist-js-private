/**
 * Rule: workspace/no-tabs-in-code
 *
 * Source files must use spaces for indentation, not tabs.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags lines that contain tab characters. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tabs-in-code',
  description: 'Source files must use spaces for indentation, not tabs.',
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

      const lines: string[] = content.split('\n');
      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i]!;
        if (line.includes('\t')) {
          const lineNum: number = i + 1;
          results.push(
            createResult(
              'workspace/no-tabs-in-code',
              filePath,
              lineNum,
              1,
              'warning',
              `Tab character at line ${String(lineNum)}: ${relative(ctx.rootDir, filePath)}`,
              {
                tip: 'Replace tab characters with spaces',
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
