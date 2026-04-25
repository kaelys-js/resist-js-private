/**
 * Rule: workspace/no-parcel-config
 *
 * Workspace must not contain Parcel bundler config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching Parcel config filenames. */
const PARCEL_CONFIG_PATTERN: RegExp = /^(\.parcelrc|parcel\.config\..+)$/;

/** Flags Parcel config files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-parcel-config',
  description: 'Workspace must not contain Parcel bundler config files.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (PARCEL_CONFIG_PATTERN.test(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-parcel-config',
            filePath,
            1,
            1,
            'error',
            `Parcel config file found: ${relativePath}`,
            {
              tip: 'Use the approved bundler (e.g., Vite, esbuild) instead of Parcel.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
