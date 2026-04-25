/**
 * Rule: workspace/no-hugo-configs
 *
 * Workspace must not contain Hugo configuration files or archetype directories.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of Hugo config filenames that are forbidden (only at workspace root). */
const HUGO_CONFIG_NAMES: ReadonlySet<string> = new Set<string>([
  'config.toml',
  'config.yaml',
  'config.yml',
]);

/** Flags Hugo configuration files and archetype directories in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-hugo-configs',
  description: 'Workspace must not contain Hugo configuration files or archetype directories.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
      const rel: string = relative(ctx.rootDir, filePath);

      /* Only flag generic config names when they are at the workspace root */
      const isRoot: boolean = !rel.includes('/');
      const isRootHugoConfig: boolean = isRoot && HUGO_CONFIG_NAMES.has(name);

      /* Flag files inside /archetypes/ directories */
      const isArchetype: boolean = rel.includes('/archetypes/') || rel.startsWith('archetypes/');

      if (isRootHugoConfig || isArchetype) {
        results.push(
          createResult(
            'workspace/no-hugo-configs',
            filePath,
            1,
            1,
            'error',
            `Hugo configuration not allowed: ${rel}`,
            {
              tip: 'Remove Hugo files — use approved site generators',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
