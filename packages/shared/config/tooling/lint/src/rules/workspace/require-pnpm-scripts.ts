/**
 * Rule: workspace/require-pnpm-scripts
 *
 * All package.json scripts must use pnpm, not npm or yarn.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching disallowed package manager commands. */
const DISALLOWED_PM_PATTERN: RegExp = /\bnpm\b|\byarn\b/;

/** Ensures all package.json scripts use pnpm instead of npm or yarn. */
const rule: WorkspaceRule = {
  id: 'workspace/require-pnpm-scripts',
  description: 'All package.json scripts must use pnpm, not npm or yarn.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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
      if (name !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const scripts: unknown = parsed.scripts;

      if (scripts === undefined || scripts === null || typeof scripts !== 'object') {
        continue;
      }

      const scriptEntries: Record<string, unknown> = scripts as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const [scriptName, scriptValue] of Object.entries(scriptEntries)) {
        if (typeof scriptValue !== 'string') {
          continue;
        }

        if (DISALLOWED_PM_PATTERN.test(scriptValue)) {
          results.push(
            createResult(
              'workspace/require-pnpm-scripts',
              filePath,
              1,
              1,
              'error',
              `Disallowed package manager command in scripts of ${relativePath}: "${scriptName}": "${scriptValue}"`,
              {
                tip: 'Replace npm/yarn commands with pnpm equivalents',
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
