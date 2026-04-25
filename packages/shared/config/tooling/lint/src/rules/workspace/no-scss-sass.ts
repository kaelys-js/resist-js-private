/**
 * Rule: workspace/no-scss-sass
 *
 * Workspace must not contain SCSS or SASS files.
 *
 * @module
 */

import { extname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of SCSS/SASS file extensions. */
const SCSS_EXTENSIONS: ReadonlySet<string> = new Set<string>(['.scss', '.sass']);

/** Flags SCSS and SASS files in the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/no-scss-sass',
  description: 'Workspace must not contain SCSS or SASS files.',
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
      const ext: string = extname(filePath);
      if (SCSS_EXTENSIONS.has(ext)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-scss-sass',
            filePath,
            1,
            1,
            'error',
            `SCSS/SASS file found: ${relativePath}`,
            {
              tip: 'Use CSS modules, PostCSS, or utility-first frameworks like Tailwind instead.',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
