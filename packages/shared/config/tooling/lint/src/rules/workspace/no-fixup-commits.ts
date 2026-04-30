/**
 * Rule: workspace/no-fixup-commits
 *
 * The git log must not contain fixup! or squash! commits,
 * which indicate pending interactive rebase work.
 *
 * @module
 */

import { execSync } from 'node:child_process';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags fixup! or squash! commits in the git log. */
const rule: WorkspaceRule = {
  id: 'workspace/no-fixup-commits',
  description: 'The git log must not contain fixup! or squash! commits.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    let logOutput: string;

    try {
      logOutput = execSync('git log --oneline', { cwd: ctx.rootDir, encoding: 'utf8' });
    } catch {
      return results;
    }

    const lines: string[] = logOutput.split('\n');
    const fixupLines: string[] = [];

    for (const line of lines) {
      /** git log --oneline format: "<hash> <message>" — check message portion */
      const spaceIdx: number = line.indexOf(' ');

      if (spaceIdx === -1) {
        continue;
      }

      const message: string = line.slice(spaceIdx + 1);

      if (message.startsWith('fixup!') || message.startsWith('squash!')) {
        fixupLines.push(line.trim());
      }
    }

    for (const commitLine of fixupLines) {
      results.push(
        createResult(
          'workspace/no-fixup-commits',
          ctx.rootDir,
          1,
          1,
          'error',
          `Fixup/squash commit found in git log: ${commitLine}`,
          {
            tip: 'Run git rebase -i to squash these commits before merging',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
