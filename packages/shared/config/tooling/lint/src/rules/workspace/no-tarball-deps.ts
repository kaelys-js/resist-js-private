/**
 * Rule: workspace/no-tarball-deps
 *
 * Disallows .tgz tarball URLs in package.json dependencies.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Dependency fields to check. */
const DEP_FIELDS: readonly string[] = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/** Disallows .tgz tarball dependency URLs in package.json. */
const rule: WorkspaceRule = {
  id: 'workspace/no-tarball-deps',
  description: 'Disallows .tgz tarball URLs in package.json dependencies.',
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

        for (const [depName, depVersion] of Object.entries(depEntries)) {
          if (typeof depVersion !== 'string') {
            continue;
          }

          if (depVersion.includes('.tgz')) {
            results.push(
              createResult(
                'workspace/no-tarball-deps',
                filePath,
                1,
                1,
                'error',
                `Tarball dependency (.tgz) detected for "${depName}" in ${field} of ${relativePath}`,
                {
                  tip: `Use a version from a registry (e.g. "^1.2.3") instead of "${depVersion}"`,
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
