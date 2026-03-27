/**
 * Rule: workspace/no-dangerous-shell-commands
 *
 * Shell scripts must not contain dangerous commands that could cause
 * data loss or system damage.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Dangerous patterns to detect in shell scripts. */
const DANGEROUS_PATTERNS: readonly string[] = [
  'rm -rf /',
  'rm -rf /*',
  ':(){ :|:& };:',
  'mkfs.',
  'dd if=',
  '> /dev/sda',
];

/** Flags shell scripts containing dangerous commands. */
const rule: WorkspaceRule = {
  id: 'workspace/no-dangerous-shell-commands',
  description: 'Shell scripts must not contain dangerous commands.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
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

    for await (const filePath of ctx.allFiles()) {
      if (!filePath.endsWith('.sh')) {
        continue;
      }

      let content: string;
      try {
        content = await ctx.readFile(filePath);
      } catch {
        continue;
      }

      const lines: string[] = content.split('\n');
      for (let i: number = 0; i < lines.length; i++) {
        const line: string = lines[i]!;
        for (const pattern of DANGEROUS_PATTERNS) {
          if (line.includes(pattern)) {
            const lineNum: number = i + 1;
            results.push(
              createResult(
                'workspace/no-dangerous-shell-commands',
                filePath,
                lineNum,
                1,
                'error',
                `Dangerous command found at line ${String(lineNum)}: ${relative(ctx.rootDir, filePath)}`,
                {
                  tip: 'Remove or replace the dangerous command',
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
