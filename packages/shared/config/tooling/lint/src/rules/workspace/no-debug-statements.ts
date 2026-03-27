/**
 * Rule: workspace/no-debug-statements
 *
 * TypeScript files must not contain debug statements such as
 * console.log, console.debug, console.dir, debugger, or alert.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Debug statement patterns to detect. */
const DEBUG_PATTERNS: readonly string[] = [
  'console.log(',
  'console.debug(',
  'console.dir(',
  'debugger',
  'alert(',
];

/** TypeScript files must not contain debug statements. */
const rule: WorkspaceRule = {
  id: 'workspace/no-debug-statements',
  description: 'Files must not contain debug statements.',
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
      if (!filePath.endsWith('.ts')) {
        continue;
      }
      if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) {
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
        const line: string = lines[i] ?? '';
        for (const pattern of DEBUG_PATTERNS) {
          if (line.includes(pattern)) {
            const lineNum: number = i + 1;
            results.push(
              createResult(
                'workspace/no-debug-statements',
                filePath,
                lineNum,
                1,
                'warning',
                `Debug statement at line ${String(lineNum)}: ${relative(ctx.rootDir, filePath)}`,
                {
                  tip: 'Remove debug statements before committing',
                  source: line,
                },
              ),
            );
            break;
          }
        }
      }
    }

    return results;
  },
};

export default rule;
