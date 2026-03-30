/**
 * Rule: workspace/no-todo-in-docs
 *
 * Documentation files must not contain TODO, FIXME, or placeholder markers.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex for placeholder markers in documentation. */
const PLACEHOLDER_PATTERN: RegExp = /TODO|FIXME|<insert[^>]*here>/i;

/** Documentation files must not contain placeholder markers. */
const rule: WorkspaceRule = {
  id: 'workspace/no-todo-in-docs',
  description: 'Documentation files must not contain TODO/FIXME/placeholder markers.',
  scope: 'workspace',
  categories: ['workspace', 'docs'],
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
      if (!filePath.endsWith('.md')) {
        continue;
      }

      if (!filePath.includes('/docs/')) {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (PLACEHOLDER_PATTERN.test(content)) {
        results.push(
          createResult(
            'workspace/no-todo-in-docs',
            filePath,
            1,
            1,
            'warning',
            `Placeholder marker found in documentation: ${relativePath}`,
            {
              tip: 'Remove TODOs, FIXMEs, and placeholder tags before publishing',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
