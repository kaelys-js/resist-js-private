/**
 * Rule: workspace/no-package-lock
 *
 * Workspace must not contain package-lock.json.
 * This project uses pnpm, so only pnpm-lock.yaml is allowed.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags package-lock.json files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-package-lock',
  description: 'Workspace must not contain package-lock.json (use pnpm-lock.yaml instead).',
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
      const name: string = basename(filePath);

      if (name === 'package-lock.json') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-package-lock',
            filePath,
            1,
            1,
            'error',
            `npm lockfile found: ${relativePath}`,
            {
              tip: 'Delete package-lock.json and use pnpm with pnpm-lock.yaml',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
