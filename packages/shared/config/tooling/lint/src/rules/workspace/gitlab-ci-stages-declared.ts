/**
 * Rule: workspace/gitlab-ci-stages-declared
 *
 * Root .gitlab-ci.yml must contain a top-level stages: key.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Root .gitlab-ci.yml must contain a top-level stages: key. */
const rule: WorkspaceRule = {
  id: 'workspace/gitlab-ci-stages-declared',
  description: 'Root .gitlab-ci.yml must contain a top-level stages: key.',
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

    const ciFile: string = `${ctx.rootDir}/.gitlab-ci.yml`;

    let content: string;
    try {
      content = await ctx.readFile(ciFile);
    } catch {
      return results;
    }

    const hasStages: boolean =
      /^\s*stages:\s*$/m.test(content) || /^\s*stages:\s*\[/m.test(content);

    if (!hasStages) {
      results.push(
        createResult(
          'workspace/gitlab-ci-stages-declared',
          ciFile,
          1,
          1,
          'error',
          "Missing required top-level 'stages:' declaration in .gitlab-ci.yml",
          {
            tip: 'Define the sequence of pipeline stages explicitly',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
