/**
 * Rule: workspace/mr-open-too-long
 *
 * MR should not remain open for an excessive number of days.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MR should not remain open for an excessive number of days. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-open-too-long',
  description: 'MR should not remain open for an excessive number of days.',
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

    const openedAt: string | undefined = process.env['MR_OPENED_AT'];
    const nowUtc: string | undefined = process.env['NOW_UTC'];

    if (openedAt === undefined || nowUtc === undefined) {
      return Promise.resolve(results);
    }

    const days: number = Math.floor(
      (new Date(nowUtc).getTime() - new Date(openedAt).getTime()) / 86_400_000,
    );

    if (days >= 10) {
      results.push(
        createResult(
          'workspace/mr-open-too-long',
          ctx.rootDir,
          1,
          1,
          'warning',
          `MR has been open for ${String(days)} days`,
          {
            tip: 'Consider merging, closing, or rebasing this MR to avoid staleness',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
