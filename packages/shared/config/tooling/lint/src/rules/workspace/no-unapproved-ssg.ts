/**
 * Rule: workspace/no-unapproved-ssg
 *
 * Workspace must not contain configuration files for unapproved static site generators.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of unapproved SSG config filenames that are forbidden. */
const UNAPPROVED_SSG_NAMES: ReadonlySet<string> = new Set<string>([
  '11ty.config.js',
  '.eleventy.js',
  'mkdocs.yml',
  'mkdocs.yaml',
  'docusaurus.config.js',
  'docusaurus.config.ts',
  '_sidebar.md',
  'docsify.js',
]);

/** Flags unapproved static site generator configs in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unapproved-ssg',
  description:
    'Workspace must not contain configuration files for unapproved static site generators.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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
      if (UNAPPROVED_SSG_NAMES.has(name)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-unapproved-ssg',
            filePath,
            1,
            1,
            'error',
            `Unapproved static site generator config: ${relativePath}`,
            {
              tip: 'Use approved tools like VitePress or unified MDX pipelines',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
