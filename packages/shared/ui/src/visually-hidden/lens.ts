/**
 * Lens manifest for the VisuallyHidden component (a11y
 * category) — screen-reader-only content wrapper. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'a11y',
  tags: ['accessibility', 'hidden', 'sr-only', 'a11y', 'screen-reader', 'skip-link', 'tv-variant'],
  description:
    'Hides content visually while keeping it accessible to screen readers, with polymorphic element support and a focusable variant for skip links.',
};
