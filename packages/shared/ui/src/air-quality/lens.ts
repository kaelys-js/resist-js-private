/**
 * Lens manifest for the AirQuality component (iot category) —
 * displays an air-quality index reading. Tagged for air / quality
 * / index / iot lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'iot',
  tags: ['air', 'quality', 'index', 'iot'],
  description: 'Air quality index display.',
};
