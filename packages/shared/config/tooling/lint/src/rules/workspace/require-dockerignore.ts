/**
 * Rule: workspace/require-dockerignore
 *
 * .dockerignore must exist at project root with no duplicate patterns.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Ensures .dockerignore exists at root with no duplicate patterns. */
const rule: WorkspaceRule = {
  id: 'workspace/require-dockerignore',
  description: '.dockerignore must exist at project root with no duplicate patterns.',
  scope: 'workspace',
  categories: ['workspace', 'tooling'],
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

    let dockerignorePath: string | undefined;

    for (const filePath of await ctx.allFiles()) {
      const relativePath: string = relative(ctx.rootDir, filePath);
      if (relativePath === '.dockerignore') {
        dockerignorePath = filePath;
        break;
      }
    }

    if (dockerignorePath === undefined) {
      results.push(
        createResult(
          'workspace/require-dockerignore',
          ctx.rootDir,
          1,
          1,
          'error',
          'Missing .dockerignore at project root',
          {
            tip: 'Create a .dockerignore file at the project root to exclude unnecessary files from Docker builds.',
          },
        ),
      );
      return results;
    }

    const content: string = await ctx.readFile(dockerignorePath);

    if (content.trim().length === 0) {
      results.push(
        createResult(
          'workspace/require-dockerignore',
          dockerignorePath,
          1,
          1,
          'error',
          '.dockerignore is empty',
          {
            tip: 'Add patterns to .dockerignore to exclude node_modules, .git, and other non-essential files.',
          },
        ),
      );
      return results;
    }

    if (!content.endsWith('\n')) {
      results.push(
        createResult(
          'workspace/require-dockerignore',
          dockerignorePath,
          1,
          1,
          'error',
          '.dockerignore must end with a trailing newline',
          {
            tip: 'Add a newline at the end of .dockerignore.',
          },
        ),
      );
    }

    const lines: string[] = content.split('\n');
    const patterns: string[] = lines.filter(
      (line: string) => line.trim().length > 0 && !line.trim().startsWith('#'),
    );

    const seen: Set<string> = new Set<string>();
    const duplicates: string[] = [];

    for (const pattern of patterns) {
      const trimmed: string = pattern.trim();
      if (seen.has(trimmed)) {
        duplicates.push(trimmed);
      } else {
        seen.add(trimmed);
      }
    }

    if (duplicates.length > 0) {
      results.push(
        createResult(
          'workspace/require-dockerignore',
          dockerignorePath,
          1,
          1,
          'error',
          `Duplicate patterns in .dockerignore: ${duplicates.join(', ')}`,
          {
            tip: 'Remove duplicate patterns from .dockerignore to keep it clean and maintainable.',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
