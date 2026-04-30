/**
 * Rule: workspace/no-biome-disable
 *
 * biome.base.json must not disable any rules.
 * Ensures no rule is set to false in the biome configuration.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** biome.base.json must not disable any rules. */
const rule: WorkspaceRule = {
  id: 'workspace/no-biome-disable',
  description: 'biome.base.json must not disable any rules.',
  scope: 'workspace',
  categories: ['workspace', 'config', 'safety'],
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
    const biomePath: string = join(ctx.rootDir, 'biome.base.json');

    const exists: boolean = await ctx.fileExists(biomePath);

    if (!exists) {
      results.push(
        createResult(
          'workspace/no-biome-disable',
          biomePath,
          1,
          1,
          'error',
          'Missing biome.base.json',
        ),
      );
      return results;
    }

    let content: string;

    try {
      content = await ctx.readFile(biomePath);
    } catch {
      return results;
    }

    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return results;
    }

    const { rules } = parsed as Record<string, unknown>;

    if (rules === undefined || rules === null || typeof rules !== 'object') {
      return results;
    }

    for (const [key, value] of Object.entries(rules as Record<string, unknown>)) {
      if (value === false) {
        results.push(
          createResult(
            'workspace/no-biome-disable',
            biomePath,
            1,
            1,
            'error',
            `Disabled rule in biome.base.json: ${key}`,
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
