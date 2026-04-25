/**
 * Rule: workspace/mr-sensitive-path-changes
 *
 * Changes to sensitive file paths require MR approval.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns matching sensitive file paths. */
const SENSITIVE_PATTERNS: Array<RegExp> = [
  /^scripts\//,
  /^\.gitlab\//,
  /^package\.json$/,
  /^\.env/,
  /^infra\//,
  /^Makefile/,
  /^wrangler\.json/,
];

/** Changes to sensitive file paths require MR approval. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-sensitive-path-changes',
  description: 'Changes to sensitive file paths require MR approval.',
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

    const changedFiles: string | undefined = process.env['MR_CHANGED_FILES'];
    if (changedFiles === undefined) {
      return Promise.resolve(results);
    }

    const approved: string | undefined = process.env['MR_APPROVED'];
    const files: Array<string> = changedFiles.split(/[\n\s]+/).filter(Boolean);
    const hasSensitiveChange: boolean = files.some((f: string) =>
      SENSITIVE_PATTERNS.some((p: RegExp) => p.test(f)),
    );

    if (hasSensitiveChange && approved !== '1') {
      results.push(
        createResult(
          'workspace/mr-sensitive-path-changes',
          ctx.rootDir,
          1,
          1,
          'error',
          'Changes to sensitive files require approval',
          {
            tip: 'Add an MR reviewer before merging',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
