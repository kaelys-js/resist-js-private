/**
 * Lens manifest for the LensComponentRenderer infrastructure
 * — renders a Lens preview card with settings. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'lens',
  tags: ['documentation', 'renderer', 'variants', 'preview'],
  description:
    'Dynamic component renderer for Lens documentation — renders default preview or variant option grid.',
};
