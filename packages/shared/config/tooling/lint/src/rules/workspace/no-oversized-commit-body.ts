/**
 * Rule: workspace/no-oversized-commit-body
 *
 * Commit message bodies must not exceed 20 lines or 1000 characters.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags commit messages with oversized bodies. */
const rule: WorkspaceRule = {
  id: 'workspace/no-oversized-commit-body',
  description: 'Commit message bodies must not exceed 20 lines or 1000 characters.',
  scope: 'workspace',
  categories: ['workspace', 'git'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on git/CI state via execSync. */
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

    const MAX_LINES: number = 20;
    const MAX_CHARS: number = 1000;

    let logOutput: string;
    try {
      logOutput = execSync('git log --pretty=format:%h%n%B%n---COMMIT-END--- -20', {
        cwd: ctx.rootDir,
        encoding: 'utf8',
      });
    } catch {
      return results;
    }

    const commitBlocks: string[] = logOutput.split('---COMMIT-END---');

    for (const block of commitBlocks) {
      const lines: string[] = block.split('\n');
      const hash: string = lines[0]?.trim() ?? '';

      if (!hash) {
        continue;
      }

      /** Skip the first line (hash) to get the body */
      const bodyLines: string[] = lines.slice(1);
      const body: string = bodyLines.join('\n').trim();
      const bodyLineCount: number = body.split('\n').length;
      const bodyCharCount: number = body.length;

      if (bodyLineCount > MAX_LINES || bodyCharCount > MAX_CHARS) {
        results.push(
          createResult(
            'workspace/no-oversized-commit-body',
            ctx.rootDir,
            1,
            1,
            'warning',
            `Commit ${hash} has oversized body (${String(bodyLineCount)} lines, ${String(bodyCharCount)} chars)`,
            {
              tip: `Keep commit bodies under ${String(MAX_LINES)} lines and ${String(MAX_CHARS)} characters`,
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
