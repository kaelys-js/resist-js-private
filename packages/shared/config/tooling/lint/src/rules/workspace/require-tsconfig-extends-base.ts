/**
 * Rule: workspace/require-tsconfig-extends-base
 *
 * Root tsconfig.json files must extend a shared base configuration.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching scoped package extends (e.g. @scope/tsconfig). */
const SCOPED_PACKAGE_PATTERN: RegExp = /^@[^/]+\//;

/** Requires root tsconfig.json files to extend a shared base. */
const rule: WorkspaceRule = {
  id: 'workspace/require-tsconfig-extends-base',
  description: 'Root tsconfig.json files must extend a shared base configuration.',
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (name !== 'tsconfig.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const extendsValue: unknown = parsed.extends;

      const isValid: boolean =
        typeof extendsValue === 'string' &&
        (SCOPED_PACKAGE_PATTERN.test(extendsValue) || extendsValue.includes('tsconfig.base.json'));

      if (!isValid) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/require-tsconfig-extends-base',
            filePath,
            1,
            1,
            'error',
            `tsconfig.json must extend a shared base — ${relativePath}`,
            {
              tip: 'Use "extends": "@scope/tsconfig/base" or a relative path to tsconfig.base.json',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
