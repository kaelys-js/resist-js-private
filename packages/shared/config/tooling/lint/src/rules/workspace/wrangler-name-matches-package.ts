/**
 * Rule: workspace/wrangler-name-matches-package
 *
 * Ensures wrangler.json "name" field matches the sibling package.json name
 * (stripping @scope/ prefix).
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures wrangler.json name matches package.json name. */
const rule: WorkspaceRule = {
  id: 'workspace/wrangler-name-matches-package',
  description: 'Wrangler name must match the sibling package.json name.',
  scope: 'workspace',
  categories: ['workspace', 'wrangler'],
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
      const name: string = basename(filePath);
      if (name !== 'wrangler.json' && name !== 'wrangler.jsonc') {
        continue;
      }

      let wranglerContent: string;
      try {
        wranglerContent = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let wranglerJson: Record<string, unknown>;
      try {
        wranglerJson = JSON.parse(wranglerContent) as Record<string, unknown>;
      } catch {
        continue;
      }

      const wranglerName: unknown = wranglerJson.name;
      if (typeof wranglerName !== 'string') {
        continue;
      }

      /* Read sibling package.json. */
      const dir: string = dirname(filePath);
      const pkgPath: string = join(dir, 'package.json');
      const pkgExists: boolean = await ctx.fileExists(pkgPath);

      if (!pkgExists) {
        continue;
      }

      let pkgContent: string;
      try {
        pkgContent = await ctx.readFile(pkgPath);
      } catch {
        continue;
      }

      let pkgJson: Record<string, unknown>;
      try {
        pkgJson = JSON.parse(pkgContent) as Record<string, unknown>;
      } catch {
        continue;
      }

      const pkgName: unknown = pkgJson.name;
      if (typeof pkgName !== 'string') {
        continue;
      }

      /* Strip @scope/ prefix from package name. */
      const strippedPkgName: string = pkgName.startsWith('@')
        ? pkgName.split('/').slice(1).join('/')
        : pkgName;

      if (wranglerName !== strippedPkgName) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/wrangler-name-matches-package',
            filePath,
            1,
            1,
            'error',
            `Wrangler name '${wranglerName}' does not match package name '${pkgName}' (expected '${strippedPkgName}') in ${relativePath}`,
            {
              tip: `Set wrangler name to '${strippedPkgName}'`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
