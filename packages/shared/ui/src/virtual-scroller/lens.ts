/**
 * Lens manifest for the VirtualScroller component (layout
 * category) — virtualised large-list scroller. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'layout',
  tags: ['virtual', 'scroll', 'performance', 'large-list'],
  description:
    'A component that renders only visible items from a large list, providing smooth scrolling performance.',
};
