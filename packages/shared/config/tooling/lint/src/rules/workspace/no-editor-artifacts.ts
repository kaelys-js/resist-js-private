/**
 * Rule: workspace/no-editor-artifacts
 *
 * Editor-specific files should not be committed to version control.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags editor artifacts that should not be committed. */
const rule: WorkspaceRule = {
  id: 'workspace/no-editor-artifacts',
  description: 'Editor-specific files should not be committed to version control.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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

    for await (const filePath of ctx.allFiles()) {
      const relativePath: string = relative(ctx.rootDir, filePath);

      const isEditorArtifact: boolean =
        relativePath.includes('.idea/') ||
        relativePath === '.vscode/launch.json' ||
        relativePath.includes('.vscode/.debug/');

      if (isEditorArtifact) {
        results.push(
          createResult(
            'workspace/no-editor-artifacts',
            filePath,
            1,
            1,
            'error',
            `Editor artifact should not be committed: ${relativePath}`,
            {
              tip: 'Add to .gitignore',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
