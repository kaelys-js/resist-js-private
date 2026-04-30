/**
 * Rule: workspace/tsconfig-references-resolve
 *
 * All project references in tsconfig must resolve to existing paths.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures all tsconfig project references resolve to existing paths. */
const rule: WorkspaceRule = {
  id: 'workspace/tsconfig-references-resolve',
  description: 'All project references in tsconfig must resolve to existing paths.',
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

      if (!Array.isArray(parsed.references)) {
        continue;
      }

      const references: Array<{ path?: string }> = parsed.references as Array<{
        path?: string;
      }>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const ref of references) {
        if (typeof ref.path !== 'string') {
          continue;
        }

        const refPath: string = ref.path;
        const resolvedDir: string = join(dirname(filePath), refPath);

        const asTsconfigDir: boolean = await ctx.fileExists(join(resolvedDir, 'tsconfig.json'));
        const asDirectFile: boolean = await ctx.fileExists(resolvedDir);

        if (!asTsconfigDir && !asDirectFile) {
          results.push(
            createResult(
              'workspace/tsconfig-references-resolve',
              filePath,
              1,
              1,
              'error',
              `Project reference "${refPath}" does not resolve in ${relativePath}`,
              {
                tip: 'Ensure the referenced path contains a tsconfig.json or points to a valid tsconfig file',
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
