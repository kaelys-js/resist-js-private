/**
 * Rule: workspace/no-large-dependencies
 *
 * Warns on usage of known large or heavy dependency libraries.
 *
 * @module
 */

import { basename, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Set of known heavy dependency names. */
const HEAVY_LIBS: ReadonlySet<string> = new Set<string>([
  'moment',
  'lodash',
  'firebase',
  'rxjs',
  'chart.js',
  'd3',
  'three',
  'aws-sdk',
  'jquery',
  'highcharts',
  'echarts',
  'protobufjs',
]);

/** Dependency fields to check (prod and dev only). */
const DEP_FIELDS: readonly string[] = ['dependencies', 'devDependencies'] as const;

/** Flags usage of known large or heavy dependency libraries. */
const rule: WorkspaceRule = {
  id: 'workspace/no-large-dependencies',
  description: 'Warns on usage of known large or heavy dependency libraries.',
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

        for (const depName of Object.keys(depEntries)) {
          if (HEAVY_LIBS.has(depName)) {
            results.push(
              createResult(
                'workspace/no-large-dependencies',
                filePath,
                1,
                1,
                'warning',
                `Large dependency "${depName}" detected in ${field} of ${relativePath}`,
                {
                  tip: 'Consider lighter alternatives or ensure tree-shaking is configured',
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
