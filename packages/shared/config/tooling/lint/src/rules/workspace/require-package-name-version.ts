/**
 * Rule: workspace/require-package-name-version
 *
 * All package.json files must declare name and version fields.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures all package.json files declare name and version fields. */
const rule: WorkspaceRule = {
  id: 'workspace/require-package-name-version',
  description: 'All package.json files must declare name and version fields.',
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

    for await (const filePath of ctx.allFiles()) {
      const fileName: string = basename(filePath);
      if (fileName !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      const pkgName: unknown = parsed.name;
      if (typeof pkgName !== 'string' || pkgName.trim().length === 0) {
        results.push(
          createResult(
            'workspace/require-package-name-version',
            filePath,
            1,
            1,
            'error',
            `Missing or empty "name" field in ${relativePath}`,
            {
              tip: 'Add a valid "name" field to your package.json',
            },
          ),
        );
      }

      const version: unknown = parsed.version;
      if (typeof version !== 'string' || version.trim().length === 0) {
        results.push(
          createResult(
            'workspace/require-package-name-version',
            filePath,
            1,
            1,
            'error',
            `Missing or empty "version" field in ${relativePath}`,
            {
              tip: 'Add a valid "version" field to your package.json',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
