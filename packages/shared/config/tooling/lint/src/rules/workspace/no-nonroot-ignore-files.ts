/**
 * Rule: workspace/no-nonroot-ignore-files
 *
 * Workspace must not contain ignore files outside the project root.
 *
 * @module
 */

import { basename, dirname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of ignore filenames that should only exist at root. */
const IGNORE_BASENAMES: ReadonlySet<string> = new Set<string>(['.gitignore', '.dockerignore']);

/** Flags ignore files found outside the project root. */
const rule: WorkspaceRule = {
  id: 'workspace/no-nonroot-ignore-files',
  description: 'Workspace must not contain ignore files outside the project root.',
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (IGNORE_BASENAMES.has(name) && dirname(filePath) !== ctx.rootDir) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-nonroot-ignore-files',
            filePath,
            1,
            1,
            'error',
            `Non-root ignore file found: ${relativePath}`,
            {
              tip: 'Centralize all ignore rules to the project root.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
