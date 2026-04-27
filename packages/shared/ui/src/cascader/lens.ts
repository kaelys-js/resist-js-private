/**
 * Lens manifest for the Cascader component (form category) —
 * multi-level dropdown for hierarchical data where each selection
 * reveals the next level. Tagged for cascader / hierarchy /
 * select / drill-down lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'form',
  tags: ['cascader', 'hierarchy', 'select', 'drill-down'],
  description:
    'A multi-level dropdown selector for hierarchical data, where each selection reveals the next level.',
};
