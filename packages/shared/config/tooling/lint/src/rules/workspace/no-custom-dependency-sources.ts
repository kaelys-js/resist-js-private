/**
 * Rule: workspace/no-custom-dependency-sources
 *
 * Disallowed or banned dependencies must not be used.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of banned dependency names. */
const BLOCKLIST: ReadonlySet<string> = new Set<string>([
  'node-sass',
  'request',
  'left-pad',
  'colors',
  'faker',
  'event-stream',
]);

/** Dependency fields to check. */
const DEP_FIELDS: readonly string[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

/** Flags disallowed or banned dependencies in package.json files. */
const rule: WorkspaceRule = {
  id: 'workspace/no-custom-dependency-sources',
  description: 'Disallowed or banned dependencies must not be used.',
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

      for (const field of DEP_FIELDS) {
        const deps: unknown = parsed[field];
        if (deps === undefined || deps === null || typeof deps !== 'object') {
          continue;
        }

        const depEntries: Record<string, unknown> = deps as Record<string, unknown>;

        for (const depName of Object.keys(depEntries)) {
          if (BLOCKLIST.has(depName)) {
            results.push(
              createResult(
                'workspace/no-custom-dependency-sources',
                filePath,
                1,
                1,
                'error',
                `Disallowed dependency "${depName}" found in ${field} of ${relativePath}`,
                {
                  tip: 'Remove the banned dependency or replace with a team-approved alternative',
                },
              ),
            );
          }
        }
      }
    }

    return results;
  },
};

export default rule;
