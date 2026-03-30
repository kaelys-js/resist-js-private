/**
 * Rule: workspace/no-unsafe-regex
 *
 * TypeScript files must not contain regex patterns with nested
 * quantifiers that can cause catastrophic backtracking.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex to detect nested quantifiers like (a+)+, (.*)+, (a*)*, etc. */
const NESTED_QUANTIFIER_REGEX: RegExp = /\([^)]*[+*][^)]*\)[+*]/;

/** Flags TypeScript files containing potentially unsafe regex patterns. */
const rule: WorkspaceRule = {
  id: 'workspace/no-unsafe-regex',
  description: 'TypeScript files must not contain regex with nested quantifiers.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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
      if (!filePath.endsWith('.ts')) {
        continue;
      }
      if (filePath.endsWith('.test.ts')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (NESTED_QUANTIFIER_REGEX.test(content)) {
        const relativePath: string = relative(ctx.rootDir, filePath);
        results.push(
          createResult(
            'workspace/no-unsafe-regex',
            filePath,
            1,
            1,
            'error',
            `Potentially unsafe regex pattern (nested quantifiers): ${relativePath}`,
            {
              tip: 'Avoid nested quantifiers like (a+)+ — they cause catastrophic backtracking',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
