/**
 * Server load for the Icons gallery page.
 *
 * Scans the Lucide Svelte icon directory to build a list of all available
 * icon names, returned as kebab-case strings.
 *
 * @module
 */

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Str } from '@/schemas/common';
import type { PageServerLoad } from './$types';

/** Data returned to the Icons page. */
export type IconsData = {
  /** Sorted list of kebab-case icon names. */
  names: Str[];
};

/**
 * Discover all available Lucide icon names from the package.
 *
 * @returns Icon name list
 */
export const load: PageServerLoad = () => {
  let names: Str[] = [];

  try {
    /* Resolve the Lucide icons directory */
    const iconsDir: Str = resolve('node_modules/@lucide/svelte/dist/icons') as Str;
    const files: Str[] = readdirSync(iconsDir) as Str[];

    /* Extract unique icon names from .svelte files */
    const nameSet: Set<Str> = new Set();
    for (const file of files) {
      if (file.endsWith('.svelte') && !file.endsWith('.d.ts')) {
        nameSet.add(file.replace('.svelte', '') as Str);
      }
    }

    names = [...nameSet].toSorted() as Str[];
  } catch {
    /* Lucide not installed or path changed — return empty */
  }

  return { names };
};
