/**
 * Rule: workspace/no-tsconfig-overrides
 *
 * Workspace must not contain override-style tsconfig files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching override-style tsconfig filenames (e.g. tsconfig.test.json, tsconfig.eslint.json). */
const TSCONFIG_OVERRIDE_PATTERN: RegExp = /^tsconfig\..+\.json$/;

/** Flags override-style tsconfig files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-overrides',
  description: 'Workspace must not contain override-style tsconfig files.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
      if (TSCONFIG_OVERRIDE_PATTERN.test(name) && name !== 'tsconfig.base.json') {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-tsconfig-overrides',
            filePath,
            1,
            1,
            'error',
            `Override-style tsconfig file found: ${relativePath}`,
            {
              tip: 'Remove override tsconfig — extend from the shared tsconfig.base.json instead.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
