/**
 * Lens manifest for the Separator component (layout
 * category) — horizontal/vertical content divider. @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'layout',
  tags: ['separator', 'divider', 'line', 'horizontal'],
  description: 'Visual divider between content sections.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Separator',
    description: 'Horizontal and vertical separators dividing content.',
  },
];

export default examples;
