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
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Maximum number of commits to return per request. */
const MAX_ENTRIES: Num = 100 as Num;

/** Null-byte field separator for git log format (safe — cannot appear in commit text). */
const FIELD_SEP: Str = '\u0000' as Str;

/** Record separator between commits (ASCII RS character). */
const RECORD_SEP: Str = '\u001E' as Str;

/** A single changelog entry derived from a git commit. */
type ChangelogEntry = {
  /** Abbreviated commit hash. */
  hash: Str;
  /** Commit subject (first line only). */
  message: Str;
  /** Extended commit body (lines after subject, may be empty). */
  body: Str;
  /** ISO 8601 date string. */
  date: Str;
  /** Author name. */
  author: Str;
};

/** In-memory cache keyed by component name. */
const cache: Map<Str, ChangelogEntry[]> = new Map();

/** Cached GitHub repo base URL (e.g. "https://github.com/org/repo"). Empty if unavailable. */
let repoUrlCache: Str | null = null;

/**
 * Detect the GitHub repository base URL from git remote origin.
 *
 * Parses SSH (`git@github.com:org/repo.git`) and HTTPS (`https://github.com/org/repo.git`)
 * remote formats into a browseable URL.
 *
 * @returns GitHub repo URL or empty string if not available
 */
function detectRepoUrl(): Str {
  if (repoUrlCache !== null) return repoUrlCache;
  try {
    const remote: Str = execSync('git remote get-url origin', {
      encoding: 'utf8',
      timeout: 3000,
    }).trim() as Str;
    let url: Str = remote;
    /* SSH format: git@github.com:org/repo.git → https://github.com/org/repo */
    const sshMatch: RegExpMatchArray | null = remote.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
    if (sshMatch) {
      url = `https://${sshMatch[1]}/${sshMatch[2]}` as Str;
    } else {
      /* HTTPS format: strip trailing .git */
      url = remote.replace(/\.git$/, '') as Str;
    }
    repoUrlCache = url;
    return url;
  } catch {
    /* git remote not available */
    repoUrlCache = '' as Str;
    return '' as Str;
  }
}

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

/** Cached total commit count per component (separate from entry cache). */
const totalCache: Map<Str, Num> = new Map();

/**
 * Count total commits touching a component directory.
 *
 * @param componentDir - Absolute path to the component directory
 * @returns Total commit count
 */
function countTotalCommits(componentDir: Str): Num {
  try {
    const output: Str = execSync(`git rev-list --count HEAD -- "${componentDir}"`, {
      encoding: 'utf8',
      timeout: 5000,
    }).trim() as Str;
    return (Number.parseInt(output, 10) || 0) as Num;
  } catch {
    /* git command failed — return 0 */
    return 0 as Num;
  }
}

/**
 * Get git log entries for a component directory.
 *
 * Uses null-byte field separator and ASCII RS record separator to safely
 * handle multi-line commit bodies without delimiter collisions.
 *
 * @param componentName - Kebab-case component directory name
 * @returns Object with entries array and total commit count
 */
function getChangelog(componentName: Str): { entries: ChangelogEntry[]; total: Num } {
  const cached: ChangelogEntry[] | undefined = cache.get(componentName);
  const cachedTotal: Num | undefined = totalCache.get(componentName);
  if (cached && cachedTotal !== undefined) return { entries: cached, total: cachedTotal };

  const uiSrcDir: Str = resolveUiSrcDir();
  const componentDir: Str = join(uiSrcDir, componentName) as Str;

  try {
    statSync(componentDir);
  } catch {
    /* Component directory doesn't exist */
    return { entries: [], total: 0 as Num };
  }

  try {
    /* Use null-byte (%x00) between fields and RS (%x1e) between records */
    const format: Str =
      `%h${FIELD_SEP}%s${FIELD_SEP}%b${FIELD_SEP}%aI${FIELD_SEP}%an${RECORD_SEP}` as Str;
    const output: Str = execSync(
      `git log --follow --format="${format}" -n ${MAX_ENTRIES} -- "${componentDir}"`,
      { encoding: 'utf8', timeout: 10_000 },
    ).trim() as Str;

    if (!output) return { entries: [], total: 0 as Num };

    const total: Num = countTotalCommits(componentDir);

    const entries: ChangelogEntry[] = output
      .split(RECORD_SEP)
      .filter((record: Str): boolean => record.trim().length > 0)
      .map((record: Str): ChangelogEntry | null => {
        const parts: Str[] = record.trim().split(FIELD_SEP) as Str[];
        if (parts.length < 5) return null;
        return {
          hash: (parts[0] ?? '') as Str,
          message: (parts[1] ?? '') as Str,
          body: (parts[2] ?? '').trim() as Str,
          date: (parts[3] ?? '') as Str,
          author: (parts[4] ?? '') as Str,
        };
      })
      .filter((e: ChangelogEntry | null): e is ChangelogEntry => e !== null);

    cache.set(componentName, entries);
    totalCache.set(componentName, total);
    return { entries, total };
  } catch {
    /* git command failed — return empty */
    return { entries: [], total: 0 as Num };
  }
}

/**
 * Convert a kebab-case name to PascalCase.
 *
 * @param kebab - Kebab-case string (e.g. "copy-button")
 * @returns PascalCase string (e.g. "CopyButton")
 */
function toPascalCase(kebab: Str): Str {
  return kebab
    .split('-')
    .map((seg: Str): Str => (seg.charAt(0).toUpperCase() + seg.slice(1)) as Str)
    .join('') as Str;
}

/**
 * Compute the GitHub diff anchor hash for a component's primary Svelte file.
 *
 * GitHub uses `#diff-{SHA256(filePath)}` to scroll to a specific file
 * in the commit diff view. This finds the primary `.svelte` file in
 * the component directory and returns its SHA256 hash.
 *
 * @param componentName - Kebab-case component directory name
 * @param componentPath - Repo-relative path to the component directory
 * @returns SHA256 hex string or empty string if no Svelte file found
 */
function computeDiffAnchor(componentName: Str, componentPath: Str): Str {
  const uiSrcDir: Str = resolveUiSrcDir();
  const componentDir: Str = join(uiSrcDir, componentName) as Str;

  try {
    const files: Str[] = readdirSync(componentDir) as Str[];
    const svelteFiles: Str[] = files.filter((f: Str): boolean => f.endsWith('.svelte'));
    if (svelteFiles.length === 0) return '' as Str;

    /* Prefer the file matching the PascalCase directory name */
    const primaryName: Str = `${toPascalCase(componentName)}.svelte` as Str;
    const primary: Str =
      svelteFiles.find((f: Str): boolean => f === primaryName) ?? (svelteFiles[0] as Str);
    const relativePath: Str = `${componentPath}/${primary}` as Str;

    return createHash('sha256').update(relativePath).digest('hex') as Str;
  } catch {
    /* Directory read failed */
    return '' as Str;
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

  const { entries, total }: { entries: ChangelogEntry[]; total: Num } = getChangelog(name);
  const repoUrl: Str = detectRepoUrl();
  const componentPath: Str = `packages/shared/ui/src/${name}` as Str;
  const diffAnchor: Str = computeDiffAnchor(name, componentPath);

  return new Response(JSON.stringify({ entries, total, repoUrl, componentPath, diffAnchor }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};
