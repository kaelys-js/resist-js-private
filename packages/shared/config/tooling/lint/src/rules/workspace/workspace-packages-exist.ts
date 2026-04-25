/**
 * Rule: workspace/workspace-packages-exist
 *
 * Ensures each workspace glob in pnpm-workspace.yaml matches at least
 * one actual workspace package.
 *
 * @module
 */

import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

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
  id: 'workspace/workspace-packages-exist',
  description: 'Each workspace glob must match at least one workspace package.',
  scope: 'workspace',
  categories: ['workspace', 'pnpm'],
  stages: ['lint', 'ci'],
  fixable: false,
  async inputs(context: unknown): Promise<readonly string[]> {
    const ctx = context as WorkspaceContext;
    try {
      const packages = await ctx.getWorkspacePackages();
      return packages.map((p) => p.path);
    } catch {
      return [];
    }
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

    let packages: WorkspacePackage[];
    try {
      packages = await ctx.getWorkspacePackages();
    } catch {
      return [];
    }

    const results: Array<ReturnType<typeof createResult>> = [];

    for (const glob of globs) {
      const prefix: string = glob.replace(/\/?\*+$/, '').replace(/\/\*\*\/?\*?$/, '');
      if (prefix.length === 0) {
        continue;
      }

      const absolutePrefix: string = join(ctx.rootDir, prefix);
      const hasMatch: boolean = packages.some((pkg: WorkspacePackage): boolean =>
        pkg.dir.startsWith(absolutePrefix),
      );

      if (!hasMatch) {
        results.push(
          createResult(
            'workspace/workspace-packages-exist',
            workspaceFile,
            1,
            1,
            'error',
            `No packages found under workspace glob '${glob}'`,
            {
              tip: 'Ensure each defined workspace path includes at least one valid package',
            },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
