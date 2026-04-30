/**
 * Lens manifest for the Tooltip component (overlay category)
 * — hover/focus contextual popup. @module
 */

import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
  category: 'overlay',
  tags: ['tooltip', 'hover', 'info', 'popup', 'compound'],
  description: 'Hover tooltip for additional context.',
};

const examples: LensExample[] = [
  {
    name: 'basic',
    title: 'Basic Tooltip',
    description: 'Tooltip appearing above the trigger on hover.',
  },
  { name: 'sides', title: 'Side Variants', description: 'Tooltip positioned on all four sides.' },
];

export default examples;
