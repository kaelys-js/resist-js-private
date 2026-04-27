/**
 * Lens manifest for the DataView component (data-display
 * category) — switchable list / grid view with pagination and
 * sorting. Tagged for data / grid / list / view-switcher
 * lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'data-display',
  tags: ['data', 'grid', 'list', 'view-switcher'],
  description:
    'A component for displaying data in switchable list or grid layouts with optional pagination and sorting.',
};
