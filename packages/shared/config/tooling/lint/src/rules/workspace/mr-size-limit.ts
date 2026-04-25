/**
 * Rule: workspace/mr-size-limit
 *
 * MR must not exceed 800 total lines changed or 20 files changed.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Maximum total lines changed. */
const MAX_LINES: number = 800;

/** Maximum files changed. */
const MAX_FILES: number = 20;

/** MR must not exceed size limits. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-size-limit',
  description: 'MR must not exceed 800 total lines changed or 20 files changed.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  /* Caching is opt-out: this rule depends on CI environment variables (process.env). */
  check(context: unknown): Promise<
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

    const added: string | undefined = process.env['MR_LINES_ADDED'];
    const removed: string | undefined = process.env['MR_LINES_REMOVED'];
    const filesChanged: string | undefined = process.env['MR_FILES_CHANGED'];

    if (added === undefined && removed === undefined && filesChanged === undefined) {
      return Promise.resolve(results);
    }

    const totalLines: number = Number(added ?? '0') + Number(removed ?? '0');
    if (totalLines > MAX_LINES) {
      results.push(
        createResult(
          'workspace/mr-size-limit',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Merge request modifies too many lines: ${String(totalLines)}`,
          {
            tip: 'Split this MR into smaller parts for easier review',
          },
        ),
      );
    }

    const files: number = Number(filesChanged ?? '0');
    if (files > MAX_FILES) {
      results.push(
        createResult(
          'workspace/mr-size-limit',
          ctx.rootDir,
          1,
          1,
          'warning',
          `Merge request touches too many files: ${String(files)}`,
          {
            tip: 'Refactor MR scope or split into smaller MRs',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
