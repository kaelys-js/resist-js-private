/**
 * Rule: workspace/require-ci-job-conditions
 *
 * CI jobs must define trigger conditions to prevent unconditional execution.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching any trigger condition keyword in CI YAML. */
const CONDITION_PATTERN: RegExp = /\b(rules:|only:|except:|on:|if:)\s/;

/** Flags CI files that have no trigger conditions defined. */
const rule: WorkspaceRule = {
  id: 'workspace/require-ci-job-conditions',
  description: 'CI jobs must define trigger conditions to prevent unconditional execution.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
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
      const relativePath: string = relative(ctx.rootDir, filePath);

      /** Only check CI YAML files under .github/ or .gitlab/ directories. */
      const isGitHub: boolean = relativePath.startsWith('.github/');
      const isGitLab: boolean = relativePath.startsWith('.gitlab/');

      if (!isGitHub && !isGitLab) {
        continue;
      }
      if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) {
        continue;
      }

      let content: string;

      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      /** Check if the file contains at least one trigger condition keyword. */
      if (!CONDITION_PATTERN.test(content)) {
        results.push(
          createResult(
            'workspace/require-ci-job-conditions',
            filePath,
            1,
            1,
            'error',
            `CI file has no trigger conditions (rules/only/except/on/if): ${relativePath}`,
            {
              tip: 'Add trigger conditions (rules:, only:, except:, on:, or if:) to control when CI jobs execute',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
