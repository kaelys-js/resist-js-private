/**
 * Rule: workspace/validate-biome-rules
 *
 * biome.base.json must have valid rule definitions.
 * Checks that each rule value is either a boolean or an object.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** biome.base.json must have valid rule definitions. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-biome-rules',
  description: 'biome.base.json must have valid rule definitions.',
  scope: 'workspace',
  categories: ['workspace', 'config'],
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
          'workspace/validate-biome-rules',
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
      results.push(
        createResult(
          'workspace/validate-biome-rules',
          biomePath,
          1,
          1,
          'error',
          'Failed to read biome.base.json',
        ),
      );
      return results;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      results.push(
        createResult(
          'workspace/validate-biome-rules',
          biomePath,
          1,
          1,
          'error',
          'Invalid JSON in biome.base.json',
        ),
      );
      return results;
    }

    const { rules }: unknown = (parsed as Record<string, unknown>);
    if (rules === undefined || rules === null || typeof rules !== 'object') {
      return results;
    }

    for (const [key, value] of Object.entries(rules as Record<string, unknown>)) {
      if (value === null || (typeof value !== 'boolean' && typeof value !== 'object')) {
        results.push(
          createResult(
            'workspace/validate-biome-rules',
            biomePath,
            1,
            1,
            'error',
            `Invalid rule value in biome.base.json: ${key}`,
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
