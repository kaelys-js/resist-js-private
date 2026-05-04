/**
 * Rule: workspace/require-tsconfig-exclude-defaults
 *
 * Ensures tsconfig exclude array includes standard directories.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Required entries in the tsconfig exclude array. */
const REQUIRED_EXCLUDES: readonly string[] = [
  'dist',
  'build',
  'coverage',
  'tmp',
  'node_modules',
] as const;

/** Ensures tsconfig exclude array includes standard directories. */
const rule: WorkspaceRule = {
  id: 'workspace/require-tsconfig-exclude-defaults',
  description: 'Ensures tsconfig exclude array includes standard directories.',
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
      const relativePath: string = relative(ctx.rootDir, filePath);

      const excludeRaw: unknown = parsed.exclude;
      const excludeEntries: string[] = [];

      if (Array.isArray(excludeRaw)) {
        for (const entry of excludeRaw) {
          if (typeof entry === 'string') {
            excludeEntries.push(entry);
          }
        }
      }

      const excludeSet: Set<string> = new Set<string>(excludeEntries);

      for (const required of REQUIRED_EXCLUDES) {
        if (!excludeSet.has(required)) {
          results.push(
            createResult(
              'workspace/require-tsconfig-exclude-defaults',
              filePath,
              1,
              1,
              'warning',
              `Missing required exclude entry "${required}" in ${relativePath}`,
              {
                tip: `Add "${required}" to the exclude array`,
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
