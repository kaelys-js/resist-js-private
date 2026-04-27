/**
 * Rule: workspace/warn-unused-gitignore-patterns
 *
 * Gitignore patterns should match at least one file in the workspace.
 *
 * @module
 */

import { join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Warns when a .gitignore pattern does not match any workspace files. */
const rule: WorkspaceRule = {
  id: 'workspace/warn-unused-gitignore-patterns',
  description: 'Gitignore patterns should match at least one file in the workspace.',
  scope: 'workspace',
  categories: ['workspace', 'git'],
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

    const gitignorePath: string = join(ctx.rootDir, '.gitignore');
    const exists: boolean = await ctx.fileExists(gitignorePath);
    if (!exists) {
      return results;
    }

    let content: string;
    try {
      content = await ctx.readFile(gitignorePath);
    } catch {
      return results;
    }

    /** Collect all workspace file paths (relative) for substring matching. */
    const allPaths: Set<string> = new Set();
    for (const filePath of await ctx.allFiles()) {
      allPaths.add(relative(ctx.rootDir, filePath));
    }

    const lines: string[] = content.split('\n');
    for (let i: number = 0; i < lines.length; i++) {
      const raw: string = lines[i] ?? '';
      const trimmed: string = raw.trim();

      /** Skip empty lines, comments, and negation patterns. */
      if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('!')) {
        continue;
      }

      /** Strip leading slash for matching purposes. */
      const pattern: string = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;

      /** Check if any file path contains the pattern as a substring. */
      let matched: boolean = false;
      for (const filePath of allPaths) {
        if (filePath.includes(pattern)) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        results.push(
          createResult(
            'workspace/warn-unused-gitignore-patterns',
            gitignorePath,
            i + 1,
            1,
            'warning',
            `Gitignore pattern '${trimmed}' does not match any workspace files`,
            {
              tip: 'Remove unused patterns to keep .gitignore clean and maintainable',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
