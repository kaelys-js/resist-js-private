/**
 * Rule: workspace/validate-tsconfig-include-patterns
 *
 * Validates that include/exclude arrays in tsconfig.json contain
 * syntactically valid patterns (no empty strings, no absolute paths).
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates include/exclude patterns in tsconfig.json files. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-tsconfig-include-patterns',
  description: 'TSConfig include/exclude patterns must be valid.',
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

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      if (!name.startsWith('tsconfig') || !name.endsWith('.json')) {
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

      const relativePath: string = relative(ctx.rootDir, filePath);

      /* Check include patterns. */
      if (Array.isArray(parsed.include)) {
        for (const pattern of parsed.include) {
          if (typeof pattern !== 'string') {
            continue;
          }

          if (pattern.length === 0) {
            results.push(
              createResult(
                'workspace/validate-tsconfig-include-patterns',
                filePath,
                1,
                1,
                'error',
                `Empty include pattern in ${relativePath}`,
                {
                  tip: 'Remove empty strings from include array',
                },
              ),
            );
          }

          if (pattern.startsWith('/')) {
            results.push(
              createResult(
                'workspace/validate-tsconfig-include-patterns',
                filePath,
                1,
                1,
                'error',
                `Absolute path '${pattern}' in include of ${relativePath} — use relative paths`,
                {
                  tip: 'Use relative paths in include patterns',
                },
              ),
            );
          }
        }
      }

      /* Check exclude patterns. */
      if (Array.isArray(parsed.exclude)) {
        for (const pattern of parsed.exclude) {
          if (typeof pattern !== 'string') {
            continue;
          }

          if (pattern.length === 0) {
            results.push(
              createResult(
                'workspace/validate-tsconfig-include-patterns',
                filePath,
                1,
                1,
                'error',
                `Empty exclude pattern in ${relativePath}`,
                {
                  tip: 'Remove empty strings from exclude array',
                },
              ),
            );
          }

          if (pattern.startsWith('/')) {
            results.push(
              createResult(
                'workspace/validate-tsconfig-include-patterns',
                filePath,
                1,
                1,
                'error',
                `Absolute path '${pattern}' in exclude of ${relativePath} — use relative paths`,
                {
                  tip: 'Use relative paths in exclude patterns',
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
