/**
 * Rule: workspace/shell-function-docblocks
 *
 * All check::* functions in .sh files must have proper docblock structure.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern to detect check:: function declarations. */
const FUNC_PATTERN: RegExp = /^(check::[a-zA-Z0-9_-]+)\(\)/;

/** All check::* functions in .sh files must have proper docblock structure. */
const rule: WorkspaceRule = {
  id: 'workspace/shell-function-docblocks',
  description: 'All check::* functions in .sh files must have proper docblock structure.',
  scope: 'workspace',
  categories: ['workspace', 'lint'],
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
        const match: RegExpMatchArray | null = (lines[i] ?? '').match(FUNC_PATTERN);

        if (!match?.[1]) {
          continue;
        }

        const [, funcName] = match;

        /** Extract the function body (lines from declaration to closing }). */
        let body: string = '';
        let braceCount: number = 0;
        let started: boolean = false;

        for (let j: number = i; j < lines.length; j++) {
          const line: string = lines[j] ?? '';
          body += `${line}\n`;
          if (line.includes('{')) {
            braceCount++;
            started = true;
          }
          if (line.includes('}')) {
            braceCount--;
          }
          if (started && braceCount <= 0) {
            break;
          }
        }

        if (!body.includes('# ✅ Check:')) {
          results.push(
            createResult(
              'workspace/shell-function-docblocks',
              filePath,
              i + 1,
              1,
              'error',
              `${funcName} missing '# ✅ Check:' inline comment`,
              {
                tip: 'Add required inline header comments to the function body',
              },
            ),
          );
        }

        if (!body.includes('# Category:')) {
          results.push(
            createResult(
              'workspace/shell-function-docblocks',
              filePath,
              i + 1,
              1,
              'error',
              `${funcName} missing '# Category:' inline comment`,
              {
                tip: 'Add a # Category: comment listing the function categories',
              },
            ),
          );
        }

        if (!body.includes('# Stages:')) {
          results.push(
            createResult(
              'workspace/shell-function-docblocks',
              filePath,
              i + 1,
              1,
              'error',
              `${funcName} missing '# Stages:' inline comment`,
              {
                tip: 'Add a # Stages: comment listing applicable stages',
              },
            ),
          );
        }

        /** Check for raw echo/printf usage. */
        const bodyLines: string[] = body.split('\n');

        for (const bodyLine of bodyLines) {
          const trimmed: string = bodyLine.trim();

          if (trimmed.startsWith('#')) {
            continue;
          }
          if (/\b(echo|printf)\s/.test(trimmed) && !trimmed.includes('log ')) {
            results.push(
              createResult(
                'workspace/shell-function-docblocks',
                filePath,
                i + 1,
                1,
                'error',
                `${funcName} contains raw echo/printf — must use log FATAL/WARN/INFO`,
                {
                  tip: 'Replace echo/printf calls with the log function',
                },
              ),
            );
            break;
          }
        }

        /** Check for exit 1 (should use return 1). */
        if (body.includes('exit 1')) {
          results.push(
            createResult(
              'workspace/shell-function-docblocks',
              filePath,
              i + 1,
              1,
              'error',
              `${funcName} uses 'exit 1' — must use 'return 1' instead`,
              {
                tip: 'Replace exit 1 with return 1 in check functions',
              },
            ),
          );
        }

        /** Check for log FATAL without return 1. */
        if (body.includes('log FATAL') && !body.includes('return 1')) {
          results.push(
            createResult(
              'workspace/shell-function-docblocks',
              filePath,
              i + 1,
              1,
              'error',
              `${funcName} has 'log FATAL' but missing 'return 1'`,
              {
                tip: 'Add return 1 after log FATAL to signal failure',
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
