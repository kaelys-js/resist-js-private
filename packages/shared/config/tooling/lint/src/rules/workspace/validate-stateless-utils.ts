/**
 * Rule: workspace/validate-stateless-utils
 *
 * @stateless utility files must not contain side effects or mutation.
 * Checks for global state access, side-effectful APIs, and non-deterministic calls.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching global state access. */
const GLOBAL_STATE_PATTERN: RegExp =
  /\b(process\.env|globalThis|window|document|localStorage|sessionStorage|navigator)\b/;

/** Pattern matching side-effectful API calls. */
const SIDE_EFFECT_PATTERN: RegExp =
  /\b(console\.(log|warn|error|info)|fetch|setTimeout|setInterval)\b/;

/** Pattern matching non-deterministic calls. */
const NON_DETERMINISTIC_PATTERN: RegExp = /\b(Date\.now|new Date|Math\.random)\b/;

/** @stateless utility files must not contain side effects or mutation. */
const rule: WorkspaceRule = {
  id: 'workspace/validate-stateless-utils',
  description: '@stateless utility files must not contain side effects or mutation.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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
      if (!filePath.endsWith('.ts')) {
        continue;
      }

      if (!filePath.includes('packages/shared')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      if (!content.includes('@stateless')) {
        continue;
      }

      const relativePath: string = relative(ctx.rootDir, filePath);

      if (GLOBAL_STATE_PATTERN.test(content)) {
        results.push(
          createResult(
            'workspace/validate-stateless-utils',
            filePath,
            1,
            1,
            'error',
            `Global state in @stateless utility: ${relativePath}`,
          ),
        );
      }

      if (SIDE_EFFECT_PATTERN.test(content)) {
        results.push(
          createResult(
            'workspace/validate-stateless-utils',
            filePath,
            1,
            1,
            'error',
            `Side-effectful API in @stateless utility: ${relativePath}`,
          ),
        );
      }

      if (NON_DETERMINISTIC_PATTERN.test(content)) {
        results.push(
          createResult(
            'workspace/validate-stateless-utils',
            filePath,
            1,
            1,
            'error',
            `Non-deterministic call in @stateless utility: ${relativePath}`,
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
