/**
 * Rule: workspace/mr-codeowners-approval
 *
 * CODEOWNERS file must exist at expected path.
 *
 * @module
 */

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** CODEOWNERS file must exist. */
const rule: WorkspaceRule = {
  id: 'workspace/mr-codeowners-approval',
  description: 'CODEOWNERS file must exist at expected path.',
  scope: 'workspace',
  categories: ['workspace', 'ci'],
  stages: ['lint', 'check'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;

    return ctx.allFiles();
  },

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

    const codeownersPath: string = `${ctx.rootDir}/.gitlab/CODEOWNERS`;

    try {
      await ctx.readFile(codeownersPath);
    } catch {
      results.push(
        createResult(
          'workspace/mr-codeowners-approval',
          codeownersPath,
          1,
          1,
          'error',
          `CODEOWNERS file missing at: ${codeownersPath}`,
          {
            tip: 'Ensure codeowners are defined for sensitive areas',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
