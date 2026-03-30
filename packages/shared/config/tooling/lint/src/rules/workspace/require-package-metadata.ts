/**
 * Rule: workspace/require-package-metadata
 *
 * Compares package.json metadata fields against root package.json for consistency.
 *
 * @module
 */

import { basename, join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Metadata fields to compare against root package.json. */
const METADATA_FIELDS: readonly string[] = ['author', 'homepage', 'repository', 'bugs'] as const;

/** Extracts a comparable string value from a metadata field. */
function extractFieldValue(parsed: Record<string, unknown>, field: string): string {
  const value: unknown = parsed[field];
  if (typeof value === 'string') {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    const obj: Record<string, unknown> = value as Record<string, unknown>;
    if (field === 'author') {
      return typeof obj.name === 'string' ? obj.name : '';
    }
    if (field === 'repository') {
      return typeof obj.url === 'string' ? obj.url : '';
    }
    if (field === 'bugs') {
      return typeof obj.url === 'string' ? obj.url : '';
    }
  }
  return '';
}

/** Ensures package.json metadata is consistent with root package.json. */
const rule: WorkspaceRule = {
  id: 'workspace/require-package-metadata',
  description: 'Compares package.json metadata fields against root package.json for consistency.',
  scope: 'workspace',
  categories: ['workspace', 'package'],
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

    const rootPkgPath: string = join(ctx.rootDir, 'package.json');
    const rootExists: boolean = await ctx.fileExists(rootPkgPath);
    if (!rootExists) {
      return results;
    }

    const rootContent: string = await ctx.readFile(rootPkgPath);
    const rootParsed: Record<string, unknown> = JSON.parse(rootContent) as Record<string, unknown>;

    const rootValues: Map<string, string> = new Map<string, string>();
    for (const field of METADATA_FIELDS) {
      const value: string = extractFieldValue(rootParsed, field);
      if (value.length > 0) {
        rootValues.set(field, value);
      }
    }

    if (rootValues.size === 0) {
      return results;
    }

    for await (const filePath of ctx.allFiles()) {
      const fileName: string = basename(filePath);
      if (fileName !== 'package.json') {
        continue;
      }

      if (filePath === rootPkgPath) {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      for (const [field, rootValue] of rootValues) {
        const pkgValue: string = extractFieldValue(parsed, field);
        if (pkgValue !== rootValue) {
          results.push(
            createResult(
              'workspace/require-package-metadata',
              filePath,
              1,
              1,
              'warning',
              `Inconsistent "${field}" in ${relativePath} — expected "${rootValue}", found "${pkgValue || '(missing)'}"`,
              {
                tip: `Set "${field}" to match root package.json value "${rootValue}"`,
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
