/**
 * Rule: sync/pnpm-workspace
 *
 * Ensures pnpm-workspace.yaml patterns match actual package directories.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/**
 * Parse pnpm-workspace.yaml to extract package patterns with line numbers.
 *
 * @param content - YAML file content
 * @returns Array of { pattern, line } objects
 */
function parseWorkspacePatterns(content: string): Array<{ pattern: string; line: number }> {
  const results: Array<{ pattern: string; line: number }> = [];
  const lines: string[] = content.split('\n');
  let inPackages: boolean = false;

  for (let i: number = 0; i < lines.length; i++) {
    const trimmed: string = (lines[i] ?? '').trim();

    if (trimmed === 'packages:') {
      inPackages = true;
      continue;
    }

    if (inPackages) {
      /* Stop at next top-level key */
      if (trimmed.length > 0 && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
        break;
      }

      if (trimmed.startsWith('- ')) {
        const pattern: string = trimmed.slice(2).trim().replace(/^['"]/, '').replace(/['"]$/, '');
        if (pattern.length > 0) {
          results.push({ pattern, line: i + 1 });
        }
      }
    }
  }

  return results;
}

/**
 * Determine if a pattern is a glob (contains wildcard characters).
 *
 * @param pattern - The workspace pattern
 * @returns Whether the pattern contains glob characters
 */
function isGlobPattern(pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?') || pattern.includes('{');
}

/** Validates pnpm-workspace.yaml patterns match actual directories. */
const rule: WorkspaceRule = {
  id: 'sync/pnpm-workspace',
  description: 'pnpm-workspace.yaml patterns must match actual packages.',
  scope: 'workspace',
  categories: ['sync', 'workspace'],
  stages: ['lint', 'ci'],
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

    const workspacePath: string = join(ctx.rootDir, 'pnpm-workspace.yaml');
    if (!(await ctx.fileExists(workspacePath))) {
      return results;
    }

    let content: string;
    try {
      content = await ctx.readFile(workspacePath);
    } catch {
      return results;
    }

    const patterns: Array<{ pattern: string; line: number }> = parseWorkspacePatterns(content);

    await Promise.all(
      patterns.map(async (entry: { pattern: string; line: number }): Promise<void> => {
        if (isGlobPattern(entry.pattern)) {
          /* For glob patterns, check if the base directory exists.
           * e.g. 'packages/**' → check 'packages/' exists */
          const baseDir: string = entry.pattern.replace(/\/\*.*$/, '');
          if (baseDir.length > 0 && baseDir !== entry.pattern) {
            const resolvedBase: string = join(ctx.rootDir, baseDir);
            const baseDirExists: boolean = await ctx.dirExists(resolvedBase);
            if (!baseDirExists) {
              results.push(
                createResult(
                  'sync/pnpm-workspace',
                  workspacePath,
                  entry.line,
                  1,
                  'warning',
                  `Workspace pattern '${entry.pattern}' base directory '${baseDir}' doesn't exist`,
                  {
                    tip: `Create the '${baseDir}' directory or remove the pattern`,
                  },
                ),
              );
            }
          }
        } else {
          /* Non-glob pattern — directory must exist exactly */
          const resolvedPath: string = join(ctx.rootDir, entry.pattern);
          const dirOk: boolean = await ctx.dirExists(resolvedPath);
          if (!dirOk) {
            results.push(
              createResult(
                'sync/pnpm-workspace',
                workspacePath,
                entry.line,
                1,
                'warning',
                `Workspace pattern '${entry.pattern}' doesn't match any directory`,
                {
                  tip: `Create the directory at '${entry.pattern}' or remove the pattern`,
                },
              ),
            );
          }
        }
      }),
    );

    return results;
  },
};

export default rule;
