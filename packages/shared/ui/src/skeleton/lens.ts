/**
 * Lens manifest for the Skeleton component (feedback
 * category) — pulsing loading placeholder. @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'feedback',
  tags: ['skeleton', 'loading', 'placeholder', 'shimmer'],
  description: 'Placeholder loading skeleton.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Skeleton',
    description: 'Pulsing placeholder lines at varying widths.',
  },
  {
    name: 'card',
    title: 'Card Skeleton',
    description: 'Avatar and text skeleton mimicking a user card.',
  },
];

export default examples;
