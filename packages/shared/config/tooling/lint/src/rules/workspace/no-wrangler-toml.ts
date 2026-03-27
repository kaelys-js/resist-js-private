/**
 * Rule: workspace/no-wrangler-toml
 *
 * Workspace must not contain wrangler config files.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Wrangler config filenames that should not be committed. */
const WRANGLER_FILES: readonly string[] = ['wrangler.toml', 'wrangler.jsonc'];

/** Flags wrangler config files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-wrangler-toml',
  description: 'Workspace must not contain wrangler config files.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

      if (WRANGLER_FILES.includes(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-wrangler-toml',
            filePath,
            1,
            1,
            'error',
            `Wrangler config file found: ${relativePath}`,
            {
              tip: 'Remove wrangler config files from the workspace',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
