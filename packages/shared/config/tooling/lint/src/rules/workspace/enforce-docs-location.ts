/**
 * Rule: workspace/enforce-docs-location
 *
 * Enforces that Markdown files live at the repo root or under docs/.
 * README.md files inside packages are allowed.
 *
 * @module
 */

import { basename, dirname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Files allowed anywhere. */
const ALLOWED_NAMES: ReadonlySet<string> = new Set<string>([
  'README.md',
  'readme.md',
  'CHANGELOG.md',
  'changelog.md',
  'LICENSE.md',
  'license.md',
  'CONTRIBUTING.md',
  'contributing.md',
  'CODE_OF_CONDUCT.md',
]);

/** Enforces Markdown files are in proper locations. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-docs-location',
  description: 'Markdown files must be at repo root or under docs/.',
  scope: 'workspace',
  categories: ['workspace', 'docs'],
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
      if (!filePath.endsWith('.md')) {
        continue;
      }

      const name: string = basename(filePath);
      const relativePath: string = relative(ctx.rootDir, filePath);
      const relDir: string = dirname(relativePath);

      /* Root-level .md files are allowed. */
      if (relDir === '.') {
        continue;
      }

      /* Files under docs/ are allowed. */
      if (relativePath.startsWith('docs/')) {
        continue;
      }

      /* Standard files (README, CHANGELOG, etc.) are allowed anywhere. */
      if (ALLOWED_NAMES.has(name)) {
        continue;
      }

      results.push(
        createResult(
          'workspace/enforce-docs-location',
          filePath,
          1,
          1,
          'error',
          `Markdown file '${name}' in ${relativePath} should be at repo root or under docs/`,
          {
            tip: 'Move documentation Markdown files to the docs/ directory',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
