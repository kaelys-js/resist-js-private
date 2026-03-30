/**
 * Rule: workspace/no-oversized-commits
 *
 * Warns when the workspace contains an unusually large number of files,
 * indicating possible oversized commits or untracked build artifacts.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Maximum recommended file count per commit. */
const MAX_FILE_COUNT: number = 50;

/** Warns on oversized commits / large file counts. */
const rule: WorkspaceRule = {
  id: 'workspace/no-oversized-commits',
  description: 'Commits should not modify more than 50 files at once.',
  scope: 'workspace',
  categories: ['workspace', 'git'],
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

    let fileCount: number = 0;
    for await (const _filePath of ctx.allFiles()) {
      fileCount++;
    }

    if (fileCount > MAX_FILE_COUNT) {
      results.push(
        createResult(
          'workspace/no-oversized-commits',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Workspace contains ${String(fileCount)} files — commits modifying >50 files are hard to review`,
          {
            tip: 'Split large changes into smaller, focused commits',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
