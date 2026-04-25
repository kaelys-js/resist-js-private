/**
 * Rule: workspace/mr-license-change-reviewed
 *
 * License-related file changes require legal-approved label.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** License-related file changes require legal-approved label. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-license-change-reviewed',
  description: 'License-related file changes require legal-approved label.',
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

    const changedFilesRaw: string | undefined = process.env['MR_CHANGED_FILES'];
    if (changedFilesRaw === undefined) {
      return Promise.resolve(results);
    }

    const files: Array<string> = changedFilesRaw
      .split(/[\n\s]+/)
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 0);

    const labels: string = process.env['MR_LABELS'] ?? '';

    const hasLicenseFile: boolean = files.some((f: string) =>
      /^LICENSE$|^NOTICE$|^COPYRIGHT|^LEGAL/.test(f),
    );

    if (hasLicenseFile && !labels.includes('legal-approved')) {
      results.push(
        createResult(
          'workspace/mr-license-change-reviewed',
          ctx.rootDir,
          1,
          1,
          'error',
          'License-related file modified without legal-approved label',
          {
            tip: "Add label 'legal-approved' after confirmation by legal or compliance lead",
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
