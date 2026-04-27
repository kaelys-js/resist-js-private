/**
 * Rule: workspace/require-gitignore
 *
 * Ensures .gitignore exists at project root with no duplicate patterns.
 *
 * @module
 */

import { relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Validates .gitignore existence, trailing newline, and no duplicate patterns. */
const rule: WorkspaceRule = {
  id: 'workspace/require-gitignore',
  description: '.gitignore must exist at project root with no duplicate patterns.',
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

    let found: boolean = false;
    let rootFilePath: string = '';
    let rootContent: string = '';

    for (const filePath of await ctx.allFiles()) {
      const rel: string = relative(ctx.rootDir, filePath);
      if (rel === '.gitignore') {
        found = true;
        rootFilePath = filePath;
        rootContent = await ctx.readFile(filePath);
      }
    }

    if (!found) {
      results.push(
        createResult(
          'workspace/require-gitignore',
          `${ctx.rootDir}/.gitignore`,
          1,
          1,
          'error',
          'Missing .gitignore at project root',
          {
            tip: 'Add a .gitignore to prevent committing build artifacts and dependencies',
          },
        ),
      );
      return results;
    }

    if (rootContent.trim().length === 0) {
      results.push(
        createResult(
          'workspace/require-gitignore',
          rootFilePath,
          1,
          1,
          'error',
          '.gitignore is empty',
          {
            tip: 'Add ignore patterns for node_modules, dist, and other build artifacts',
          },
        ),
      );
      return results;
    }

    if (!rootContent.endsWith('\n')) {
      results.push(
        createResult(
          'workspace/require-gitignore',
          rootFilePath,
          1,
          1,
          'error',
          '.gitignore is missing trailing newline',
          {
            tip: 'Add a trailing newline at the end of the file',
          },
        ),
      );
    }

    const lines: string[] = rootContent.split('\n');
    const patterns: string[] = lines.filter(
      (line: string) => line.trim().length > 0 && !line.trimStart().startsWith('#'),
    );

    const seen: Set<string> = new Set<string>();
    const duplicates: string[] = [];
    for (const pattern of patterns) {
      const trimmed: string = pattern.trim();
      if (seen.has(trimmed)) {
        duplicates.push(trimmed);
      }
      seen.add(trimmed);
    }

    if (duplicates.length > 0) {
      results.push(
        createResult(
          'workspace/require-gitignore',
          rootFilePath,
          1,
          1,
          'error',
          `Duplicate ignore patterns in .gitignore: ${duplicates.join(', ')}`,
          {
            tip: 'Remove duplicate patterns to keep the file clean',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
