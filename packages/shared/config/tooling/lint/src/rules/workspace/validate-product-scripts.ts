/**
 * Rule: workspace/validate-product-scripts
 *
 * Ensure product packages have required scripts for orchestration.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

/** Build the list of required scripts for a product package. */
function getRequiredScripts(product: string): readonly string[] {
  return [
    `build:${product}`,
    'build',
    `dev:${product}`,
    `logs:${product}`,
    `test:${product}`,
    `benchmark:${product}`,
    `logs:${product}:dev`,
    `logs:${product}:preview`,
    `logs:${product}:prod`,
    `logs:${product}:staging`,
  ];
}

/** Ensure product packages have required scripts. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-product-scripts',
  description: 'Product packages must have required scripts for orchestration.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    try {
      const packages = await ctx.getWorkspacePackages();
      return packages.map((p) => p.path);
    } catch {
      return [];
    }
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

    const packages: WorkspacePackage[] = await ctx.getWorkspacePackages();

    for (const pkg of packages) {
      if (!pkg.dir.includes('/packages/products/')) {
        continue;
      }

      const segments: string[] = pkg.dir.split('/');
      const product: string = segments.at(-1) ?? '';
      const pkgName: string = pkg.name ?? product;
      const scripts: Record<string, unknown> =
        typeof pkg.packageJson.scripts === 'object' && pkg.packageJson.scripts !== null
          ? (pkg.packageJson.scripts as Record<string, unknown>)
          : {};
      const requiredScripts: readonly string[] = getRequiredScripts(product);

      for (const script of requiredScripts) {
        if (!(script in scripts)) {
          results.push(
            createResult(
              'workspace/validate-product-scripts',
              pkg.path,
              1,
              1,
              'error',
              `Missing script '${script}' in product package ${pkgName}`,
              {
                tip: 'Add required scripts for product package orchestration',
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
