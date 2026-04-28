/**
 * Lens manifest for the Popover compound component (overlay
 * category) — anchored floating panel. @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['popover', 'floating', 'anchor', 'panel', 'compound'],
  description: 'Floating content panel anchored to a trigger.',
};

const examples: LensExample[] = [
  { name: 'basic', title: 'Basic Popover', description: 'A popover with form content.' },
  {
    name: 'alignment',
    title: 'Alignment',
    description: 'Popovers aligned to start, center, and end.',
  },
];

export default examples;
