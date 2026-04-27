/**
 * Lens manifest for the DateField component (date-time
 * category) — segmented date input with per-segment editing.
 * Tagged for date / input / field / formatted lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'date-time',
  tags: ['date', 'input', 'field', 'formatted'],
  description:
    'A segmented date input where each date part (day, month, year) is independently editable.',
};
