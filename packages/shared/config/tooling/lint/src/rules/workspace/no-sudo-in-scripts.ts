/**
 * Rule: workspace/no-sudo-in-scripts
 *
 * Shell scripts must not contain sudo usage.
 *
 * @module
 */

import { extname, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching non-commented lines containing sudo. */
const SUDO_PATTERN: RegExp = /^\s*[^#]*\bsudo\b/;

/** Flags sudo usage in shell scripts. */
const rule: WorkspaceRule = {
  id: 'workspace/no-sudo-in-scripts',
  description: 'Shell scripts must not contain sudo usage.',
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
      if (extname(filePath) !== '.sh') {
        continue;
      }

      const content: string = await ctx.readFile(filePath);
      const lines: string[] = content.split('\n');

      for (let i: number = 0; i < lines.length; i++) {
        if (SUDO_PATTERN.test(lines[i] ?? '')) {
          const relativePath: string = relative(ctx.rootDir, filePath);
          results.push(
            createResult(
              'workspace/no-sudo-in-scripts',
              filePath,
              i + 1,
              1,
              'error',
              `'sudo' usage found in shell script: ${relativePath}`,
              {
                tip: 'Remove sudo — assume scripts run in a permissioned container or CI environment.',
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
