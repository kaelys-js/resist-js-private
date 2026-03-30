/**
 * Rule: workspace/no-deep-relative-shared-imports
 *
 * Source files must not use deep relative imports into the
 * shared/ package directory.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex to detect deep relative imports reaching into shared/. */
const DEEP_SHARED_RE: RegExp = /from\s+['"](\.\.\/)+(shared)\//;

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx'];

/** Flags deep relative imports into the shared/ package directory. */
const rule: WorkspaceRule = {
  id: 'workspace/no-deep-relative-shared-imports',
  description: 'Source files must not use deep relative imports into shared/.',
  scope: 'workspace',
  categories: ['workspace', 'boundaries'],
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
      if (!SOURCE_EXTENSIONS.some((ext: string): boolean => filePath.endsWith(ext))) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (DEEP_SHARED_RE.test(content)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-deep-relative-shared-imports',
            filePath,
            1,
            1,
            'error',
            `Relative import into shared/ detected in ${relativePath} — use @/shared/ alias instead`,
            {
              tip: "Use alias imports like '@/shared/utils/foo' instead of relative paths",
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
