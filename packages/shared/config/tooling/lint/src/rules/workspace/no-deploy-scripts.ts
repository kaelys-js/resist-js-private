/**
 * Rule: workspace/no-deploy-scripts
 *
 * Prevent deploy:* scripts in any package.json.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Prevent deploy:* scripts in any package.json. */
const rule: WorkspaceRule = {
  id: 'workspace/no-deploy-scripts',
  description: 'Packages must not contain deploy:* scripts.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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
      if (name !== 'package.json') {
        continue;
      }
      if (filePath.includes('node_modules')) {
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

      const scripts: unknown = parsed.scripts;
      if (typeof scripts !== 'object' || scripts === null) {
        continue;
      }

      const scriptEntries: Record<string, unknown> = scripts as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const key of Object.keys(scriptEntries)) {
        if (key.startsWith('deploy:')) {
          results.push(
            createResult(
              'workspace/no-deploy-scripts',
              filePath,
              1,
              1,
              'error',
              `Disallowed deploy:* script '${key}' in ${relativePath}`,
              {
                tip: 'Move deployment logic to CI/CD config or Makefile targets',
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
