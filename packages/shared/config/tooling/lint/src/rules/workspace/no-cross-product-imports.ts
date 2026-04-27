/**
 * Rule: workspace/no-cross-product-imports
 *
 * Source files must not use relative imports into sibling
 * product directories.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pipe-separated product layers used in the cross-product import check. */
const LAYERS: string = 'api|web|data|marketing|mobile|branding|infra';

/** Regex to detect relative imports reaching into sibling product directories. */
const CROSS_PRODUCT_RE: RegExp = new RegExp(
  String.raw`from\s+['"](\.\.\/)+(` + LAYERS + String.raw`)\/`,
);

/** Source file extensions to scan. */
const SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx'];

/** Flags relative imports that cross product boundaries. */
const rule: WorkspaceRule = {
  id: 'workspace/no-cross-product-imports',
  description: 'Source files must not use relative imports into sibling product directories.',
  scope: 'workspace',
  categories: ['workspace', 'boundaries'],
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
      if (!filePath.includes('/packages/products/')) {
        continue;
      }

      if (!SOURCE_EXTENSIONS.some((ext: string): boolean => filePath.endsWith(ext))) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (CROSS_PRODUCT_RE.test(content)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-cross-product-imports',
            filePath,
            1,
            1,
            'error',
            `Disallowed relative import into sibling product layer in ${relativePath}`,
            {
              tip: "Use alias imports like '@product/api' instead of deep relative paths",
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
