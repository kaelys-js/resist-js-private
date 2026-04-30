/**
 * Rule: workspace/require-script-descriptions
 *
 * Package.json scripts must have corresponding descriptions.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures every script in package.json has a description in meta.scripts.description. */
const rule: WorkspaceRule = {
  id: 'workspace/require-script-descriptions',
  description: 'Package.json scripts must have corresponding descriptions.',
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
      if (basename(filePath) !== 'package.json') {
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

      const scripts: Record<string, unknown> | undefined = parsed['scripts'] as
        | Record<string, unknown>
        | undefined;

      if (!scripts || Object.keys(scripts).length === 0) {
        continue;
      }

      const meta: Record<string, unknown> | undefined =
        typeof parsed['meta'] === 'object' && parsed['meta'] !== null
          ? (parsed['meta'] as Record<string, unknown>)
          : undefined;

      const metaScripts: Record<string, unknown> | undefined =
        meta && typeof meta['scripts'] === 'object' && meta['scripts'] !== null
          ? (meta['scripts'] as Record<string, unknown>)
          : undefined;

      const descriptions: Record<string, unknown> | undefined =
        metaScripts &&
        typeof metaScripts['description'] === 'object' &&
        metaScripts['description'] !== null
          ? (metaScripts['description'] as Record<string, unknown>)
          : undefined;

      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const scriptName of Object.keys(scripts)) {
        if (!descriptions || !(scriptName in descriptions)) {
          results.push(
            createResult(
              'workspace/require-script-descriptions',
              filePath,
              1,
              1,
              'error',
              `Script '${scriptName}' has no description in meta.scripts.description in ${relativePath}`,
              {
                tip: 'Add a description to meta.scripts.description for each script',
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
