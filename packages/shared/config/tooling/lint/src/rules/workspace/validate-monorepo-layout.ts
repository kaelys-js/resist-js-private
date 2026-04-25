/**
 * Rule: workspace/validate-monorepo-layout
 *
 * Verifies expected top-level directories exist in the monorepo.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Required top-level directories. */
const REQUIRED_DIRS: ReadonlyArray<string> = ['packages', 'docs'];

/** Validates monorepo directory layout. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-monorepo-layout',
  description: 'Monorepo must have required top-level directories.',
  scope: 'workspace',
  categories: ['workspace', 'structure'],
  stages: ['lint', 'check'],
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

    for (const dir of REQUIRED_DIRS) {
      const dirPath: string = join(ctx.rootDir, dir);
      const exists: boolean = await ctx.dirExists(dirPath);

      if (!exists) {
        results.push(
          createResult(
            'workspace/validate-monorepo-layout',
            ctx.rootDir,
            1,
            1,
            'error',
            `Required directory '${dir}/' is missing from the monorepo root`,
            {
              tip: `Create the ${dir}/ directory at the workspace root`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
