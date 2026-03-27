/**
 * Rule: workspace/no-nested-git-folders
 *
 * Workspace must not contain nested .git directories.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Flags files inside nested .git directories (not the root .git). */
const rule: WorkspaceRule = {
  id: 'workspace/no-nested-git-folders',
  description: 'Workspace must not contain nested .git directories.',
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
    const reported: Set<string> = new Set<string>();

    for await (const filePath of ctx.allFiles()) {
      const rel: string = relative(ctx.rootDir, filePath);
      const segments: string[] = rel.split('/');
      const gitIndex: number = segments.indexOf('.git');
      if (gitIndex !== -1) {
        const nestedGitDir: string = segments.slice(0, gitIndex + 1).join('/');
        if (!reported.has(nestedGitDir)) {
          reported.add(nestedGitDir);
          results.push(
            createResult(
              'workspace/no-nested-git-folders',
              filePath,
              1,
              1,
              'error',
              `Nested .git folder detected: ${nestedGitDir}`,
              {
                tip: 'Remove nested .git directories — only one should exist at root.',
              },
            ),
          );
        }
      }
    }

    return results;
  },
};

export default rule;
