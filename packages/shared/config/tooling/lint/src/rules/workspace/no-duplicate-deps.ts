/**
 * Rule: workspace/no-duplicate-deps
 *
 * Dependencies must not appear in more than one dependency field.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Dependency fields to check for duplicates. */
const DEP_FIELDS: readonly string[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

/** Flags dependencies that appear in more than one dependency field. */
const rule: WorkspaceRule = {
  id: 'workspace/no-duplicate-deps',
  description: 'Dependencies must not appear in more than one dependency field.',
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

      const content: string = await ctx.readFile(filePath);
      const parsed: Record<string, unknown> = JSON.parse(content) as Record<string, unknown>;
      const relativePath: string = relative(ctx.rootDir, filePath);

      const depFieldMap: Map<string, string[]> = new Map<string, string[]>();

      for (const field of DEP_FIELDS) {
        const deps: unknown = parsed[field];
        if (deps === undefined || deps === null || typeof deps !== 'object') {
          continue;
        }

        const depEntries: Record<string, unknown> = deps as Record<string, unknown>;

        for (const depName of Object.keys(depEntries)) {
          const existing: string[] | undefined = depFieldMap.get(depName);
          if (existing === undefined) {
            depFieldMap.set(depName, [field]);
          } else {
            existing.push(field);
          }
        }
      }

      for (const [depName, fields] of depFieldMap) {
        if (fields.length > 1) {
          results.push(
            createResult(
              'workspace/no-duplicate-deps',
              filePath,
              1,
              1,
              'error',
              `Duplicate dependency "${depName}" found in multiple fields of ${relativePath}: ${fields.join(', ')}`,
              {
                tip: 'Declare each dependency in only one field',
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
