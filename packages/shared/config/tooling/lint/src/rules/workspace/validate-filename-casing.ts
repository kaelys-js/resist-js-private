/**
 * Rule: workspace/validate-filename-casing
 *
 * Files in packages and config directories must use kebab-case or snake_case naming.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex for valid lowercase filenames (kebab-case, snake_case, dots allowed). */
const VALID_FILENAME: RegExp = /^[a-z0-9._-]+$/;

/** Path segments that indicate a file should be checked. */
const CHECKED_SEGMENTS: readonly string[] = [
  '/packages/shared/',
  '/packages/products/',
  '/.vscode/',
  '/.husky/',
];

/** Files in packages and config directories must use kebab-case or snake_case naming. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-filename-casing',
  description: 'Files must use kebab-case or snake_case naming.',
  scope: 'workspace',
  categories: ['workspace', 'naming'],
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
      const shouldCheck: boolean = CHECKED_SEGMENTS.some((segment: string): boolean =>
        filePath.includes(segment),
      );

      if (!shouldCheck) {
        continue;
      }

      const fileName: string = basename(filePath);

      if (!VALID_FILENAME.test(fileName)) {
        results.push(
          createResult(
            'workspace/validate-filename-casing',
            filePath,
            1,
            1,
            'error',
            `Invalid filename casing: ${fileName} — only kebab-case or snake_case allowed`,
            {
              tip: 'Rename to use lowercase a-z, numbers, dashes, underscores, or dots only',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
