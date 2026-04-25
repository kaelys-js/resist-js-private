/**
 * Rule: workspace/workspace-spelling
 *
 * Run cspell to detect spelling errors across the workspace.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Run cspell to detect spelling errors across the workspace. */
const rule: WorkspaceRule = {
  id: 'workspace/workspace-spelling',
  description: 'Run cspell to detect spelling errors across the workspace.',
  scope: 'workspace',
  categories: ['workspace', 'lint'],
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

    try {
      execSync('cspell --no-progress --no-color .', {
        cwd: ctx.rootDir,
        stdio: 'pipe',
      });
    } catch (err: unknown) {
      const stderr: string =
        err instanceof Error && 'stderr' in err
          ? String((err as Error & { stderr: Buffer }).stderr)
          : '';
      const stdout: string =
        err instanceof Error && 'stdout' in err
          ? String((err as Error & { stdout: Buffer }).stdout)
          : '';
      const output: string = stderr || stdout || 'Unknown spelling errors';

      results.push(
        createResult(
          'workspace/workspace-spelling',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Spelling errors found in workspace: ${output.slice(0, 200)}`,
          {
            tip: 'Fix spelling errors or add approved words to cspell config',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
