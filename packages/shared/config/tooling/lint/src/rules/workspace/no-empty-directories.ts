/**
 * Rule: workspace/no-empty-directories
 *
 * Detects empty directories lacking a `.gitkeep` file.
 * Git doesn't track empty directories, so they'll disappear
 * on clone unless a `.gitkeep` is present.
 *
 * @module
 */

import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Directories to skip during recursive scanning. */
const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.svelte-kit',
  '.turbo',
  'coverage',
  '.next',
  '.cache',
  '.wrangler',
]);

/**
 * Recursively find empty directories missing a `.gitkeep` file.
 *
 * A directory is considered "empty" when it contains zero regular files
 * (non-directory entries) and none of the entries is named `.gitkeep`.
 *
 * @param {string} dir - Directory to scan
 * @param {string} rootDir - Workspace root for computing relative paths
 * @param {string[]} results - Accumulator for empty directory paths (mutated)
 * @returns {Promise<void>} Resolves when scanning is complete
 */
async function findEmptyDirs(dir: string, rootDir: string, results: string[]): Promise<void> {
  let entries: Dirent[];

  try {
    entries = (await readdir(dir, { withFileTypes: true })) as Dirent[];
  } catch {
    return;
  }

  /** Count regular files (non-directory entries) in this directory. */
  let fileCount: number = 0;
  let hasGitkeep: boolean = false;

  for (const entry of entries) {
    const name: string = entry.name as string;

    if (!entry.isDirectory()) {
      fileCount++;
      if (name === '.gitkeep') {
        hasGitkeep = true;
      }
    }
  }

  /** Flag this directory if it has no files and no .gitkeep. */
  if (fileCount === 0 && !hasGitkeep) {
    const relativePath: string = relative(rootDir, dir);
    /* Don't flag the root directory itself */

    if (relativePath.length > 0) {
      results.push(relativePath);
    }
  }

  /** Recurse into subdirectories, skipping ignored dirs. */
  for (const entry of entries) {
    const name: string = entry.name as string;

    if (entry.isDirectory() && !SKIP_DIRS.has(name)) {
      await findEmptyDirs(join(dir, name), rootDir, results);
    }
  }
}

/** Description. */
const rule: WorkspaceRule = {
  id: 'workspace/no-empty-directories',
  description: 'Empty directories must have a .gitkeep to survive Git clone.',
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

    const emptyDirs: string[] = [];
    await findEmptyDirs(ctx.rootDir, ctx.rootDir, emptyDirs);

    const results: Array<ReturnType<typeof createResult>> = [];

    for (const relativePath of emptyDirs) {
      results.push(
        createResult(
          'workspace/no-empty-directories',
          join(ctx.rootDir, relativePath),
          1,
          1,
          'warning',
          `Empty directory missing .gitkeep: ${relativePath}`,
          {
            tip: 'Add a .gitkeep file to preserve empty directories in Git',
          },
        ),
      );
    }

    return results;
  },
};

export default rule;
