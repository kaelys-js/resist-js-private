/**
 * Rule: workspace/validate-tsconfig-path-aliases
 *
 * TSConfig path aliases must resolve to existing paths.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates that tsconfig path aliases resolve to existing directories/files. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-tsconfig-path-aliases',
  description: 'TSConfig path aliases must resolve to existing paths.',
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

    for await (const filePath of ctx.allFiles()) {
      const name: string = basename(filePath);
      if (name !== 'tsconfig.json' && !/^tsconfig\..+\.json$/.test(name)) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        continue;
      }

      const compilerOptions: Record<string, unknown> | undefined = parsed['compilerOptions'] as
        | Record<string, unknown>
        | undefined;
      if (!compilerOptions) {
        continue;
      }

      const paths: Record<string, string[]> | undefined = compilerOptions['paths'] as
        | Record<string, string[]>
        | undefined;
      if (!paths) {
        continue;
      }

      const tsconfigDir: string = dirname(filePath);
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const [aliasKey, aliasTargets] of Object.entries(paths)) {
        if (!Array.isArray(aliasTargets) || aliasTargets.length === 0) {
          continue;
        }

        const firstTarget: string = aliasTargets[0] as string;
        const stripped: string = firstTarget.replace(/\/\*$/, '');
        const resolved: string = join(tsconfigDir, stripped);

        const exists: boolean = await ctx.fileExists(resolved);
        if (!exists) {
          results.push(
            createResult(
              'workspace/validate-tsconfig-path-aliases',
              filePath,
              1,
              1,
              'error',
              `Path alias '${aliasKey}' target '${stripped}' does not exist in ${relativePath}`,
              {
                tip: 'Ensure path alias targets resolve to existing directories or files.',
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
