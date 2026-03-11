/**
 * Changelog API — Git history per component directory.
 *
 * Server route that runs `git log` on the component's UI source directory
 * and returns the most recent commits as structured JSON.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str } from '@/schemas/common';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Maximum number of commits to return per component. */
const MAX_ENTRIES: Num = 30 as Num;

/** A single changelog entry derived from a git commit. */
type ChangelogEntry = {
  /** Abbreviated commit hash. */
  hash: Str;
  /** Commit message (first line only). */
  message: Str;
  /** ISO 8601 date string. */
  date: Str;
  /** Author name. */
  author: Str;
};

/** In-memory cache keyed by component name. */
const cache: Map<Str, ChangelogEntry[]> = new Map();

/**
 * Resolve the absolute path to `packages/shared/ui/src/` from the project root.
 *
 * @returns Absolute path to the UI source directory
 */
function resolveUiSrcDir(): Str {
  const currentDir: Str = dirname(fileURLToPath(import.meta.url)) as Str;
  let dir: Str = currentDir;
  for (let i: Num = 0 as Num; i < 20; i++) {
    try {
      statSync(join(dir, 'pnpm-workspace.yaml'));
      return join(dir, 'packages', 'shared', 'ui', 'src') as Str;
    } catch {
      /* Not the root yet — continue walking up */
      dir = dirname(dir) as Str;
    }
  }
  return join(
    currentDir,
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    '..',
    'shared',
    'ui',
    'src',
  ) as Str;
}

/**
 * Get git log entries for a component directory.
 *
 * @param componentName - Kebab-case component directory name
 * @returns Array of changelog entries
 */
function getChangelog(componentName: Str): ChangelogEntry[] {
  const cached: ChangelogEntry[] | undefined = cache.get(componentName);
  if (cached) return cached;

  const uiSrcDir: Str = resolveUiSrcDir();
  const componentDir: Str = join(uiSrcDir, componentName) as Str;

  try {
    statSync(componentDir);
  } catch {
    /* Component directory doesn't exist */
    return [];
  }

  try {
    const output: Str = execSync(
      `git log --follow --format="%h|||%s|||%aI|||%an" -n ${MAX_ENTRIES} -- "${componentDir}"`,
      { encoding: 'utf8', timeout: 5000 },
    ).trim() as Str;

    if (!output) return [];

    const entries: ChangelogEntry[] = output
      .split('\n')
      .map((line: Str): ChangelogEntry | null => {
        const parts: Str[] = line.split('|||');
        if (parts.length < 4) return null;
        return {
          hash: (parts[0] ?? '') as Str,
          message: (parts[1] ?? '') as Str,
          date: (parts[2] ?? '') as Str,
          author: (parts[3] ?? '') as Str,
        };
      })
      .filter((e: ChangelogEntry | null): e is ChangelogEntry => e !== null);

    cache.set(componentName, entries);
    return entries;
  } catch {
    /* git command failed — return empty */
    return [];
  }
}

/**
 * GET handler — returns git changelog for a specific component.
 *
 * @param root0 - SvelteKit request event
 * @param root0.params - Route parameters containing `name`
 * @returns JSON response with changelog entries
 */
export const GET: RequestHandler = ({ params }) => {
  const name: Str = (params.name ?? '') as Str;
  if (!name) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entries: ChangelogEntry[] = getChangelog(name);

  return new Response(JSON.stringify(entries), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};
