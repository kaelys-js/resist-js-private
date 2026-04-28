/**
 * Lens manifest for the Meter component (data-display
 * category) — semantic meter gauge. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'data-display',
  tags: ['meter', 'gauge', 'progress', 'measurement'],
  description:
    'A gauge component displaying a scalar value within a known range, representing a measurement rather than progress.',
};
