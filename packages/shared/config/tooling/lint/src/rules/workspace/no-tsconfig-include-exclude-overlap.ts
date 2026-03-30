/**
 * Rule: workspace/no-tsconfig-include-exclude-overlap
 *
 * Detects duplicate globs present in both include and exclude arrays.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags overlapping entries in tsconfig include and exclude arrays. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tsconfig-include-exclude-overlap',
  description: 'Detects duplicate globs present in both include and exclude arrays.',
  scope: 'workspace',
  categories: ['workspace', 'tsconfig'],
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
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      const includeRaw: unknown = parsed.include;
      const excludeRaw: unknown = parsed.exclude;

      if (!Array.isArray(includeRaw) || !Array.isArray(excludeRaw)) {
        continue;
      }

      const includeEntries: string[] = includeRaw.filter(
        (entry: unknown): entry is string => typeof entry === 'string',
      );
      const excludeEntries: string[] = excludeRaw.filter(
        (entry: unknown): entry is string => typeof entry === 'string',
      );

      const excludeSet: Set<string> = new Set<string>(excludeEntries);

      for (const entry of includeEntries) {
        if (excludeSet.has(entry)) {
          results.push(
            createResult(
              'workspace/no-tsconfig-include-exclude-overlap',
              filePath,
              1,
              1,
              'error',
              `Glob "${entry}" appears in both include and exclude in ${relativePath}`,
              {
                tip: `Remove "${entry}" from either include or exclude — it should not be in both`,
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
