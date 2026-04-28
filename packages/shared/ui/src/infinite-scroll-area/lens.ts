/**
 * Lens manifest for the InfiniteScrollArea component
 * (data-display category) — continuous-loop scrolling content.
 * Tagged for infinite-scroll / lazy-load / pagination / virtual
 * lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'data-display',
  tags: ['infinite-scroll', 'lazy-load', 'pagination', 'virtual'],
  description:
    'A container that continuously scrolls content in a loop, used for logo bars, testimonials, or content feeds.',
};
