/**
 * Rule: workspace/mr-automerge-not-enabled-by-default
 *
 * Automerge must only be enabled after CI passes and reviewer approval.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Automerge must only be enabled after CI passes and reviewer approval. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-automerge-not-enabled-by-default',
  description: 'Automerge must only be enabled after CI passes and reviewer approval.',
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

    const automergeEnabled: string | undefined = process.env['MR_AUTOMERGE_ENABLED'];
    if (automergeEnabled === undefined) {
      return Promise.resolve(results);
    }

    if (automergeEnabled !== '1') {
      return Promise.resolve(results);
    }

    const pipelineStatus: string | undefined = process.env['MR_PIPELINE_STATUS'];
    if (pipelineStatus !== 'success') {
      results.push(
        createResult(
          'workspace/mr-automerge-not-enabled-by-default',
          ctx.rootDir,
          1,
          1,
          'error',
          `Automerge is enabled but pipeline has not succeeded (status: ${pipelineStatus ?? 'unknown'})`,
          {
            tip: 'Automerge should only be enabled after passing CI',
          },
        ),
      );
    }

    const approved: string | undefined = process.env['MR_APPROVED'];
    if (approved !== '1') {
      results.push(
        createResult(
          'workspace/mr-automerge-not-enabled-by-default',
          ctx.rootDir,
          1,
          1,
          'error',
          'Automerge is enabled without reviewer approval',
          {
            tip: 'Wait for approval before enabling automerge',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
