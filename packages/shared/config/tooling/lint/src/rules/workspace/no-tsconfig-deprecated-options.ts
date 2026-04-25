/**
 * Rule: workspace/no-tsconfig-deprecated-options
 *
 * Flags deprecated or obscure compilerOptions in tsconfig files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of deprecated or obscure compilerOptions keys. */
const DEPRECATED_KEYS: ReadonlySet<string> = new Set<string>([
  'diagnostics',
  'extendedDiagnostics',
  'listFiles',
  'suppressOutput',
  'charset',
]);

/** Flags deprecated compilerOptions in tsconfig files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-deprecated-options',
  description: 'Flags deprecated or obscure compilerOptions in tsconfig files.',
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
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const compilerOptions: Record<string, unknown> = (parsed.compilerOptions ?? {}) as Record<
        string,
        unknown
      >;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const key of DEPRECATED_KEYS) {
        if (key in compilerOptions) {
          results.push(
            createResult(
              'workspace/no-tsconfig-deprecated-options',
              filePath,
              1,
              1,
              'warning',
              `Deprecated compilerOption "${key}" found in ${relativePath}`,
              {
                tip: `Remove "${key}" from compilerOptions unless required for debugging`,
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
