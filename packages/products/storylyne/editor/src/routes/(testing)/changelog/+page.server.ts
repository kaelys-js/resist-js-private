/**
 * Server load for the What's New changelog page.
 *
 * Runs `git log` across `packages/shared/ui/src/` to extract commits
 * touching components, grouped by date with affected component names.
 * Also detects the GitHub repo URL for commit links.
 *
 * @module
 */

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';
import type { Str, Num } from '@/schemas/common';
import type { PageServerLoad } from './$types';

/**
 * Resolve the absolute path to `packages/shared/ui/src/` from the monorepo root.
 * Walks up from the current file until it finds `pnpm-workspace.yaml`.
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
  /* Fallback — relative from current dir */
  return join(currentDir, '..', '..', '..', '..', '..', '..', 'shared', 'ui', 'src') as Str;
}

/** Cached repo URL to avoid repeated git calls. */
let repoUrlCache: Str | null = null;

/**
 * Detect the GitHub repo URL from `git remote get-url origin`.
 * Converts SSH format to HTTPS. Caches result.
 *
 * @returns HTTPS repo URL or empty string
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

/** A single changelog entry returned to the page. */
type ChangelogEntry = {
  /** Short commit hash. */
  hash: Str;
  /** Commit subject line. */
  message: Str;
  /** Commit body (multi-line description after subject). */
  body: Str;
  /** Author name. */
  author: Str;
  /** ISO date string. */
  date: Str;
  /** Component directory names touched by this commit. */
  components: Str[];
  /** Whether this commit added new files. */
  isNew: boolean;
};

/** A date bucket grouping changelog entries. */
type ChangelogGroup = {
  /** Display date label (YYYY-MM-DD). */
  date: Str;
  /** Entries for this date, newest first. */
  entries: ChangelogEntry[];
};

/** Data returned to the page component. */
export type ChangelogData = {
  /** Grouped changelog entries. */
  groups: ChangelogGroup[];
  /** Total number of entries across all groups. */
  total: Num;
  /** GitHub repo URL for commit links. */
  repoUrl: Str;
};

/** Commit separator — unlikely to appear in commit messages. */
const COMMIT_SEP: Str = '---COMMIT---' as Str;

/** Field separator within the header line. */
const FIELD_SEP: Str = '|||' as Str;

/**
 * Parse git log output into structured changelog data.
 *
 * Uses two git log calls: one for header+files, one for bodies.
 *
 * @returns Grouped changelog entries with repo URL
 */
export const load: PageServerLoad = () => {
  const repoUrl: Str = detectRepoUrl();
  const uiSrcDir: Str = resolveUiSrcDir();

  /* First pass: get headers + file names */
  let raw: Str;
  try {
    raw = execSync(
      `git log --pretty=format:"${COMMIT_SEP}%h${FIELD_SEP}%s${FIELD_SEP}%an${FIELD_SEP}%aI" --name-only -200 -- "${uiSrcDir}"`,
      {
        encoding: 'utf8',
        timeout: 10_000,
        maxBuffer: 1024 * 1024 * 5,
      },
    ) as Str;
  } catch {
    /* git not available or no commits — return empty */
    return { groups: [], total: 0 as Num, repoUrl };
  }

  /* Second pass: get commit bodies keyed by hash */
  const bodyMap: Map<Str, Str> = new Map();
  try {
    const bodyRaw: Str = execSync(
      `git log --pretty=format:"%h${FIELD_SEP}%b${COMMIT_SEP}" -200 -- "${uiSrcDir}"`,
      {
        encoding: 'utf8',
        timeout: 10_000,
        maxBuffer: 1024 * 1024 * 5,
      },
    ) as Str;
    const bodyBlocks: Str[] = bodyRaw.split(COMMIT_SEP).filter(Boolean) as Str[];
    for (const block of bodyBlocks) {
      const sepIdx: number = block.indexOf(FIELD_SEP);
      if (sepIdx < 0) continue;
      const bHash: Str = block.slice(0, sepIdx).trim() as Str;
      const bBody: Str = block.slice(sepIdx + FIELD_SEP.length).trim() as Str;
      if (bHash && bBody) {
        bodyMap.set(bHash, bBody);
      }
    }
  } catch {
    /* Body fetch failed — proceed without bodies */
  }

  const commits: Str[] = raw.split(COMMIT_SEP).filter(Boolean) as Str[];
  const entries: ChangelogEntry[] = [];

  for (const block of commits) {
    const lines: Str[] = block.trim().split('\n') as Str[];
    if (lines.length === 0) continue;

    const headerLine: Str = lines[0] ?? ('' as Str);
    const parts: Str[] = headerLine.split(FIELD_SEP) as Str[];
    if (parts.length < 4) continue;

    const [hash = '' as Str, message = '' as Str, author = '' as Str, dateRaw = '' as Str] =
      parts as Str[];

    /* Extract component names from changed file paths */
    const componentSet: Set<Str> = new Set();

    for (let i: Num = 1 as Num; i < lines.length; i++) {
      const filePath: Str = (lines[i] ?? '') as Str;
      const match: RegExpMatchArray | null = filePath.match(
        /^packages\/shared\/ui\/src\/([^/]+)\//,
      );
      if (match?.[1]) {
        componentSet.add(match[1] as Str);
      }
    }

    /* Check if commit message suggests new addition */
    const msgLower: Str = message.toLowerCase() as Str;
    const isNew: boolean =
      msgLower.includes('add') ||
      msgLower.includes('create') ||
      msgLower.includes('new') ||
      msgLower.includes('initial');

    /* Look up body from second pass */
    const body: Str = (bodyMap.get(hash) ?? '') as Str;

    if (componentSet.size > 0) {
      entries.push({
        hash,
        message,
        body,
        author,
        date: dateRaw,
        components: [...componentSet].toSorted() as Str[],
        isNew,
      });
    }
  }

  /* Group by date (day) */
  const groupMap: Map<Str, ChangelogEntry[]> = new Map();
  for (const entry of entries) {
    const dayKey: Str = entry.date.slice(0, 10) as Str;
    const existing: ChangelogEntry[] | undefined = groupMap.get(dayKey);
    if (existing) {
      existing.push(entry);
    } else {
      groupMap.set(dayKey, [entry]);
    }
  }

  const groups: ChangelogGroup[] = [...groupMap.entries()]
    .toSorted((a, b) => b[0].localeCompare(a[0]))
    .map(
      ([date, dayEntries]): ChangelogGroup => ({
        date,
        entries: dayEntries,
      }),
    );

  return {
    groups,
    total: entries.length as Num,
    repoUrl,
  };
};
