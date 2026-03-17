/**
 * Server load for the What's New changelog page.
 *
 * Runs `git log` across `packages/shared/ui/src/` to extract commits
 * touching components, grouped by date with affected component names.
 *
 * @module
 */

import { execSync } from 'node:child_process';
import type { Str, Num } from '@/schemas/common';
import type { PageServerLoad } from './$types';

/** A single changelog entry returned to the page. */
type ChangelogEntry = {
  /** Short commit hash. */
  hash: Str;
  /** Commit subject line. */
  message: Str;
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
};

/**
 * Parse git log output into structured changelog data.
 *
 * @returns Grouped changelog entries
 */
export const load: PageServerLoad = () => {
  const separator: Str = '---COMMIT---' as Str;
  const fieldSep: Str = '|||' as Str;

  let raw: Str;
  try {
    raw = execSync(
      `git log --pretty=format:"${separator}%h${fieldSep}%s${fieldSep}%an${fieldSep}%aI" --name-only -200 -- packages/shared/ui/src/`,
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 10_000,
        maxBuffer: 1024 * 1024 * 5,
      },
    ) as Str;
  } catch {
    /* git not available or no commits — return empty */
    return { groups: [], total: 0 as Num };
  }

  const commits: Str[] = raw.split(separator).filter(Boolean) as Str[];
  const entries: ChangelogEntry[] = [];

  for (const block of commits) {
    const lines: Str[] = block.trim().split('\n') as Str[];
    if (lines.length === 0) continue;

    const headerLine: Str = lines[0] ?? ('' as Str);
    const parts: Str[] = headerLine.split(fieldSep) as Str[];
    if (parts.length < 4) continue;

    const [hash = '' as Str, message = '' as Str, author = '' as Str, dateRaw = '' as Str] =
      parts as Str[];

    /* Extract component names from changed file paths */
    const componentSet: Set<Str> = new Set();
    let isNew: boolean = false;

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
    if (
      msgLower.includes('add') ||
      msgLower.includes('create') ||
      msgLower.includes('new') ||
      msgLower.includes('initial')
    ) {
      isNew = true;
    }

    if (componentSet.size > 0) {
      entries.push({
        hash,
        message,
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
  };
};
