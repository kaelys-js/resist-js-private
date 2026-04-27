/**
 * Lens manifest + examples for the AspectRatio component (layout
 * category) — maintains a consistent width-to-height ratio for
 * child content. Ships basic and side-by-side example lenses.
 * Tagged for aspect-ratio / container / responsive / image
 * lookups.
 *
 * @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'layout',
  tags: ['aspect-ratio', 'container', 'responsive', 'image'],
  description: 'Maintains a consistent width-to-height ratio for its child content.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Aspect Ratio',
    description: 'A 16:9 container with placeholder content.',
  },
  {
    name: 'ratios',
    title: 'Multiple Ratios',
    description: 'Side-by-side comparison of 1:1, 4:3, and 16:9 ratios.',
  },
];

export default examples;
