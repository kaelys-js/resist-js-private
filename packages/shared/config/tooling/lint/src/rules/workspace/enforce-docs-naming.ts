/**
 * Rule: workspace/enforce-docs-naming
 *
 * Documentation files in /docs/ must use lowercase kebab-case or snake_case naming
 * and must be markdown files (with exceptions for standard uppercase files).
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Standard uppercase documentation filenames that are always allowed. */
const ALLOWED_UPPERCASE: ReadonlySet<string> = new Set([
  'README.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'LICENSE',
  'GOVERNANCE.md',
  'PROJECT_CHARTER.md',
  'CODE_OF_CONDUCT.md',
]);

/** Regex for valid lowercase markdown filenames. */
const VALID_DOCS_FILENAME: RegExp = /^[a-z0-9._-]+\.md$/;

/** Documentation files must follow naming conventions. */
const rule: WorkspaceRule = {
  id: 'workspace/enforce-docs-naming',
  description: 'Documentation files must use correct naming conventions.',
  scope: 'workspace',
  categories: ['workspace', 'naming'],
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
      if (!filePath.includes('/docs/')) {
        continue;
      }

      const fileName: string = basename(filePath);

      if (ALLOWED_UPPERCASE.has(fileName)) {
        continue;
      }

      /* Check 1: non-markdown files are not allowed in /docs/ */
      if (!filePath.endsWith('.md') && fileName !== 'LICENSE') {
        results.push(
          createResult(
            'workspace/enforce-docs-naming',
            filePath,
            1,
            1,
            'error',
            `Non-markdown file in /docs: ${fileName}`,
            {
              tip: 'Only .md files are allowed in /docs',
            },
          ),
        );
        continue;
      }

      /* Check 2: markdown files must use lowercase kebab-case or snake_case */
      if (filePath.endsWith('.md') && !VALID_DOCS_FILENAME.test(fileName)) {
        results.push(
          createResult(
            'workspace/enforce-docs-naming',
            filePath,
            1,
            1,
            'error',
            `Invalid docs filename casing: ${fileName}`,
            {
              tip: 'Use lowercase kebab-case or snake_case for documentation files',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
