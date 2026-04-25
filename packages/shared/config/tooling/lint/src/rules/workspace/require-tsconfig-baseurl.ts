/**
 * Rule: workspace/require-tsconfig-baseurl
 *
 * compilerOptions.baseUrl must be defined as "." or "src" in tsconfig files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Valid baseUrl values. */
const VALID_BASE_URLS: ReadonlySet<string> = new Set<string>(['.', 'src']);

/** Tsconfig filenames that require baseUrl. */
const TSCONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  'tsconfig.json',
  'tsconfig.base.json',
]);

/** Ensures compilerOptions.baseUrl is defined and valid. */
const rule: WorkspaceRule = {
  id: 'workspace/require-tsconfig-baseurl',
  description: 'compilerOptions.baseUrl must be defined as "." or "src" in tsconfig files.',
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
      if (!TSCONFIG_NAMES.has(name)) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;
      const relativePath: string = relative(ctx.rootDir, filePath);
      const baseUrl: unknown = compilerOptions.baseUrl;

      if (baseUrl === undefined || baseUrl === null) {
        results.push(
          createResult(
            'workspace/require-tsconfig-baseurl',
            filePath,
            1,
            1,
            'warning',
            `compilerOptions.baseUrl not defined in ${relativePath}`,
            {
              tip: 'Add "baseUrl": "." or "src" under compilerOptions',
            },
          ),
        );
        continue;
      }

      if (typeof baseUrl === 'string' && !VALID_BASE_URLS.has(baseUrl)) {
        results.push(
          createResult(
            'workspace/require-tsconfig-baseurl',
            filePath,
            1,
            1,
            'warning',
            `Invalid baseUrl in ${relativePath}: "${baseUrl}" (must be '.' or 'src')`,
            {
              tip: 'Add "baseUrl": "." or "src" under compilerOptions',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
