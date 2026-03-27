/**
 * Rule: workspace/no-pnpmfile
 *
 * Workspace must not contain pnpmfile.js.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags pnpmfile.js in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-pnpmfile',
  description: 'Workspace must not contain pnpmfile.js.',
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
      if (name === 'pnpmfile.js') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-pnpmfile',
            filePath,
            1,
            1,
            'error',
            `pnpmfile.js found: ${relativePath}`,
            {
              tip: 'Use overrides or patch-package instead with clear traceability.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
