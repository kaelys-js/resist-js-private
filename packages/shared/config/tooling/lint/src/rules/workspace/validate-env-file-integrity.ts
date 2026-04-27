/**
 * Rule: workspace/validate-env-file-integrity
 *
 * Environment files must have valid syntax and no duplicate keys.
 * Checks .env and .env.example files for merge conflicts, tabs,
 * duplicate keys, and unclosed quotes.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Merge conflict marker prefixes. */
const MERGE_CONFLICT_MARKERS: readonly string[] = ['<<<<<<<', '=======', '>>>>>>>'];

/** Validates .env and .env.example files for syntax issues and duplicate keys. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-env-file-integrity',
  description: 'Environment files must have valid syntax and no duplicate keys.',
  scope: 'workspace',
  categories: ['workspace', 'env'],
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

      if (name !== '.env' && name !== '.env.example') {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);
      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lines: string[] = content.split('\n');
      const seen: Set<string> = new Set();

      for (const [i, line] of lines.entries()) {
        const lineNum: number = i + 1;

        /* Skip empty lines and comments */
        if (line.trim().length === 0 || line.trim().startsWith('#')) {
          continue;
        }

        /* Check for merge conflict markers */
        const hasMergeConflict: boolean = MERGE_CONFLICT_MARKERS.some((marker: string): boolean =>
          line.startsWith(marker),
        );
        if (hasMergeConflict) {
          results.push(
            createResult(
              'workspace/validate-env-file-integrity',
              filePath,
              lineNum,
              1,
              'error',
              `Merge conflict marker found on line ${String(lineNum)} in ${relativePath}`,
            ),
          );
          continue;
        }

        /* Check for tabs */
        if (line.includes('\t')) {
          results.push(
            createResult(
              'workspace/validate-env-file-integrity',
              filePath,
              lineNum,
              1,
              'error',
              `Tab character found on line ${String(lineNum)} in ${relativePath}`,
            ),
          );
        }

        /* Extract key from KEY=value */
        const eqIndex: number = line.indexOf('=');
        if (eqIndex === -1) {
          continue;
        }

        const key: string = line.slice(0, eqIndex).trim();
        const value: string = line.slice(eqIndex + 1);

        /* Check for duplicate keys */
        if (seen.has(key)) {
          results.push(
            createResult(
              'workspace/validate-env-file-integrity',
              filePath,
              lineNum,
              1,
              'error',
              `Duplicate key '${key}' on line ${String(lineNum)} in ${relativePath}`,
            ),
          );
        }

        /* Check for unclosed quotes */
        const trimmedValue: string = value.trim();
        const startsWithQuote: boolean =
          (trimmedValue.startsWith('"') && !trimmedValue.endsWith('"')) ||
          (trimmedValue.startsWith("'") && !trimmedValue.endsWith("'"));
        /* Single-char values like `"` or `'` alone are also unclosed */
        if (
          startsWithQuote &&
          (trimmedValue.length === 1 || trimmedValue[0] !== trimmedValue.at(-1))
        ) {
          results.push(
            createResult(
              'workspace/validate-env-file-integrity',
              filePath,
              lineNum,
              eqIndex + 2,
              'error',
              `Unclosed quote in value for key '${key}' on line ${String(lineNum)} in ${relativePath}`,
            ),
          );
        }

        seen.add(key);
      }
    }

    return results;
  },
};

export default rule;
