/**
 * Rule: workspace/no-js-source-files
 *
 * JavaScript source files (.js, .cjs, .mjs) should not exist —
 * use TypeScript instead.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** JavaScript extensions that should be TypeScript instead. */
const JS_EXTENSIONS: readonly string[] = ['.js', '.cjs', '.mjs'];

/** Flags JavaScript source files that should be TypeScript. */
const rule: WorkspaceRule = {
  id: 'workspace/no-js-source-files',
  description: 'JavaScript source files should use TypeScript instead.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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
      if (!JS_EXTENSIONS.some((ext: string): boolean => filePath.endsWith(ext))) {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      results.push(
        createResult(
          'workspace/no-js-source-files',
          filePath,
          1,
          1,
          'error',
          `JavaScript source file found — use TypeScript instead: ${relativePath}`,
          {
            tip: 'Rename to .ts/.cts/.mts and add type annotations',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
