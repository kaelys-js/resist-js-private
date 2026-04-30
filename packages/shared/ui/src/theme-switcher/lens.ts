/**
 * Lens manifest for the ThemeSwitcher component (utility
 * category) — colour theme selection dropdown. @module
 */

import type { LensMeta } from '../lens/types.js';
import LensWrapper from './LensWrapper.svelte';

export const meta: LensMeta = {
  category: 'utility',
  tags: ['theme', 'palette', 'color', 'customization'],
  description: 'Color theme selection with search and preview.',
};

/** DropdownMenu.Root context wrapper — ThemeSwitcher renders DropdownMenu.Sub which needs a Root parent. */
export const contextWrapper = LensWrapper;
