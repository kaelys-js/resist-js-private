/**
 * Rule: workspace/gitlab-ci-file-required
 *
 * .gitlab-ci.yml must exist at the project root.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** .gitlab-ci.yml must exist at the project root. */
const rule: WorkspaceRule = {
  id: 'workspace/gitlab-ci-file-required',
  description: '.gitlab-ci.yml must exist at the project root.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
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

    const allFiles: readonly string[] = await ctx.allFiles();
    const ciFile: string = `${ctx.rootDir}/.gitlab-ci.yml`;
    const found: boolean = allFiles.some(
      (f: string): boolean => f === ciFile || f.endsWith('/.gitlab-ci.yml'),
    );

    if (!found) {
      results.push(
        createResult(
          'workspace/gitlab-ci-file-required',
          ciFile,
          1,
          1,
          'error',
          'Missing .gitlab-ci.yml at project root',
          {
            tip: 'Create this file to define your CI/CD pipeline stages',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
