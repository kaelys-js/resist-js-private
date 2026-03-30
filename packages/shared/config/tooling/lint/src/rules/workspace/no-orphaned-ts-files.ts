/**
 * Rule: workspace/no-orphaned-ts-files
 *
 * TypeScript files must be covered by at least one tsconfig.
 *
 * @module
 */

import { basename, dirname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags TypeScript files not covered by any tsconfig. */
const rule: WorkspaceRule = {
  id: 'workspace/no-orphaned-ts-files',
  description: 'TypeScript files must be covered by at least one tsconfig.',
  scope: 'workspace',
  categories: ['workspace', 'typescript'],
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

    const allFiles: readonly string[] = await ctx.allFiles();

    /** Collect tsconfig directories — each tsconfig covers files under its directory. */
    const tsconfigDirs: Array<string> = [];

    for (const filePath of allFiles) {
      const name: string = basename(filePath);
      if (name.startsWith('tsconfig') && name.endsWith('.json')) {
        tsconfigDirs.push(dirname(filePath));
      }
    }

    /* If no tsconfig files exist at all, skip silently. */
    if (tsconfigDirs.length === 0) {
      return results;
    }

    /** Check each .ts/.tsx file (excluding .d.ts and node_modules). */
    for (const filePath of allFiles) {
      /* Skip non-TypeScript files. */
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        continue;
      }

      /* Skip declaration files. */
      if (filePath.endsWith('.d.ts')) {
        continue;
      }

      /* Skip node_modules. */
      if (filePath.includes('node_modules')) {
        continue;
      }

      /** Check if the file is under at least one tsconfig directory. */
      const isCovered: boolean = tsconfigDirs.some(
        (dir: string): boolean => filePath.startsWith(dir + '/') || filePath === dir,
      );

      if (!isCovered) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-orphaned-ts-files',
            filePath,
            1,
            1,
            'error',
            `TypeScript file is not covered by any tsconfig: ${relativePath}`,
            {
              tip: "Add a tsconfig.json in the file's directory or a parent directory",
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
