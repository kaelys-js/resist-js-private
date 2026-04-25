/**
 * Rule: workspace/no-untracked-artifacts
 *
 * Detects leftover temp, backup, or OS-specific files
 * (.DS_Store, *.tmp, *.bak) in the repository.
 *
 * @module
 */

import { basename } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns that identify untracked local artifacts. */
const ARTIFACT_PATTERNS: readonly RegExp[] = [/^\.DS_Store$/, /\.tmp$/, /\.bak$/];

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-untracked-artifacts',
  description: 'Repository must not contain temp, backup, or OS-specific artifact files.',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
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
    const results: Array<ReturnType<typeof createResult>> = [];

    for (const filePath of await ctx.allFiles()) {
      const name: string = basename(filePath);
      const isArtifact: boolean = ARTIFACT_PATTERNS.some((pattern: RegExp): boolean =>
        pattern.test(name),
      );

      if (isArtifact) {
        results.push(
          createResult(
            'workspace/no-untracked-artifacts',
            filePath,
            1,
            1,
            'warning',
            `Untracked local artifact: ${name}`,
            {
              tip: 'Add this file to .gitignore or remove it from the working tree',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
