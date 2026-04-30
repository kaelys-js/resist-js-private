/**
 * Rule: workspace/no-test-dir-workspace-globs
 *
 * Ensures workspace globs in pnpm-workspace.yaml do not include
 * test, fixtures, or examples directories.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Regex matching test, fixtures, or examples directory segments. */
const INVALID_DIR_PATTERN: RegExp = /(^|\/)(test|tests|fixtures|examples)(\/|$)/;

/**
 * Parse workspace globs from pnpm-workspace.yaml content.
 *
 * @param {string} content - YAML file content
 * @returns {string[]} Array of glob entries from packages: field
 */
function parseWorkspaceGlobs(content: string): string[] {
  const lines: string[] = content.split('\n');
  let inPackages: boolean = false;
  const globs: string[] = [];

  for (const line of lines) {
    const trimmed: string = line.trim();

    if (trimmed === 'packages:') {
      inPackages = true;
      continue;
    }

    if (inPackages) {
      if (trimmed.length > 0 && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
        break;
      }

      if (trimmed.startsWith('- ')) {
        const pattern: string = trimmed.slice(2).trim().replace(/^['"]/, '').replace(/['"]$/, '');

        if (pattern.length > 0) {
          globs.push(pattern);
        }
      }
    }
  }

  return globs;
}

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-test-dir-workspace-globs',
  description: 'Workspace globs must not include test, fixtures, or examples directories.',
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
    const globs: string[] = parseWorkspaceGlobs(content);
    const results: Array<ReturnType<typeof createResult>> = [];

    for (const glob of globs) {
      if (INVALID_DIR_PATTERN.test(glob)) {
        results.push(
          createResult(
            'workspace/no-test-dir-workspace-globs',
            workspaceFile,
            1,
            1,
            'error',
            `Workspace glob includes invalid directory: ${glob}`,
            {
              tip: 'Only include actual package roots, not test or fixture folders',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
