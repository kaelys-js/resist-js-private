/**
 * Rule: workspace/require-tsconfig-types
 *
 * All typeRoots and types entries must resolve to valid directories.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Tsconfig filenames to check. */
const TSCONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  'tsconfig.json',
  'tsconfig.base.json',
]);

/** Ensures all typeRoots and types entries resolve to valid directories. */
const rule: WorkspaceRule = {
  id: 'workspace/require-tsconfig-types',
  description: 'All typeRoots and types entries must resolve to valid directories.',
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);

      if (!TSCONFIG_NAMES.has(name)) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;
      const relativePath: string = relative(ctx.rootDir, filePath);
      const configDir: string = dirname(filePath);

      const entries: string[] = [];

      const { typeRoots } = compilerOptions;

      if (Array.isArray(typeRoots)) {
        for (const entry of typeRoots) {
          if (typeof entry === 'string') {
            entries.push(entry);
          }
        }
      }

      const { types } = compilerOptions;

      if (Array.isArray(types)) {
        for (const entry of types) {
          if (typeof entry === 'string') {
            entries.push(entry);
          }
        }
      }

      for (const entry of entries) {
        const directPath: string = join(configDir, entry);
        const typesPath: string = join(configDir, 'node_modules/@types/', entry);
        const directExists: boolean = await ctx.dirExists(directPath);
        const typesExists: boolean = await ctx.dirExists(typesPath);

        if (!directExists && !typesExists) {
          results.push(
            createResult(
              'workspace/require-tsconfig-types',
              filePath,
              1,
              1,
              'warning',
              `Unresolvable typeRoot or type in ${relativePath}: "${entry}"`,
              {
                tip: `Ensure the type exists in typeRoots or install it: pnpm add -D @types/${entry}`,
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
