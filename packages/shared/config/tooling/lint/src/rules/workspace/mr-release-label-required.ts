/**
 * Rule: workspace/mr-release-label-required
 *
 * MRs targeting release branches must carry the 'release' label.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** MRs targeting release branches must carry the 'release' label. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-release-label-required',
  description: "MRs targeting release branches must carry the 'release' label.",
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

    const targetBranch: string | undefined = process.env['MR_TARGET_BRANCH'];
    if (targetBranch === undefined) {
      return Promise.resolve(results);
    }

    const labels: string = process.env['MR_LABELS'] ?? '';

    if (targetBranch.startsWith('release/') && !labels.includes('release')) {
      results.push(
        createResult(
          'workspace/mr-release-label-required',
          ctx.rootDir,
          1,
          1,
          'error',
          `Missing 'release' label for MR targeting ${targetBranch}`,
          {
            tip: "Add 'release' label to confirm intent to merge into a release branch",
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
