/**
 * Lens manifest for the BlockUi component (overlay category) —
 * overlay that blocks user interaction with a section or the
 * entire page during loading or processing. Tagged for block /
 * overlay / loading / disable lookups.
 *
 * @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['block', 'overlay', 'loading', 'disable'],
  description:
    'An overlay that blocks user interaction with a section or the entire page during loading or processing.',
};
