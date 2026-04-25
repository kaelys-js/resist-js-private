/**
 * Rule: workspace/no-broken-symlinks
 *
 * Detects broken symlinks in node_modules/ which indicate
 * a corrupted pnpm install.
 *
 * @module
 */

import type { Dirent } from 'node:fs';
import { readdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/**
 * Recursively find broken symlinks in a directory.
 *
 * @param {string} dir - Directory to scan
 * @param {string[]} results - Accumulator for broken symlink paths (mutated)
 * @returns {Promise<void>} Resolves when scanning is complete
 */
async function findBrokenSymlinks(dir: string, results: string[]): Promise<void> {
  let entries: Dirent[];
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    return;
  }

  for (const entry of entries) {
    const name: string = entry.name as string;
    const fullPath: string = join(dir, name);

    if (entry.isSymbolicLink()) {
      try {
        await realpath(fullPath);
      } catch {
        results.push(fullPath);
      }
    } else if (entry.isDirectory()) {
      await findBrokenSymlinks(fullPath, results);
    }
  }
}

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-broken-symlinks',
  description: 'Detect broken symlinks in node_modules (corrupted install)',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,
  /* Caching is opt-out: this rule reads filesystem directly via node:fs (image/symlink inspection). */
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
    const nodeModulesDir: string = join(ctx.rootDir, 'node_modules');

    const dirPresent: boolean = await ctx.dirExists(nodeModulesDir);
    if (!dirPresent) {
      return [];
    }

    const brokenLinks: string[] = [];
    await findBrokenSymlinks(nodeModulesDir, brokenLinks);

    const results: Array<ReturnType<typeof createResult>> = [];
    for (const link of brokenLinks) {
      results.push(
        createResult(
          'workspace/no-broken-symlinks',
          link,
          1,
          1,
          'error',
          `Broken symlink detected in node_modules: ${link}`,
          {
            tip: 'Try reinstalling modules: pnpm install --force',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
