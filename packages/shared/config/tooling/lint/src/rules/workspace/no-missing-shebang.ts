/**
 * Rule: workspace/no-missing-shebang
 *
 * Shell scripts (.sh files) must have a shebang line as the first line.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Shell scripts must have a shebang as the first line. */
const rule: WorkspaceRule = {
  id: 'workspace/no-missing-shebang',
  description: 'Shell scripts must have a shebang line.',
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
      if (!filePath.endsWith('.sh')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const firstLine: string = content.split('\n')[0] ?? '';
      if (!firstLine.startsWith('#!')) {
        results.push(
          createResult(
            'workspace/no-missing-shebang',
            filePath,
            1,
            1,
            'warning',
            `Shell script missing shebang: ${relative(ctx.rootDir, filePath)}`,
            {
              tip: 'Add #!/usr/bin/env bash as the first line',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
