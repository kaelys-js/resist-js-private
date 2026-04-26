/**
 * Rule: workspace/no-tsconfig-unused-paths
 *
 * Path aliases defined in tsconfig must be used in source code.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Source file extensions to scan for alias usage. */
const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set<string>(['.ts', '.tsx', '.js', '.jsx']);

/** Detects path aliases defined in tsconfig that are not used in any source file. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-unused-paths',
  description: 'Path aliases defined in tsconfig must be used in source code.',
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

    /** Collect all files first since allFiles is an async iterable that can only be iterated once. */
    const allFiles: string[] = [];
    for (const filePath of await ctx.allFiles()) {
      allFiles.push(filePath);
    }

    /** First pass: collect path alias keys from tsconfig*.json files. */
    const aliasEntries: Array<{ alias: string; aliasPrefix: string; filePath: string }> = [];

    for (const filePath of allFiles) {
      const name: string = basename(filePath);
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;
      const paths: Record<string, unknown> = (compilerOptions.paths ?? {}) as Record<
        string,
        unknown
      >;

      for (const key of Object.keys(paths)) {
        const aliasPrefix: string = key.replace(/\/\*$/, '');
        aliasEntries.push({ alias: key, aliasPrefix, filePath });
      }
    }

    /** Second pass: scan source files for usage of each alias. */
    const sourceContents: string[] = [];

    for (const filePath of allFiles) {
      const ext: string = filePath.slice(filePath.lastIndexOf('.'));
      if (!SOURCE_EXTENSIONS.has(ext)) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      sourceContents.push(content);
    }

    for (const entry of aliasEntries) {
      const isUsed: boolean = sourceContents.some((content: string) =>
        content.includes(entry.aliasPrefix),
      );

      if (!isUsed) {
        const relativePath: string = relative(ctx.rootDir, entry.filePath);
        results.push(
          createResult(
            'workspace/no-tsconfig-unused-paths',
            entry.filePath,
            1,
            1,
            'warning',
            `Unused path alias detected: "${entry.alias}" in ${relativePath}`,
            {
              tip: 'Remove this alias from compilerOptions.paths if it is no longer used',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
