/**
 * Lens manifest for the Image component (media category) —
 * enhanced image with lazy loading, fallbacks, and preview.
 * Tagged for image / lazy / fallback / responsive lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'media',
  tags: ['image', 'lazy', 'fallback', 'responsive'],
  description:
    'An enhanced image component with loading states, fallbacks, zoom, and preview capabilities.',
};
