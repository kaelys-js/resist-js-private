/**
 * Server load for the testing layout.
 *
 * Provides shared data to all testing pages — currently the Lucide icon count
 * for the sidebar badge.
 *
 * @module
 */

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Num } from '@/schemas/common';
import type { LayoutServerLoad } from './$types';

/** Data returned to the layout. */
export type TestingLayoutData = {
  /** Number of available Lucide icons. */
  iconCount: Num;
};

/**
 * Count available Lucide icons for the sidebar badge.
 *
 * @returns Layout data with icon count
 */
export const load: LayoutServerLoad = () => {
  let iconCount: Num = 0 as Num;

  try {
    const iconsDir: string = resolve('node_modules/@lucide/svelte/dist/icons');
    const files: string[] = readdirSync(iconsDir);
    const nameSet: Set<string> = new Set();
    for (const file of files) {
      if (file.endsWith('.svelte') && !file.endsWith('.d.ts')) {
        nameSet.add(file.replace('.svelte', ''));
      }
    }
    iconCount = nameSet.size as Num;
  } catch {
    /* Lucide not installed or path changed — return 0 */
  }

  return { iconCount };
};
