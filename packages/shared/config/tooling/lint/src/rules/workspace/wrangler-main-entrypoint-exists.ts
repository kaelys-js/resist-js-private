/**
 * Rule: workspace/wrangler-main-entrypoint-exists
 *
 * Checks that the "main" field in wrangler.json points to an existing file.
 *
 * @module
 */

import { basename, dirname, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Checks that wrangler.json main entrypoint exists. */
const rule: WorkspaceRule = {
  id: 'workspace/wrangler-main-entrypoint-exists',
  description: 'Wrangler main entrypoint must reference an existing file.',
  scope: 'workspace',
  categories: ['workspace', 'wrangler'],
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
      if (name !== 'wrangler.json' && name !== 'wrangler.jsonc') {
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

      const { main } = parsed;
      if (typeof main !== 'string') {
        continue;
      }

      const dir: string = dirname(filePath);
      const entrypointPath: string = join(dir, main);
      const exists: boolean = await ctx.fileExists(entrypointPath);

      if (!exists) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/wrangler-main-entrypoint-exists',
            filePath,
            1,
            1,
            'error',
            `Wrangler main entrypoint '${main}' does not exist in ${relativePath}`,
            {
              tip: 'Ensure the main field points to an existing source file',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
