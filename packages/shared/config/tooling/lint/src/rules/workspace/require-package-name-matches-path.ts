/**
 * Rule: workspace/require-package-name-matches-path
 *
 * Ensures the package name in package.json matches the directory name.
 *
 * @module
 */

import { basename, dirname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures package name matches directory name. */
const rule: WorkspaceRule = {
  id: 'workspace/require-package-name-matches-path',
  description: 'Ensures the package name in package.json matches the directory name.',
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
      if (typeof pkgName !== 'string' || pkgName.length === 0) {
        continue;
      }

      const dir: string = dirname(filePath);
      const dirName: string = basename(dir);
      const unscopedName: string = pkgName.replace(/^@[^/]+\//, '');

      if (unscopedName !== dirName) {
        results.push(
          createResult(
            'workspace/require-package-name-matches-path',
            filePath,
            1,
            1,
            'error',
            `Package name "${pkgName}" does not match directory "${dirName}" in ${relativePath}`,
            {
              tip: `Rename the package or directory so the unscoped name "${unscopedName}" matches "${dirName}"`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
