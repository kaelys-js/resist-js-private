/**
 * Rule: workspace/mr-config-changes-approved
 *
 * Critical config file changes require the 'config-approved' label.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Critical config file changes require the 'config-approved' label. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-config-changes-approved',
  description: "Critical config file changes require the 'config-approved' label.",
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

    const labels: string | undefined = process.env['MR_LABELS'];
    const files: Array<string> = changedFiles.split(/[\n\s]+/).filter(Boolean);
    const configPattern: RegExp =
      /\.(secrets|json|yaml|yml|toml)$|\.env($|\.)|infra\/|wrangler\.json|tsconfig/;
    const hasConfigChange: boolean = files.some((f: string) => configPattern.test(f));

    if (hasConfigChange && (!labels || !labels.includes('config-approved'))) {
      results.push(
        createResult(
          'workspace/mr-config-changes-approved',
          ctx.rootDir,
          1,
          1,
          'error',
          "Critical config change without 'config-approved' label",
          {
            tip: 'Add label after ops/security/infrastructure review',
          },
        ),
      );
    }

    return Promise.resolve(results);
  },
};

export default rule;
