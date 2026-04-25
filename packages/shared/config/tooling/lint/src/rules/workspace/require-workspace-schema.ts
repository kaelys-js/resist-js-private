/**
 * Rule: workspace/require-workspace-schema
 *
 * Ensures pnpm-workspace.yaml declares a $schema comment for IDE validation.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/require-workspace-schema',
  description: 'pnpm-workspace.yaml must declare a $schema comment for IDE validation.',
  scope: 'workspace',
  categories: ['workspace', 'pnpm'],
  stages: ['lint', 'ci'],
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
    const workspaceFile: string = join(ctx.rootDir, 'pnpm-workspace.yaml');

    const exists: boolean = await ctx.fileExists(workspaceFile);
    if (!exists) {
      return [];
    }

    const content: string = await ctx.readFile(workspaceFile);

    if (!content.includes('# yaml-language-server: $schema=')) {
      return [
        createResult(
          'workspace/require-workspace-schema',
          workspaceFile,
          1,
          1,
          'warning',
          '$schema declaration missing in pnpm-workspace.yaml',
          {
            tip: 'Add the schema comment as the first line to enable IDE validation and autocomplete',
          },
        ),
      ];
    }

    return [];
  },
};

export default rule;
