/**
 * Rule: workspace/no-duplicate-package-names
 *
 * All package.json files must have unique name fields across the workspace.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures no two package.json files share the same name. */
const rule: WorkspaceRule = {
  id: 'workspace/no-duplicate-package-names',
  description: 'All package.json files must have unique name fields across the workspace.',
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

    const nameToFiles: Map<string, string[]> = new Map<string, string[]>();

    for await (const filePath of ctx.allFiles()) {
      const fileName: string = basename(filePath);
      if (fileName !== 'package.json') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;

      const pkgName: unknown = parsed.name;
      if (typeof pkgName !== 'string' || pkgName.length === 0) {
        continue;
      }

      const existing: string[] | undefined = nameToFiles.get(pkgName);
      if (existing !== undefined) {
        existing.push(filePath);
      } else {
        nameToFiles.set(pkgName, [filePath]);
      }
    }

    for (const [pkgName, files] of nameToFiles) {
      if (files.length > 1) {
        for (const filePath of files) {
          const relativePath: string = relative(ctx.rootDir, filePath);
          const otherFiles: string = files
            .filter((f: string) => f !== filePath)
            .map((f: string) => relative(ctx.rootDir, f))
            .join(', ');
          results.push(
            createResult(
              'workspace/no-duplicate-package-names',
              filePath,
              1,
              1,
              'error',
              `Duplicate package name "${pkgName}" in ${relativePath} — also found in ${otherFiles}`,
              {
                tip: 'Package names must be unique across the monorepo — rename one of the packages',
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
