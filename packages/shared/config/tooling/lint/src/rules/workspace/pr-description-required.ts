/**
 * Rule: workspace/pr-description-required
 *
 * PR/MR description must be at least 10 characters.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Minimum PR description length. */
const MIN_DESCRIPTION_LENGTH: number = 10;

/** PR/MR description must be at least 10 characters. */
const rule: WorkspaceRule = {
  id: 'workspace/pr-description-required',
  description: 'PR/MR description must be at least 10 characters.',
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

    const description: string | undefined = process.env['MR_DESCRIPTION'];
    if (description === undefined) {
      return Promise.resolve(results);
    }

    const trimmed: string = description.trim();
    if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
      results.push(
        createResult(
          'workspace/pr-description-required',
          ctx.rootDir,
          1,
          1,
          'error',
          `PR description is too short (${trimmed.length} chars, minimum ${MIN_DESCRIPTION_LENGTH})`,
          {
            tip: 'Provide a summary in the PR description that explains the changes',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
