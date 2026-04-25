/**
 * Rule: workspace/validate-docs-workspace
 *
 * /docs/en-US/ must have documentation for each workspace package.
 * Ensures every package under packages/ has a corresponding documentation entry.
 *
 * @module
 */

import { dirname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** /docs/en-US/ must have documentation for each workspace package. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-docs-workspace',
  description: '/docs/en-US/ must have documentation for each workspace package.',
  scope: 'workspace',
  categories: ['workspace', 'docs'],
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
    const allFiles: readonly string[] = await ctx.allFiles();

    /* Check if docs/en-US/ exists as a prefix in any file. */
    const hasDocsFolder: boolean = allFiles.some((filePath: string): boolean => {
      const relativePath: string = relative(ctx.rootDir, filePath);
      return relativePath.startsWith('docs/en-US/');
    });

    if (!hasDocsFolder) {
      results.push(
        createResult(
          'workspace/validate-docs-workspace',
          'docs/en-US',
          1,
          1,
          'error',
          'Missing docs folder',
        ),
      );
      return results;
    }

    /* Collect all workspace package directories. */
    const packageDirs: Set<string> = new Set<string>();
    for (const filePath of allFiles) {
      const relativePath: string = relative(ctx.rootDir, filePath);
      if (relativePath.startsWith('packages/') && relativePath.endsWith('package.json')) {
        const packageDir: string = dirname(relativePath);
        packageDirs.add(packageDir);
      }
    }

    /* Collect all docs/en-US/ file paths. */
    const docsPaths: Set<string> = new Set<string>();
    for (const filePath of allFiles) {
      const relativePath: string = relative(ctx.rootDir, filePath);
      if (relativePath.startsWith('docs/en-US/')) {
        docsPaths.add(relativePath);
      }
    }

    /* Check each package for corresponding documentation. */
    for (const packagePath of packageDirs) {
      const hasDoc: boolean = [...docsPaths].some((docPath: string): boolean =>
        docPath.includes(packagePath.replace('packages/', '')),
      );

      if (!hasDoc) {
        results.push(
          createResult(
            'workspace/validate-docs-workspace',
            packagePath,
            1,
            1,
            'error',
            `Missing documentation for workspace package: ${packagePath}`,
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
