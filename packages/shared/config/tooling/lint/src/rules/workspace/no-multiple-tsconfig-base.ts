/**
 * Rule: workspace/no-multiple-tsconfig-base
 *
 * Only one canonical tsconfig.base.json is allowed in the workspace.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Canonical suffix for the single allowed tsconfig.base.json. */
const CANONICAL_SUFFIX: string = 'packages/shared/config/typescript/tsconfig.base.json';

/** Enforces a single canonical tsconfig.base.json in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-multiple-tsconfig-base',
  description: 'Only one canonical tsconfig.base.json is allowed in the workspace.',
  scope: 'workspace',
  categories: ['workspace', 'tsconfig'],
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

    /** Collect all tsconfig.base.json files. */
    const baseFiles: string[] = [];

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);

      if (name === 'tsconfig.base.json') {
        baseFiles.push(filePath);
      }
    }

    /** Check if canonical location exists. */
    const canonicalExists: boolean = baseFiles.some((filePath: string) =>
      filePath.endsWith(CANONICAL_SUFFIX),
    );

    if (!canonicalExists) {
      results.push(
        createResult(
          'workspace/no-multiple-tsconfig-base',
          ctx.rootDir,
          1,
          1,
          'error',
          `Missing canonical tsconfig.base.json at ${CANONICAL_SUFFIX}`,
          {
            tip: 'Consolidate into the canonical location',
          },
        ),
      );
    }

    /** Report any tsconfig.base.json NOT at the canonical location. */
    for (const filePath of baseFiles) {
      if (!filePath.endsWith(CANONICAL_SUFFIX)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-multiple-tsconfig-base',
            filePath,
            1,
            1,
            'error',
            `Disallowed tsconfig.base.json found outside canonical location: ${relativePath}`,
            {
              tip: 'Consolidate into the canonical location',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
