/**
 * Lens manifest for the LensStats infrastructure component —
 * stats strip for documented components. @module
 */

import type { LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'lens',
  tags: ['documentation', 'performance', 'statistics', 'metrics'],
  description:
    'Wrapper component that measures mount timing, DOM stats, accessibility audit, and console capture for Lens cards.',
};
