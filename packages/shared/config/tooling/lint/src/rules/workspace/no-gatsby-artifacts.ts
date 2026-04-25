/**
 * Rule: workspace/no-gatsby-artifacts
 *
 * Workspace must not contain Gatsby configuration files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Gatsby config filenames that are forbidden. */
const GATSBY_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  'gatsby-config.js',
  'gatsby-config.ts',
  'gatsby-node.js',
  'gatsby-browser.js',
  'gatsby-ssr.js',
]);

/** Flags Gatsby artifacts in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-gatsby-artifacts',
  description: 'Workspace must not contain Gatsby configuration files.',
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
      if (GATSBY_CONFIG_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-gatsby-artifacts',
            filePath,
            1,
            1,
            'error',
            `Gatsby artifact not allowed: ${relativePath}`,
            {
              tip: 'Remove Gatsby files — use the approved framework',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
