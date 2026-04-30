/**
 * Rule: workspace/no-todo-comments
 *
 * TypeScript files must not contain TODO, FIXME, HACK, or XXX comments.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** TODO-like comment patterns to detect (case-sensitive). */
const TODO_PATTERNS: readonly string[] = ['TODO', 'FIXME', 'HACK', 'XXX'];

/** TypeScript files must not contain TODO/FIXME/HACK/XXX comments. */
const rule: WorkspaceRule = {
  id: 'workspace/no-todo-comments',
  description: 'Files must not contain TODO/FIXME/HACK/XXX comments.',
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
      if (!filePath.endsWith('.ts')) {
        continue;
      }
      if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lines: string[] = content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i] ?? '';

        for (const pattern of TODO_PATTERNS) {
          if (line.includes(pattern)) {
            const lineNum: number = i + 1;
            results.push(
              createResult(
                'workspace/no-todo-comments',
                filePath,
                lineNum,
                1,
                'warning',
                `TODO comment at line ${String(lineNum)}: ${relative(ctx.rootDir, filePath)}`,
                {
                  tip: 'Resolve TODO/FIXME comments before merging',
                  source: line,
                },
              ),
            );
            break;
          }
        }
      }
    }

    return results;
  },
};

export default rule;
