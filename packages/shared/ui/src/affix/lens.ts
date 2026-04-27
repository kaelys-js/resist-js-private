/**
 * Lens manifest for the Affix component (utility category) — wraps
 * a child element and pins it to the viewport once the user
 * scrolls past a configured threshold. Tagged for affix / sticky
 * / fixed / position lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'utility',
  tags: ['affix', 'sticky', 'fixed', 'position'],
  description: 'A wrapper that fixes its child to the viewport when scrolling past a threshold.',
};
